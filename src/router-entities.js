const express = require('express');
const util = require('./util');
const dataService = require('./data-service');

const router = express.Router();
module.exports = router;

function proxyRequest(session, path, res, next, pick) {
  dataService.getPath(session, path, (err, ans) => {
    if (err) return next(err);
    res.send(util.deepPick(ans, pick));
  });
}

function getEntityKeys(list, def) {
  if (list === '') return [];
  if (!list) return def ? def : ['name', 'description'];
  return list.split(',');
}

function getEntity(session, path, keys, finalize, cbk) {
  dataService.getPath(session, path, (err, ans) => {
    if (err) return cbk(err);
    const obj = {id: ans.id};
    if (keys.includes('name')) obj.name = ans.name;
    if (keys.includes('description')) obj.description = ans.description;
    if (keys.includes('properties')) obj.properties = dataService.getProperties(ans);
    if (finalize) {
      finalize(obj, ans, cbk);
    } else {
      cbk(null, obj);
    }
  });
}

function getDevice(session, devId, keys, cbk) {
  let finalize = null;
  if (keys.includes('typeProperties')) {
    finalize = (obj, ans, cbk) => {
      dataService.getPath(session, `/device-types/${ans.deviceType.id}`, (err, ans) => {
        if (err) return cbk(err);
        obj.typeProperties = dataService.getProperties(ans);
        cbk(null, obj);
      });
    };
  }
  getEntity(session, `/devices/${devId}`, keys, finalize, cbk);
}

function asyncMap(arr, func, cbk, index) {
  const i = index || 0;
  if (i >= arr.length) return cbk(null, arr);
  func(arr[i], (err, ans) => {
    if (err) return cbk(err);
    arr[i] = ans;
    asyncMap(arr, func, cbk, i + 1);
  });
}

router.get('/environment', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  getEntity(req.session, '', keys, null, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});

router.get('/devices', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  dataService.getPath(req.session, `/devices`, (err, ans) => {
    if (err) return next(err);
    asyncMap(ans, (el, cbk) => {
      getDevice(req.session, el.id, keys, cbk);
    }, (err, arr) => {
      if (err) return next(err);
      res.send(arr);
    });
  });
});

router.get('/devices/:id', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  getDevice(req.session, req.params.id, keys, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});

router.post('/devices/:id/up', (req, res, next) => {
  dataService.deviceUplink(req.session, req.params.id, req.body, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});

router.post('/devices/:id/down', (req, res, next) => {
  dataService.deviceDownlink(req.session, req.params.id, req.body, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});

router.get('/device-groups', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys);
  dataService.getPath(req.session, `/device-groups`, (err, ans) => {
    if (err) return next(err);
    asyncMap(ans, (el, cbk) => {
      getEntity(req.session, `/device-groups/${el.id}`, keys, null, cbk);
    }, (err, arr) => {
      if (err) return next(err);
      res.send(arr);
    });
  });
});

router.get('/device-groups/:id', (req, res, next) => {
  const keys = getEntityKeys(req.query.keys, ['name', 'description', 'devices']);
  let finalize = null;
  if (keys.includes('devices')) {
    finalize = (obj, ans, cbk) => {
      const keys = getEntityKeys(req.query.deviceKeys);
      dataService.getPath(req.session, `/devices?deviceGroup=${obj.id}&limit=1000`, (err, ans) => {
        if (err) return next(err);
        asyncMap(ans, (el, cbk) => {
          getDevice(req.session, el.id, keys, cbk);
        }, (err, arr) => {
          if (err) return cbk(err);
          obj.devices = arr;
          cbk(null, obj);
        });
      });
    };
  }
  getEntity(req.session, `/device-groups/${req.params.id}`, keys, finalize, (err, ans) => {
    if (err) return next(err);
    res.send(ans);
  });
});
