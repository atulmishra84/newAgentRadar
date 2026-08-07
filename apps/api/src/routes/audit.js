'use strict';

const express = require('express');
const { authenticate, requireRoles, ROLES } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const { listAudit } = require('../services/audit');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO, ROLES.AUDITOR, ROLES.ANALYST), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
  const offset = parseInt(req.query.offset || '0', 10);
  res.json({ events: await listAudit(req.tenantId, { limit, offset }) });
});

module.exports = router;
