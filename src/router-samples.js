const express = require('express');
const platform = require('hivemind-app-cache');
const util = require('./util');
const data = require('./data-processing');

const router = express.Router();
module.exports = router;

router.get('/devices/:id/query', (req, res, next) => {
  const q = {
    limit: 10,
    offset: 0
  };
  Object.assign(q, req.query);
  util.mapPick(q, ['limit', 'offset'], parseInt);
  if (typeof q.topic !== 'string') return next(`Missing query argument: topic`);
  const cursor = new platform.SampleCursor(req.session, req.params.id, q.topic);
  data.query(cursor, q, q.limit, q.offset, (err, samples) => {
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
  if (typeof q.topic !== 'string') return next(`Missing query argument: topic`);
  const cursor = new platform.SampleCursor(req.session, req.params.id, q.topic);
  data.query(cursor, q, q.limit, q.offset, (err, samples) => {
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
    limit: -1,
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
  if (typeof q.topic !== 'string') return next(`Missing query argument: topic`);
  const cursor = new platform.SampleCursor(req.session, req.params.id, q.topic);
  data.query(cursor, q, -1, 0, (err, samples) => {
    if (err) return next(err);
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
