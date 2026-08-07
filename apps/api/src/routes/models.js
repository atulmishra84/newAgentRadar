'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const { listModels } = require('../services/models');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json({ models: await listModels(req.tenantId) });
});

module.exports = router;
