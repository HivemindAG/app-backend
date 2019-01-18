const WebSocket = require('ws');

const dataService = require('./data-service');
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
  });
  dataService.config.newSampleCallback = newSample;
  poll();
};

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
  console.log(`rec: ${JSON.stringify(rpc)}`);
  // console.log(ws.subs);
  if (rpc.hasOwnProperty('id')) {
    ws.send(JSON.stringify({id: rpc.id}));
  }
}

function poll() {
  let subs = {};
  if (wss.clients) {
    wss.clients.forEach((ws) => {
      if (!ws.subs) return;
      ws.subs.forEach((sub) => subs[deviceUID(sub)] = sub);
    });
    delete subs[null];
  }
  subs = Object.keys(subs).map((k) => subs[k]);
  pollDevices(subs, () => setTimeout(() => poll(), 5 * 1000));
}

function pollDevices(subs, cbk) {
  if (subs.length == 0) return cbk();
  const sub = subs.pop();
  dataService.expireSamples(sub, sub.devId);
  dataService.getSamples(sub, sub.devId, null, () => pollDevices(subs, cbk));
}

// TODO: test if order is correct when multiple samples get added

function newSample(event) {
  if (!wss.clients) return;
  const msg = {
    cmd: 'notify',
    arg: {
      type: 'sample',
      deviceId: event.devId,
      topic: event.topic,
      timestamp: event.timestamp,
      data: event.data,
    }
  };
  wss.clients.forEach((ws) => {
    if (!ws.subs) return;
    ws.subs.forEach((sub) => {
      if (sub.type != 'sample') return;
      if (!subMatch(sub, event)) return;
      ws.send(JSON.stringify(msg));
    });
  });
}

function arg2Sub(arg, session) {
  return Object.assign({
    type: arg.type,
    devId: arg.deviceId,
    topic: arg.topic,
  }, session);
}

function deviceUID(sub) {
  if (sub.type != 'sample') return null;
  return `${sub.apiURL}/${sub.envId}/${sub.devId}`;
}

function subMatch(sub, event) {
  // console.log(JSON.stringify(sub), JSON.stringify(event));
  // TODO: type?
  if (sub.apiURL != event.apiURL) return false;
  if (sub.envId != event.envId) return false;
  if (sub.devId != event.devId) return false;
  if (sub.topic != event.topic) return false;
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
