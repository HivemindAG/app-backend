const express = require('express');
const http = require('http');

const modules = require('./index');
const config = modules.config;

/**
 * Load configuration
 */

const args = require('minimist')(process.argv.slice(2));

config.debug = process.env.DEBUG && process.env.DEBUG.toLowerCase() === 'true';
config.platform = modules.platform.config;

modules.keyPathAssign(config, JSON.parse(process.env.CONFIG || null));
modules.keyPathAssign(config, JSON.parse(args.config || null));

config.apiKey = args.key || config.apiKey;
config.port = args.port || process.env.PORT || config.port;

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

app.use(modules.middleware.notFound);
app.use(modules.middleware.error);

modules.websocket(server);

let port = config.port;
if (typeof port === 'string') port = parseInt(port, 10);
const ready = () => console.log(`Hivemind app backend listening on port ${port}!`);
server.listen(port, ready);
