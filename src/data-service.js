const apiRequest = require('./api-request');
const Cache = require('./async-cache').Cache;

const config = {
  sampleCacheRange: 15 * 24 * 60 * 60 * 1000,
  sampleCacheLimit: 4000,
  sampleCacheTimeout: 20 * 1000,
  staticCacheTimeout: 4 * 60 * 1000,
  newSampleCallback: null,
};

const getPathCache = new Cache();
function getPathRaw(session, path, cbk) {
  const key = `${session.apiURL}${path}`;
  getPathCache.get(key, cbk, (args, cbk) => {
    const req = {
      url: key,
      qs: {limit: 1000},
    };
    apiRequest.call(session, req, (err, res, ans) => {
      console.log(`CACHE: update ${args.key}`);
      if (ans.hasOwnProperty('total') && Array.isArray(ans.data)) {
        ans = ans.data;
      }
      cbk(err, {value: ans, timeout: config.staticCacheTimeout});
    });
  });
}

function getEnvId(session, cbk) {
  getPathRaw(session, '/v1/environments', (err, envs) => {
    if (err) return cbk(err);
    if (!(envs.length > 0)) return cbk("Environment not found");
    cbk(null, envs[0].id);
  })
}

function getPath(session, path, cbk) {
  getPathRaw(session, `/v1/environments/${session.envId}${path}`, cbk);
}

const sampleCache = new Cache();
function getSamples(session, devId, cbk) {
  const key = `${session.apiURL}/v1/environments/${session.envId}/devices/${devId}`;
  sampleCache.get(key, cbk, fetchNewSamples, {session: session, devId: devId});
}
function expireSamples(session, devId) {
  const key = `${session.apiURL}/v1/environments/${session.envId}/devices/${devId}`;
  sampleCache.expire(key);
}

function fetchNewSamples(args, cbk) {
  const isFirst = !args.value;
  const old = isFirst ? [] : args.value;
  const now = Date.now();
  let minDate = now - config.sampleCacheRange;
  if (old.length > 0) {
    minDate = Math.max(minDate, old[0].timestamp.getTime());
  }
  const maxDate = now + 100000; // 1m 4s in the future
  const req = {
    url: `${args.key}/data`,
    qs: {
      endDate: new Date(minDate).toISOString(),
      startDate: new Date(maxDate).toISOString(),
      noOfRecords: config.sampleCacheLimit,
    },
  }
  apiRequest.call(args.session, req, (err, res, ans) => {
    if (err) return cbk(err);
    // ans.splice(0, ans.length - 1); // DEBUG: Simulate constant updates
    const samples = ans.map((d) => {
      const date = new Date(d.timestamp);
      return {topic: d.topic, timestamp: date, data: d.data};
    });
    console.log(`CACHE: loaded ${samples.length} new entries for device ${args.key}`);
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
      if (d.timestamp < now - config.sampleCacheRange) break;
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
};
