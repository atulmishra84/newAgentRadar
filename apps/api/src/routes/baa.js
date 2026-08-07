'use strict';

const express = require('express');
const { authenticate, requireWriteAccess } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const baa = require('../services/baa');
const { logAudit } = require('../services/audit');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json({ records: await baa.listBaa(req.tenantId) });
});

router.get('/phi', async (req, res) => {
  res.json({ agents: await baa.phiExposure(req.tenantId) });
});

router.put('/:agentId', requireWriteAccess, async (req, res) => {
  const record = await baa.upsertBaa(req.tenantId, req.params.agentId, req.body || {});
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'baa.upsert',
    detail: { agentId: req.params.agentId, status: record.status },
    req,
  });
  res.json({ record });
});

module.exports = router;
