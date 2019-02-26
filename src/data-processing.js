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
  hourOfDay: dayHoursBuckets,
  dayOfWeek: weekDayBuckets,
  hourOfWeek: weekHourBuckets,
  dayOfMonth: monthDayBuckets,
};

function mkBuckets(nBuckets) {
  const out = [];
  while (nBuckets-- > 0) out.push([]);
  return out;
}

function dayHoursBuckets(records) {
  const buckets = mkBuckets(24);
  records.forEach((o) => {
    const i = o.timestamp.getHours();
    buckets[i].push(o);
  });
  return buckets;
}

function weekDayBuckets(records) {
  const buckets = mkBuckets(7);
  records.forEach((o) => {
    const i = o.timestamp.getDay();
    buckets[i].push(o);
  });
  return buckets;
}

function weekHourBuckets(records) {
  const buckets = mkBuckets(24*7);
  records.forEach((o) => {
    const day = o.timestamp.getDay();
    const hour = o.timestamp.getHours();
    const i = day * 24 + hour;
    buckets[i].push(o);
  });
  return buckets;
}

function monthDayBuckets(records) {
  const buckets = mkBuckets(31);
  records.forEach((o) => {
    const i = o.timestamp.getDate() - 1;
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

function query(cursor, q, limit, offset, cbk) {
  let i = -1;
  const end = offset + limit;
  const out = [];
  const minDate = q.minDate ? new Date(q.minDate) : null;
  const maxDate = q.maxDate ? new Date(q.maxDate) : null;
  cursor.forEach((sample) => {
    if (maxDate && sample.timestamp > maxDate) return true;
    if (minDate && sample.timestamp < minDate) return false;
    i += 1;
    if (i < offset) return true;
    if (i == end) return false;
    out.push(sample);
    return true;
  }, (err) => {
    if (err) return cbk(err);
    cbk(null, out);
  });
};

function filterForQuery(q) {
  const filters = [];
  if (q.hasOwnProperty('minDate')) {
    const min = new Date(q.minDate).getTime();
    filters.push((o) => o.timestamp >= min);
  }
  if (q.hasOwnProperty('maxDate')) {
    const max = new Date(q.maxDate).getTime();
    filters.push((o) => o.timestamp <= max);
  }
  if (filters.length === 0) return null;
  if (filters.length === 1) return filters[0];
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
