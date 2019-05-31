const platform = require('hivemind-app-cache');

const config = require('./config');

/**
 * Utils
 */

function intCast(obj, keys) {
  keys.forEach((k) => obj[k] = parseInt(obj[k], 10));
}

function asyncMap(arr, func, cbk, index) {
  const i = index || 0;
  if (i === 0) arr = arr.slice(0);
  if (i >= arr.length) return cbk(null, arr);
  func(arr[i], (err, ans) => {
    if (err) return cbk(err);
    arr[i] = ans;
    asyncMap(arr, func, cbk, i + 1);
  });
}

/**
 * Entity helpers
 */

function getEntityKeys(list, def) {
  if (list === '') return [];
  if (!list) return def ? def : ['name'];
  return list.split(',');
}

function finalizeEntity(raw, keys) {
  const obj = { id: raw.id };
  if (keys.includes('name')) obj.name = raw.name;
  if (keys.includes('description')) obj.description = raw.description;
  if (keys.includes('properties')) obj.properties = raw.properties || {};
  return obj;
}

function finalizeDevice(session, raw, keys, cbk) {
  const obj = finalizeEntity(raw, keys);
  if (keys.includes('typeProperties')) {
    platform.entities.getSingle(session, '/device-types', raw.deviceType.id, (err, ans) => {
      if (err) return cbk(err);
      obj.typeProperties = ans.properties || {};
      cbk(null, obj);
    });
  } else {
    cbk(null, obj);
  }
}

function getDevices(session, q, keys, cbk) {
  const more = q ? '?' + q : '';
  platform.entities.getList(session, `/devices${more}`, (err, ans) => {
    if (err) return cbk(err);
    asyncMap(ans, (el, cbk) => {
      finalizeDevice(session, el, keys, cbk);
    }, cbk);
  });
}

/**
 * Sample helpers
 */

function query(session, devId, q, cbk) {
  if (typeof q.topic !== 'string') return cbk(`Missing query argument: topic`);
  platform.entities.getSingle(session, '/devices', devId, (err, ans) => {
    if (err) return cbk(err);
    const props = ans.properties || {};
    const limit = props.cacheLimit || config.sampleCacheLimit;
    if (limit > config.sampleCacheLimitMax) {
      // Use non-500 status code to allow sending message to client
      const msg = `cacheLimit too high (is ${limit}, but must be bellow ${config.sampleCacheLimitMax})`;
      return cbk({ status: 520, message: msg });
    }
    platform.sampleService.checkForNewSamples(session, devId, q.topic, (err, newerSampleExists) => {
      if (err)
        return cbk(err);
      if (newerSampleExists)
        platform.sampleService.removeSampleCache(session.envId, devId, null);
      const cursor = new platform.SampleCursor(session, devId, q.topic);
      cursor.limit = limit;
      let i = -1;
      const end = q.offset + q.limit;
      const samples = [];
      const minDate = q.minDate ? new Date(q.minDate) : null;
      const maxDate = q.maxDate ? new Date(q.maxDate) : null;
      cursor.forEach((sample) => { // check if more samples are needed and add the current one to array if they are
        if (maxDate && sample.timestamp > maxDate) return true;
        if (minDate && sample.timestamp < minDate) return false;
        i += 1;
        if (i < q.offset) return true; // skipping current sample
        if (i == end) return false; // no more samples needed
        samples.push(sample);
        return true;
      }, (err) => {
        if (err) return cbk(err);
        cbk(null, samples);
      });
    });
  });
}

module.exports = {
  intCast,
  asyncMap,
  getEntityKeys,
  finalizeEntity,
  finalizeDevice,
  getDevices,
  query,
};
