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

module.exports = {
  serialize,
  intervalBucketsFactory,
  intervalBucketsTimestamps,
  groupers,
  aggregators,
};
