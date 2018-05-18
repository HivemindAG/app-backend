const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(express.json());

const conf = {
  appConfigEnv: 'APP_CONFIG',
  cors: true,
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
      console.log(req.method + ' ' + req.url);
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Auth-Token, Content-Length, X-Requested-With');
      if (req.method == 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }


  /**
   * Add session to request
   */

  const auth = require('./auth');
  app.use((req, res, next) => {
    auth.addSession(req, next);
  });
}


function run(port, cbk) {
  /**
   * Add request handlers
   */

  app.get('/', (req, res) => res.send({}));
  app.get('/ping', (req, res) => res.send({pong: 'ping'}));

  app.use('/', require('./router-entities'));
  app.use('/', require('./router-samples'));

  require('./websocket')(server);


  /**
   * Error handling
   */

  app.use(function (req, res, next) {
    res.status(404);
    next(`Invalid path: '${req.url}'`);
  });

  app.use(function (err, req, res, next) {
    if (typeof err === 'string') {
      err = {message: err};
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
      // TODO: set according to error.status
      // err.error = 'Internal Server Error';
    }
    console.log(err);
    res.send(err);
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
};
