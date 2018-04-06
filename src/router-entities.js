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

router.get('/device-groups', (req, res, next) => {
  proxyRequest(req.session, req.url, res, next, {
    '@each': {'@keys': ['id', 'name', 'description']},
  });
});

router.get('/device-groups/:id', (req, res, next) => {
  proxyRequest(req.session, req.url, res, next, {
    '@keys': ['id', 'name', 'description', 'devices'],
    'devices': {'@each': {'@keys': ['id', 'name', 'description']}},
  });
});
