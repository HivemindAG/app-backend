const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(express.json());

const conf = {
  appConfigEnv: 'APP_CONFIG',
  cors: true,
  addSession: true,
};


function init(config) {
  Object.assign(conf, config);


  /**
   * Handle app configuration
   */

  if (conf.appConfigEnv && process.env[conf.appConfigEnv]) {
    require('./setup').load(JSON.parse(process.env[conf.appConfigEnv]));
  }

  if (conf.appConfig) {
    require('./setup').load(conf.appConfig);
  }


  /**
   * Handle CORS (and logging)
   */

  if (conf.cors) {
    app.use((req, res, next) => {
      console.debug(req.method + ' ' + req.url);
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
    });
  }


  /**
   * Add session to request
   */

  if (conf.addSession) {
    const auth = require('./auth');
    app.use((req, res, next) => {
      auth.addSession(req, next);
    });
  }
}


function run(port, cbk) {
  /**
   * Add request handlers
   */

  app.get('/', (req, res) => res.send({}));
  app.get('/ping', (req, res) => res.send({pong: 'ping'}));

  app.use('/', require('./router-entities'));
  app.use('/', require('./router-samples'));
  app.use('/', require('./router-actions'));

  require('./websocket')(server);

  const handlerHook = module.exports.handlerHook;
  if (handlerHook) {
    handlerHook(app);
  }

  /**
   * Error handling
   */

  const statusCodes = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };

  app.use(function (req, res, next) {
    res.status(404);
    next(`Invalid path: '${req.url}'`);
  });

  app.use(function (err, req, res, next) {
    if (typeof err === 'string') {
      err = {message: err};
    } else if (err instanceof Error) {
      console.debug(err);
      err = {status: err.status, error: err.error, message: err.message};
    }
    if (res.statusCode == 200) {
      res.status(500);
    }
    if (err.status) {
      res.status(err.status);
    } else {
      err.status = res.statusCode;
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
    res.send({status: err.status, error: err.error, message: err.message});
  });


  /**
   * Start server
   */

  if (port) {
    port = process.env.PORT || port;
    if (typeof port === 'string') port = parseInt(port, 10);
    if (!cbk) {
      cbk = () => console.log(`Hivemind app backend listening on port ${port}!`);
    }
    server.listen(port, cbk);
  }
}


module.exports = {
  app: app,
  server: server,
  init: init,
  run: run,
  handlerHook: null,
};
