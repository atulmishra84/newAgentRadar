'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const { estateCompliance } = require('../services/compliance');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json(await estateCompliance(req.tenantId));
});

module.exports = router;
