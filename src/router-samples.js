const express = require('express');

const data = require('./data-processing');
const helpers = require('./helpers');

const router = express.Router();
module.exports = router;

router.get('/devices/:id/query', (req, res, next) => {
  const q = {
    limit: 10,
    offset: 0
  };
  Object.assign(q, req.query);
  helpers.intCast(q, ['limit', 'offset']);
  helpers.query(req.session, req.params.id, q, (err, samples) => {
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
  helpers.intCast(q, ['limit', 'offset']);
  const keys = q.keys ? q.keys.split(',') : [];
  const grouper = data.groupers[q.group];
  const aggregator = data.aggregators[q.agg];
  helpers.query(req.session, req.params.id, q, (err, samples) => {
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
  helpers.intCast(q, ['limit', 'offset', 'interval']);
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
  helpers.query(req.session, req.params.id, q, (err, samples) => {
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
