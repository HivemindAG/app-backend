function serialize(records, keys) {
  const out = {
    timestamp: [],
  };
  keys.forEach((key) => out[key] = []);
  records.forEach((obj) => {
    out.timestamp.push(obj.timestamp);
    keys.forEach((key) => {
      var val = key === 'topic' ? obj[key] : obj.data[key];
      if (typeof val === 'undefined') val = null;
      out[key].push(val);
    });
  });
  return out;
}

const groupers = {
  hourOfDay: hoursBuckets,
  dayOfWeek: dayBuckets,
};

function mkBuckets(nBuckets) {
  const out = [];
  while (nBuckets-- > 0) out.push([]);
  return out;
}

function hoursBuckets(records) {
  const buckets = mkBuckets(24);
  records.forEach((o) => {
    const i = o.timestamp.getHours();
    buckets[i].push(o);
  });
  return buckets;
}

function dayBuckets(records) {
  const buckets = mkBuckets(7);
  records.forEach((o) => {
    const i = o.timestamp.getDay();
    buckets[i].push(o);
  });
  return buckets;
}

function intervalBucketsFactory(startDate, interval, limit) {
  return (records) => {
    const buckets = mkBuckets(limit);
    records.forEach((o) => {
      const i = Math.floor((o.timestamp - startDate) / interval);
      // i could be NaN
      if (i >= 0 && i < buckets.length) {
        buckets[i].push(o);
      }
    });
    return buckets;
  };
}

function intervalBucketsTimestamps(startDate, interval, limit) {
  const start = startDate.getTime();
  const out = [];
  for (var i = 0; i < limit; i++) {
    out.push(new Date(start + i * interval));
  }
  return out;
}

const aggregators = {
  avg: average,
  sum: sum,
  min: min,
  max: max,
  none: (samples) => samples,
};

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function min(arr) {
  return Math.min.apply(null, arr);
}

function max(arr) {
  return Math.max.apply(null, arr);
}

function query(samples, filter, limit, offset) {
  let n = -1;
  const end = offset + limit;
  const out = [];
  for (let i = 0; i < samples.length; i += 1) {
    const d = samples[i];
    if (filter && !filter(d)) continue;
    n += 1;
    if (n < offset) continue;
    if (n == end) break;
    out.push(d);
  }
  return out;
};

function filterForQuery(q) {
  const filters = [];
  if (q.hasOwnProperty('topic')) {
    filters.push((o) => o.topic === q.topic);
  }
  if (q.hasOwnProperty('topics')) {
    const topics = q.topics.split(',');
    if (topics.length > 1) {
      filters.push((o) => topics.includes(o.topic));
    } else if (q.topics !== '*') {
      filters.push((o) => o.topic === q.topics);
    }
  }
  if (q.hasOwnProperty('minDate')) {
    const min = new Date(q.minDate).getTime();
    filters.push((o) => o.timestamp >= min);
  }
  if (q.hasOwnProperty('maxDate')) {
    const max = new Date(q.maxDate).getTime();
    filters.push((o) => o.timestamp <= max);
  }
  if (filters.length === 0) return null;
  return (o) => {
    for (var i = 0; i < filters.length; i++) {
      if (!filters[i](o)) return false;
    }
    return true;
  };
}

module.exports = {
  query,
  serialize,
  filterForQuery,
  intervalBucketsFactory,
  intervalBucketsTimestamps,
  groupers,
  aggregators,
};
