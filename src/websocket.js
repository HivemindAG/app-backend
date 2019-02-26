const WebSocket = require('ws');
const platform = require('hivemind-app-cache');

const auth = require('./auth');

// maybe use https://github.com/olalonde/express-websocket
// maybe use https://github.com/HenningM/express-ws

let wss = null;

module.exports = function(server) {
  wss = new WebSocket.Server({
    server,
    verifyClient: (info, cbk) => {
      const req = info.req;
      auth.addSession(req, (err) => {
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
    ws.subs = addSubs(ws.subs, subs);
  }
  if (rpc.cmd == 'sub') {
    const sub = arg2Sub(rpc.arg, req.session);
    if (!ws.subs) ws.subs = [];
    ws.subs = addSub(ws.subs, sub);
  }
  if (rpc.cmd == 'unsub') {
    const sub = arg2Sub(rpc.arg, req.session);
    if (!ws.subs) ws.subs = [];
    ws.subs = removeSub(ws.subs, sub);
  }
  console.debug(`rec: ${JSON.stringify(rpc)}`);
  // console.debug(ws.subs);
  if (rpc.hasOwnProperty('id')) {
    ws.send(JSON.stringify({id: rpc.id}));
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
    ws.subs.forEach((sub) => {
      if (!subMatch(sub, event)) return;
      ws.send(JSON.stringify(msg));
    });
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

function addSubs(arr, subs) {
  subs.forEach((sub) => addSub(arr, sub));
  return arr;
}

function addSub(arr, sub) {
  for (var i = 0; i < arr.length; i++) {
    if (subMatch(arr[i], sub)) return;
  }
  arr.push(sub);
  return arr;
}

function removeSub(arr, sub) {
  arr = arr.filter((s) => !subMatch(s, sub));
  return arr;
}
