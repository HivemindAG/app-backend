const express = require('express');
const platform = require('hivemind-app-cache');

const helpers = require('./helpers');

const router = express.Router();
module.exports = router;

router.get('/environment', (req, res, next) => {
  const keys = helpers.getEntityKeys(req.query.keys);
  platform.entities.getEntity(req.session, '', (err, ans) => {
    if (err) return next(err);
    res.send(helpers.finalizeEntity(ans, keys));
  });
});

router.get('/devices', (req, res, next) => {
  const keys = helpers.getEntityKeys(req.query.keys);
  helpers.getDevices(req.session, '', keys, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});

router.get('/devices/:id', (req, res, next) => {
  const keys = helpers.getEntityKeys(req.query.keys);
  platform.entities.getSingle(req.session, '/devices', req.params.id, (err, ans) => {
    if (err) return next(err);
    helpers.finalizeDevice(req.session, ans, keys, (err, obj) => {
      if (err) return next(err);
      res.send(obj);
    });
  });
});

router.patch('/devices/:id/properties', (req, res, next) => {
  platform.entities.getSingle(req.session, '/devices', req.params.id, (err, deviceData) => {
    if (err) return next(err);
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        const value = req.body[key];
        deviceData.properties[key] = value;
      }
    }
    const args = {
      path: `/v1/environments/${req.session.envId}/devices/${deviceData.id}`,
      method: 'PUT',
      json: deviceData,
    };
    platform.apiRequest.call(req.session, args, (err, response, result) => {
      if (err) return next(err);
      res.send(result);
    });
  });
});

router.get('/device-groups', (req, res, next) => {
  const keys = helpers.getEntityKeys(req.query.keys);
  platform.entities.getList(req.session, `/device-groups`, (err, ans) => {
    if (err) return next(err);
    const arr = ans.map((el) => helpers.finalizeEntity(el, keys));
    if (keys.includes('devices')) {
      const devKeys = helpers.getEntityKeys(req.query.deviceKeys);
      helpers.asyncMap(arr, (obj, cbk) => {
        helpers.getDevices(req.session, `deviceGroup=${obj.id}`, devKeys, (err, ans) => {
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
  const keys = helpers.getEntityKeys(req.query.keys, ['name', 'description', 'devices']);
  platform.entities.getSingle(req.session, '/device-groups', req.params.id, (err, ans) => {
    if (err) return next(err);
    const obj = helpers.finalizeEntity(ans, keys);
    if (keys.includes('devices')) {
      const devKeys = helpers.getEntityKeys(req.query.deviceKeys);
      helpers.getDevices(req.session, `deviceGroup=${obj.id}`, devKeys, (err, ans) => {
        if (err) return next(err);
        obj.devices = ans;
        res.send(obj);
      });
    } else {
      res.send(obj);
    }
  });
});
