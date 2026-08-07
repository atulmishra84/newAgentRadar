'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const discovery = require('../services/discovery');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/coverage', async (req, res) => {
  res.json(await discovery.coverage(req.tenantId));
});

router.get('/events', async (req, res) => {
  res.json({ events: await discovery.listEvents(req.tenantId) });
});

router.get('/scan-state', async (req, res) => {
  res.json({ state: await discovery.getScanState(req.tenantId) });
});

module.exports = router;
