'use strict';

const express = require('express');
const { authenticate, requireWriteAccess } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const risk = require('../services/risk');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/analytics', async (req, res) => {
  res.json(await risk.analytics(req.tenantId));
});

router.post('/snapshot', requireWriteAccess, async (req, res) => {
  res.json(await risk.captureSnapshot(req.tenantId));
});

module.exports = router;
