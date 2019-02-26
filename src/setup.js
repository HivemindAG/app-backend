const config = {
  debug: process.env.DEBUG ? true : false,
  cache: require('hivemind-app-cache').config,
  auth: require('./auth').config,
};

config.cache.debug = config.debug;

function load(conf) {
  Object.keys(conf).forEach((key) => Object.assign(config[key], conf[key]));
}

console.debug = function(...theArgs) {
  if (!config.debug) return;
  console.log(...theArgs);
}

module.exports = {
  config,
  load,
};
