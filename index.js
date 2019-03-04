function keyPathAssign(target, source) {
  for (const key in source) {
    keyPathSet(target, key, source[key]);
  }
  return target;
}

function keyPathSet(target, keyPath, value) {
  let obj = target;
  const path = keyPath.split('.');
  const key = path.pop();
  path.forEach((k) => {
    if (typeof obj[k] !== 'object' || obj[k] === null) {
      obj[k] = {};
    }
    obj = obj[k];
  });
  obj[key] = value;
  return target;
}

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
  keyPathAssign: keyPathAssign,
};
