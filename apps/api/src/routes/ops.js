'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const { opsQueue } = require('../services/ops');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/queue', async (req, res) => {
  res.json(await opsQueue(req.tenantId));
});

module.exports = router;
