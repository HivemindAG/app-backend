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

router.get('/environment', (req, res, next) => {
  proxyRequest(req.session, '', res, next, {
    '@keys': ['name', 'description'],
  });
});

router.get('/devices', (req, res, next) => {
  proxyRequest(req.session, req.url, res, next, {
    '@each': {'@keys': ['id', 'name', 'description']},
  });
});

router.get('/devices/:id', (req, res, next) => {
  proxyRequest(req.session, req.url, res, next, {
    '@keys': ['id', 'name', 'description'],
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
  proxyRequest(req.session, req.url, res, next, {
    '@each': {'@keys': ['id', 'name', 'description']},
  });
});

router.get('/device-groups/:id', (req, res, next) => {
  const pick = {
    '@keys': ['id', 'name', 'description', 'devices'],
    'devices': {'@each': {'@keys': ['id', 'name', 'description']}},
  };
  dataService.getPath(req.session, req.path, (err, group) => {
    if (err) return next(err);
    const devPath = req.path.replace(/\/device-groups\//, '/devices?groupId=');
    dataService.getPath(req.session, devPath, (err, ans) => {
      if (err) return next(err);
      group.devices = ans;
      res.send(util.deepPick(group, pick));
    });
  });
});
