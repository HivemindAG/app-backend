const express = require('express');
const platform = require('hivemind-app-cache');

const router = express.Router();
module.exports = router;

function getEntityKeys(list, def) {
  if (list === '') return [];
  if (!list) return def ? def : ['name'];
  return list.split(',');
}

function finalizeEntity(raw, keys) {
  const obj = {id: raw.id};
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

router.get('/environment', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  platform.entities.getEntity(req.session, '', (err, ans) => {
    if (err) return next(err);
    res.send(finalizeEntity(ans, keys));
  });
});

router.get('/devices', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  getDevices(req.session, '', keys, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});

router.get('/devices/:id', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  platform.entities.getSingle(req.session, '/devices', req.params.id, (err, ans) => {
    if (err) return next(err);
    finalizeDevice(req.session, ans, keys, (err, obj) => {
      if (err) return next(err);
      res.send(obj);
    });
  });
});

router.get('/device-groups', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  platform.entities.getList(req.session, `/device-groups`, (err, ans) => {
    if (err) return next(err);
    const arr = ans.map((el) => finalizeEntity(el, keys));
    if (keys.includes('devices')) {
      const devKeys = getEntityKeys(req.query.deviceKeys);
      asyncMap(arr, (obj, cbk) => {
        getDevices(req.session, `deviceGroup=${obj.id}`, devKeys, (err, ans) => {
          obj.devices = ans;
          cbk(err, obj);
        });
      }, (err, arr) => {
          if (err) return next(err);
          res.send(arr);
      });
    } else {
      res.send(arr);
    }
  });
});


router.get('/device-groups/:id', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys, ['name', 'description', 'devices']);
  platform.entities.getSingle(req.session, '/device-groups', req.params.id, (err, ans) => {
    if (err) return next(err);
    const obj = finalizeEntity(ans, keys);
    if (keys.includes('devices')) {
      const devKeys = getEntityKeys(req.query.deviceKeys);
      getDevices(req.session, `deviceGroup=${obj.id}`, devKeys, (err, ans) => {
        if (err) return next(err);
        obj.devices = ans;
        res.send(obj);
      });
    } else {
      res.send(obj);
    }
  });
});
