const dataService = require('./data-service');

const config = {
  session: {apiKey: '11111111-1111-1111-1111-111111111111'},
};

const baseSession = {
  apiURL: 'https://api.hivemind.ch',
};

function addSession(req, cbk) {
  const session = Object.assign({}, baseSession, config.session);
  dataService.getEnvId(session, (err, envId) => {
    session.envId = envId;
    req.session = session;
    cbk(err);
  });
}

module.exports = {
  config,
  addSession,
};
