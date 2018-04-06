const defaults = {
  errorTimeout: 4 * 1000,
};

class Cache {
  constructor(args) {
    this.data = {};
    Object.assign(this, defaults, args);
  }
  expire(key) {
    const entry = this.data[key];
    if (!entry) return;
    entry.expires = -Infinity;
  }
  get(key, cbk, fetch, fetchArgs) {
    if (!this.data.hasOwnProperty(key)) {
      this.data[key] = {
        key: key,
        expires: -Infinity,
        requested: false,
        onReady: [],
      };
    }
    const entry = this.data[key];
    if (entry.expires > Date.now()) {
      cbk(entry.error, entry.value);
    } else {
      entry.onReady.push(cbk);
      if (!entry.requested) {
        this._request(entry, fetch, fetchArgs);
      }
    }
  }
  _request(entry, fetch, fetchArgs) {
    entry.requested = true;
    const args = {key: entry.key, value: entry.value};
    Object.assign(args, fetchArgs);
    fetch(args, (err, ans) => {
      const now = Date.now();
      entry.requested = false;
      if (err) {
        entry.error = err;
        delete entry.value;
        entry.expires = now + this.errorTimeout;
      } else {
        entry.value = ans.value;
        delete entry.error;
        if (ans.hasOwnProperty('timeout')) {
          entry.expires = now + ans.timeout;
        } else {
          entry.expires = Infinity;
        }
      }
      const onReady = entry.onReady;
      entry.onReady = [];
      onReady.forEach((cbk) => cbk(entry.error, entry.value));
    });
  }
}

module.exports = {
  Cache,
};
