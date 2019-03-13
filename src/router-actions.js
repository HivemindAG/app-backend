const express = require('express');
const platform = require('hivemind-app-cache');

const router = express.Router();
module.exports = router;

router.post('/devices/:id/up', (req, res, next) => {
  platform.entities.getSingle(req.session, '/devices', req.params.id, (err, ans) => {
    if (err) return next(err);
    const props = ans.properties || {};
    if (!props.uplink) return next('Uplink not enabled for this device');
    const args = {
      path: `/v1/environments/${req.session.envId}/devices/${ans.id}/up`,
      method: 'POST',
      json: req.body,
    };
    platform.apiRequest.call(req.session, args, (err, _, ans) => {
      if (err) return next(err);
      res.send({msg: 'ok'});
    });
  });
});

router.post('/devices/:id/down', (req, res, next) => {
  platform.entities.getSingle(req.session, '/devices', req.params.id, (err, ans) => {
    if (err) return next(err);
    const props = ans.properties || {};
    if (!props.downlink) return next('Downlink not enabled for this device');
    const args = {
      path: `/v1/environments/${req.session.envId}/devices/${ans.id}/down`,
      method: 'POST',
      json: req.body,
    };
    platform.apiRequest.call(req.session, args, (err, _, ans) => {
      if (err) return next(err);
      res.send({msg: 'ok'});
    });
  });
});
