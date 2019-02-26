const express = require('express');
const platform = require('hivemind-app-cache');
const util = require('./util');
const data = require('./data-processing');

const router = express.Router();
module.exports = router;

const config = {
  sampleCacheLimit: 4000,
  sampleCacheLimitMax: 8000,
};

function query(session, devId, q, cbk) {
  if (typeof q.topic !== 'string') return cbk(`Missing query argument: topic`);
  platform.entities.getSingle(session, '/devices', devId, (err, ans) => {
    if (err) return cbk(err);
    const props = ans.properties || {};
    const limit = props.cacheLimit || config.sampleCacheLimit;
    if (limit > config.sampleCacheLimitMax) {
      // Use non-500 status code to allow sending message to client
      const msg = `cacheLimit too high (is ${limit}, but must be bellow ${config.sampleCacheLimitMax})`;
      return cbk({status: 520, message: msg});
    }
    const cursor = new platform.SampleCursor(session, devId, q.topic);
    cursor.limit = limit;
    let i = -1;
    const end = q.offset + q.limit;
    const samples = [];
    const minDate = q.minDate ? new Date(q.minDate) : null;
    const maxDate = q.maxDate ? new Date(q.maxDate) : null;
    cursor.forEach((sample) => {
      if (maxDate && sample.timestamp > maxDate) return true;
      if (minDate && sample.timestamp < minDate) return false;
      i += 1;
      if (i < q.offset) return true;
      if (i == end) return false;
      samples.push(sample);
      return true;
    }, (err) => {
      if (err) return cbk(err);
      cbk(null, samples);
    });
  });
}

router.get('/devices/:id/query', (req, res, next) => {
  const q = {
    limit: 10,
    offset: 0
  };
  Object.assign(q, req.query);
  util.mapPick(q, ['limit', 'offset'], parseInt);
  query(req.session, req.params.id, q, (err, samples) => {
    if (err) return next(err);
    if (q.keys) {
      const keys = q.keys.split(',');
      samples = data.serialize(samples, keys);
    }
    res.send(samples);
  });
});

router.get('/devices/:id/aggregate', (req, res, next) => {
  const q = {
    limit: -1,
    offset: 0,
    group: "hourOfDay",
    agg: "avg",
  };
  Object.assign(q, req.query);
  if (!data.groupers.hasOwnProperty(q.group)) return next(`Invalid group type: ${q.group}`);
  if (!data.aggregators.hasOwnProperty(q.agg)) return next(`Invalid aggregator type: ${q.agg}`);
  util.mapPick(q, ['limit', 'offset'], parseInt);
  const keys = q.keys ? q.keys.split(',') : [];
  const grouper = data.groupers[q.group];
  const aggregator = data.aggregators[q.agg];
  query(req.session, req.params.id, q, (err, samples) => {
    if (err) return next(err);
    const out = {};
    let groups = grouper(samples);
    out.n = groups.map((arr) => arr.length);
    keys.forEach((k) => {
      out[k] = groups.map((samples) => samples.map((el) => el.data[k])).map(aggregator);
    });
    res.send(out);
  });
});

router.get('/devices/:id/interval', (req, res, next) => {
  const q = {
    limit: 10,
    offset: 0,
    interval: -1000*60*60,
    startDate: new Date().toISOString(),
    agg: "avg",
  };
  Object.assign(q, req.query);
  if (!data.aggregators.hasOwnProperty(q.agg)) return next(`Invalid aggregator type: ${q.agg}`);
  util.mapPick(q, ['limit', 'offset', 'interval'], parseInt);
  const bucketOffset = q.offset;
  const bucketLimit = q.limit;
  const bucketInterval = q.interval;
  q.limit = -1;
  q.offset = 0;
  let startDate = new Date(q.startDate);
  if (bucketOffset) {
    startDate = new Date(startDate.getTime() + bucketOffset * bucketInterval);
  }
  const keys = q.keys ? q.keys.split(',') : [];
  const grouper = data.intervalBucketsFactory(startDate, bucketInterval, bucketLimit);
  const aggregator = data.aggregators[q.agg];
  query(req.session, req.params.id, q, (err, samples) => {
    if (err) return next(err);
    const out = {};
    out.timestamp = data.intervalBucketsTimestamps(startDate, bucketInterval, bucketLimit);
    let groups = grouper(samples);
    out.n = groups.map((arr) => arr.length);
    keys.forEach((k) => {
      out[k] = groups.map((samples) => samples.map((el) => el.data[k])).map(aggregator);
    });
    res.send(out);
  });
});
