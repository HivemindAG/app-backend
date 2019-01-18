const config = {
  debug: process.env.DEBUG ? true : false,
  dataService: require('./data-service').config,
  auth: require('./auth').config,
  request: require('./api-request').config,
};

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
