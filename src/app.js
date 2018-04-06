const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());

const setup = require('./setup');
if (process.env.APP_CONFIG) {
  const conf = JSON.parse(process.env.APP_CONFIG);
  setup.load(conf);
}

/**
 * Handle CORS
 */

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


/**
 * Add session to request
 */

const auth = require('./auth');
app.use((req, res, next) => {
  auth.addSession(req, next);
});


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
 * Start app
 */

const port = process.env.PORT || 8080
server.listen(port, () => console.log('App listening on port ' + port + '!'));
