var request = require('request');

const config = {
  concurrent: 8,
};

function mkOptions(session, args) {
  const options = {
    method: 'GET',
  };
  if (typeof args === 'string') {
    args = {path: args};
  }
  Object.assign(options, args);
  options.headers = Object.assign({}, args.headers);
  if (session.apiKey) {
    options.headers['API-Key'] = session.apiKey;
  }
  if (typeof options.path === 'string') {
    options.url = session.apiURL + options.path;
    delete options.path;
  }
  return options;
}

function call(session, args, cbk) {
  const options = mkOptions(session, args);
  callQueue.push({options, cbk});
  dispatch();
}

var callQueue = [];
var nInFlight = 0;

function dispatch() {
  if (config.concurrent && nInFlight >= config.concurrent) return;
  const args = callQueue.shift();
  if (!args) return;
  nInFlight += 1;
  request(args.options, (err, res, body) => {
    nInFlight -= 1;
    dispatch();
    const cbk = args.cbk;
    if (err) return cbk(err, res);
    const ans = optParse(body, {});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      err = ans;
      err.status = res.statusCode;
    }
    if (err) return cbk(err, res);
    cbk(null, res, ans);
  });
}

function optParse(body, def) {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch (e) {
    return def;
  }
}

module.exports = {
  call: call,
  config: config,
};
