const express = require('express');
const util = require('./util');
const dataService = require('./data-service');
const data = require('./data-processing');

const router = express.Router();
module.exports = router;

router.get('/devices/:id/query', (req, res, next) => {
  const q = {
    limit: -1,
    offset: 0
  };
  Object.assign(q, req.query);
  util.mapPick(q, ['limit', 'offset'], parseInt);
  const filter = data.filterForQuery(q);
  dataService.getSamples(req.session, req.params.id, q.topic, (err, samples) => {
    if (err) return next(err);
    samples = data.query(samples, filter, q.limit, q.offset);
    if (q.keys) {
      const keys = q.keys.split(',');
      samples = data.serialize(samples, keys);
    }
    res.send(samples);
  });
});

router.get('/devices/:id/trend', (req, res, next) => {
  const q = {
    limit: 2,
    offset: 0
  };
  Object.assign(q, req.query);
  util.mapPick(q, ['limit', 'offset'], parseInt);
  const keys = q.keys ? q.keys.split(',') : [];
  const filter = data.filterForQuery(q);
  dataService.getSamples(req.session, req.params.id, q.topic, (err, samples) => {
    if (err) return next(err);
    samples = data.query(samples, filter, q.limit, q.offset);
    if (samples.length < 2) return next("Not enough samples");
    // time difference in hours
    const s0 = samples[0];
    const s1 = samples[samples.length - 1];
    const dt = (s0.timestamp - s1.timestamp) / (60*60*1000);
    const ans = {
      timestamp: s0.timestamp,
      dt: dt,
      n: samples.length,
    };
    keys.forEach((k) => {
      ans[k] = {
        current: s0.data[k],
        trend: (s0.data[k] - s1.data[k]) / dt,
      };
    });
    res.send(ans);
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
  const filter = data.filterForQuery(q);
  dataService.getSamples(req.session, req.params.id, q.topic, (err, samples) => {
    if (err) return next(err);
    samples = data.query(samples, filter, q.limit, q.offset);
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
    limit: 8,
    offset: 0,
    interval: -1000*60*60,
    startDate: new Date().toISOString(),
    agg: "avg",
  };
  Object.assign(q, req.query);
  if (!data.aggregators.hasOwnProperty(q.agg)) return next(`Invalid aggregator type: ${q.agg}`);
  util.mapPick(q, ['limit', 'offset', 'interval'], parseInt);
  let startDate = new Date(q.startDate);
  if (q.offset) {
    startDate = new Date(startDate.getTime() + q.offset * q.interval);
  }
  const keys = q.keys ? q.keys.split(',') : [];
  const grouper = data.intervalBucketsFactory(startDate, q.interval, q.limit);
  const aggregator = data.aggregators[q.agg];
  const filter = data.filterForQuery(q);
  dataService.getSamples(req.session, req.params.id, q.topic, (err, samples) => {
    if (err) return next(err);
    samples = data.query(samples, filter, -1, 0);
    const out = {};
    out.timestamp = data.intervalBucketsTimestamps(startDate, q.interval, q.limit);
    let groups = grouper(samples);
    out.n = groups.map((arr) => arr.length);
    keys.forEach((k) => {
      out[k] = groups.map((samples) => samples.map((el) => el.data[k])).map(aggregator);
    });
    res.send(out);
  });
});
