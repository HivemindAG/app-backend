const WebSocket = require('ws');
const platform = require('hivemind-app-cache');

const middleware = require('./middleware');

// maybe use https://github.com/olalonde/express-websocket
// maybe use https://github.com/HenningM/express-ws

let wss = null;

module.exports = function (server) {
  wss = new WebSocket.Server({
    server,
    verifyClient: (info, cbk) => {
      const req = info.req;
      middleware.addSessionHandler(req, (err) => {
        if (err) return cbk(false, 403, 'Forbidden');
        // addSession might modify req.url
        const path = req.url.split('\?')[0];
        if (path != '/ws') return cbk(false, 404, 'Not Found');
        cbk(true);
      });
    }
  });
  wss.on('connection', function connection(ws, req) {
    // client is verified
    ws.on('message', (msg) => {
      let rpc;
      try {
        rpc = JSON.parse(msg);
        onMessage(ws, req, rpc);
      } catch (ex) {
        const ans = {};
        ans.err = ex.message;
        if (rpc) ans.id = rpc.id;
        ws.send(JSON.stringify(ans));
      }
    });
    // Handle ping pong
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });
  platform.events.on('sampleInsert', sampleInsert);
  platform.events.on('sampleInvalidate', sampleInvalidate);
  // Send regular pings to provide keep-alive to proxies and remove dead connections
  setInterval(ping, 30000);
};

function ping() {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}

function onMessage(ws, req, rpc) {
  if (rpc.cmd == 'subs') {
    const subs = rpc.arg.map((arg) => arg2Sub(arg, req.session));
    ws.subs = []; // Reset
    addSubs(req.session, ws.subs, subs);
  }
  if (rpc.cmd == 'sub') {
    const sub = arg2Sub(rpc.arg, req.session);
    if (!ws.subs) ws.subs = [];
    addSub(req.session, ws.subs, sub);
  }
  if (rpc.cmd == 'unsub') {
    const sub = arg2Sub(rpc.arg, req.session);
    if (!ws.subs) ws.subs = [];
    ws.subs = removeSub(ws.subs, sub);
  }
  // if (config.debug) console.debug(`rec: ${JSON.stringify(rpc)}`);
  // console.debug(ws.subs);
  if (rpc.hasOwnProperty('id')) {
    ws.send(JSON.stringify({ id: rpc.id }));
  }
}

function sampleInsert(event) {
  if (!wss.clients) return;
  const msg = {
    cmd: 'notify',
    arg: {
      type: 'sample',
      deviceId: event.devId,
      topic: event.topic,
      timestamp: event.sample.timestamp,
      data: event.sample.data,
    }
  };
  wss.clients.forEach((ws) => {
    if (!ws.subs) return;
    ws.subs.forEach((sub) => {
      if (!subMatch(sub, event)) return;
      ws.send(JSON.stringify(msg));
    });
  });
}

function sampleInvalidate(event) {
  if (!wss.clients) return;
  const msg = {
    cmd: 'notify',
    arg: {
      type: 'invalidate',
      deviceId: event.devId,
      topic: event.topic,
    }
  };
  wss.clients.forEach((ws) => {
    if (!ws.subs) return;
    let hasMatches = false;
    ws.subs.forEach((sub) => {
      if (!subMatch(sub, event)) return;
      hasMatches = true;
      ws.subs = removeSub(ws.subs, sub);
    });
    if (hasMatches) {
      ws.send(JSON.stringify(msg));
    }
  });
}

function arg2Sub(arg, session) {
  return {
    envId: session.envId,
    devId: arg.deviceId,
    topic: arg.topic,
  };
}

function subMatch(sub, event) {
  if (sub.envId !== event.envId) return false;
  if (sub.devId !== event.devId && event.devId !== null) return false;
  if (sub.topic !== event.topic && event.topic !== null) return false;
  return true;
}

function addSubs(session, arr, subs) {
  subs.forEach((sub) => addSub(session, arr, sub));
}

function addSub(session, arr, sub) {
  if (Object.values(sub).some(v => v == null)) return;
  for (var i = 0; i < arr.length; i++) {
    if (subMatch(arr[i], sub)) return;
  }
  if (!platform.hasSampleCache(sub.envId, sub.devId, sub.topic)) {
    // Request one sample to enable cache events
    const cursor = new platform.SampleCursor(session, sub.devId, sub.topic);
    cursor.forEach((sample) => false, (err) => {
      if (err) console.error(err);
    });
  }
  arr.push(sub);
  return;
}

function removeSub(arr, sub) {
  arr = arr.filter((s) => !subMatch(s, sub));
  return arr;
}
