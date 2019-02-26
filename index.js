module.exports = {
  config: require('./src/config'),
  platform: require('hivemind-app-cache'),
  middleware: require('./src/middleware'),
  routers: {
    entities: require('./src/router-entities'),
    actions: require('./src/router-actions'),
    samples: require('./src/router-samples'),
  },
  websocket: require('./src/websocket'),
  dataProcessing: require('./src/data-processing'),
};
