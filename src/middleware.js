const platform = require('hivemind-app-cache');

const config = require('./config');

function cors(req, res, next) {
  if (config.debug) console.info(req.method + ' ' + req.url);
  res.header('Access-Control-Allow-Origin', '*');
  if (req.method == 'OPTIONS') {
    // Preflight
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    const allowHeaders = req.header("Access-Control-Request-Headers") || 'Origin, X-Reqested-With, Accept';
    res.header('Access-Control-Allow-Headers', allowHeaders);
    res.header('Access-Control-Max-Age', '3600');
    res.sendStatus(200);
  } else {
    next();
  }
}

function auth(req, res, next) {
  module.exports.addSessionHandler(req, next);
}

function addSession(req, cbk) {
  const session = {apiURL: config.apiURL, apiKey: config.apiKey};
  platform.entities.getEnvId(session, (err, envId) => {
    session.envId = envId;
    req.session = session;
    cbk(err);
  });
}

function notFound(req, res, next) {
  next({status: 404, message: `Invalid path: '${req.url}'`});
}

const statusCodes = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
};

function error(err, req, res, next) {
  if (typeof err === 'string') {
    err = {message: err};
  } else if (err instanceof Error) {
    if (config.debug) console.debug(err);
    err = {status: err.status, error: err.error, message: err.message};
  }
  if (res.statusCode == 200) {
    res.status(500);
  }
  if (!err.status) {
    err.status = 500;
  }
  if (!err.error) {
    err.error = statusCodes[err.status];
  }
  if (err.status === 500) {
    err.method = req.method;
    err.url = req.url;
    console.error("ERROR: " + JSON.stringify(err));
    delete err.message;
  }
  res.status(err.status);
  res.send({status: err.status, error: err.error, message: err.message});
};

module.exports = {
  cors,
  auth,
  notFound,
  error,
};

// Add default addSessionHandler. Can be overwritten later.
module.exports.addSessionHandler = addSession;
