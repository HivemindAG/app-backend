const config = {
  dataService: require('./data-service').config,
  auth: require('./auth').config,
};

function load(conf) {
  Object.keys(conf).forEach((key) => Object.assign(config[key], conf[key]));
}

module.exports = {
  config,
  load,
};
