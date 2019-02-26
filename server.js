const express = require('express');
const http = require('http');

const modules = require('./index');
const config = modules.config;

/**
 * Load configuration
 */

const args = require('minimist')(process.argv.slice(2));

config.debug = process.env.DEBUG ? true : false;
config.platform = modules.platform.config;

confLoad(process.env.CONFIG);
confLoad(args.config);

config.apiKey = args.key || config.apiKey;
config.port = args.port || process.env.PORT || config.port;
config.platform.debug = config.debug;

function confLoad(confStr) {
  if (!confStr) return;
  const conf = JSON.parse(confStr);
  for (const key in conf) {
    confSet(key, conf[key]);
  }
}

function confSet(keyPath, value) {
  let obj = config;
  const path = keyPath.split('.');
  const key = path.pop();
  path.forEach((k) => obj = obj[k]);
  obj[key] = value;
}

/**
 * Create server
 */

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(modules.middleware.cors);
app.use(modules.middleware.auth);

app.get('/', (req, res) => res.send({}));
app.get('/ping', (req, res) => res.send(config.pong));

app.use('/', modules.routers.entities);
app.use('/', modules.routers.samples);
app.use('/', modules.routers.actions);

modules.websocket(server);

let port = config.port;
if (typeof port === 'string') port = parseInt(port, 10);
const ready = () => console.log(`Hivemind app backend listening on port ${port}!`);
server.listen(port, ready);
