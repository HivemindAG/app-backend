const apiRequest = require('./api-request');
const Cache = require('./async-cache').Cache;

const config = {
  sampleCacheRange: null,
  sampleCacheLimit: 4000,
  sampleCacheTimeout: 20 * 1000,
  staticCacheTimeout: 4 * 60 * 1000,
  newSampleCallback: null,
};

const getPathCache = new Cache();
function getPathRaw(session, path, cbk, keySalt) {
  const url = `${session.apiURL}${path}`;
  const key = keySalt ? `${keySalt}:${url}` : url;
  getPathCache.get(key, cbk, (args, cbk) => {
    const req = {
      url: url,
      qs: {limit: 1000},
    };
    apiRequest.call(session, req, (err, res, ans) => {
      console.debug(`CACHE: update ${url}`);
      if (!err && ans.hasOwnProperty('total') && Array.isArray(ans.data)) {
        ans = ans.data;
      }
      cbk(err, {value: ans, timeout: config.staticCacheTimeout});
    });
  });
}

function getEnvId(session, cbk) {
  getPathRaw(session, "/v1/environments", (err, envs) => {
    if (err) return cbk(err);
    if (!(envs.length > 0)) return cbk("Environment not found");
    cbk(null, envs[0].id);
  }, session.apiKey)
}

function getPath(session, path, cbk) {
  getPathRaw(session, `/v1/environments/${session.envId}${path}`, cbk);
}

function getDeviceProperties(session, devId, cbk) {
  getPathRaw(session, `/v1/environments/${session.envId}/devices/${devId}`, (err, ans) => {
    if (err) return cbk(err);
    cbk(null, getProperties(ans));
  });
}

function getProperties(entity) {
  const props = entity.properties || {};
  // Legacy description hack
  try {
    // Will return null without error for parse(null)
    const descProps = JSON.parse(entity.description);
    Object.assign(props, descProps);
  } catch (e) {
    // Description isn't valid JSON
  }
  return props;
}

const sampleCache = new Cache();
function getSamples(session, devId, cbk) {
  const key = `${session.apiURL}:${session.envId}:${devId}`;
  sampleCache.get(key, cbk, fetchNewSamples, {session: session, devId: devId});
}
function expireSamples(session, devId) {
  const key = `${session.apiURL}:${session.envId}:${devId}`;
  sampleCache.expire(key);
}

function deviceUplink(session, devId, data, cbk) {
  getDeviceProperties(session, devId, (err, props) => {
    if (err) return cbk(err);
    if (!props.uplink) return cbk('Uplink not enabled for this device');
    const req = {
      path: `/v1/environments/${session.envId}/devices/${devId}/up`,
      method: 'POST',
      json: data,
    };
    apiRequest.call(session, req, (err, res, ans) => {
      if (err) return cbk(err);
      expireSamples(session, devId);
      return cbk(null, {msg: 'ok'});
    });
  });
}
function deviceDownlink(session, devId, data, cbk) {
  getDeviceProperties(session, devId, (err, props) => {
    if (err) return cbk(err);
    if (!props.downlink) return cbk('Downlink not enabled for this device');
    const req = {
      path: `/v1/environments/${session.envId}/devices/${devId}/down`,
      method: 'POST',
      json: data,
    };
    apiRequest.call(session, req, (err, res, ans) => {
      if (err) return cbk(err);
      expireSamples(session, devId);
      return cbk(null, {msg: 'ok'});
    });
  });
}

function fetchNewSamples(args, cbk) {
  const parts = args.devId.split(':');
  args.devId = parts[0];
  args.topic = parts[1];
  getDeviceProperties(args.session, args.devId, (err, props) => {
    if (err) return cbk(err);
    args.limit = props.cacheLimit || config.sampleCacheLimit;
    _fetchNewSamples(args, cbk);
  });
}

function _fetchNewSamples(args, cbk) {
  const isFirst = !args.value;
  const old = isFirst ? [] : args.value;
  const now = Date.now();
  const query = {
    limit: args.limit,
    keys: ['id', 'topic', 'timestamp', 'data'],
  };
  if (args.topic) {
    query.topic = args.topic;
  }
  const req = {
    method: 'POST',
    url: `${args.session.apiURL}/v1/environments/${args.session.envId}/devices/${args.devId}/data/query`,
    json: query,
  };
  if (old.length > 0) {
    query.after = old[0].id;
  } else if (config.sampleCacheRange !== null) {
    const minDate = new Date(now - config.sampleCacheRange).toISOString();
    query.timestamp = {gt: minDate};
  }
  apiRequest.call(args.session, req, (err, res, ans) => {
    // err after data reset:
    // {"message":"sample with id: 5b337c8d9aa1354f93f53ef9 could not be found","status":404}
    if (err) return cbk(err);
    const samples = ans.data;
    if (!samples) return cbk({message: 'unexpected response', info: ans})
    samples.forEach((d) => d.timestamp = new Date(d.timestamp));
    // samples.splice(0, samples.length - 1); // DEBUG: Simulate constant updates
    console.debug(`CACHE: loaded ${samples.length} new entries for device ${args.key}`);
    if (!isFirst && config.newSampleCallback) {
      for (var i = samples.length - 1; i >= 0; i--) {
        const event = {apiURL: args.session.apiURL, envId: args.session.envId, devId: args.devId};
        Object.assign(event, samples[i]);
        config.newSampleCallback(event);
      }
    }
    const nOld = Math.min(old.length, config.sampleCacheLimit - samples.length);
    for (let i = 0; i < nOld; i++) {
      const d = old[i];
      if (config.sampleCacheRange !== null && d.timestamp < now - config.sampleCacheRange) break;
      samples.push(d);
    }
    cbk(err, {value: samples, timeout: config.sampleCacheTimeout});
  });
}

module.exports = {
  config,
  getEnvId,
  getPath,
  getSamples,
  expireSamples,
  deviceUplink,
  deviceDownlink,
  caches: {
    static: getPathCache,
    samples: sampleCache,
  },
  getProperties,
};
