'use strict';

const express = require('express');
const { authenticate, requireWriteAccess } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const phi = require('../services/phiInspect');
const { logAudit } = require('../services/audit');

const router = express.Router();
router.use(authenticate, tenantScope);

router.post('/estate', requireWriteAccess, async (req, res) => {
  const result = await phi.inspectEstate(req.tenantId);
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'phi.inspect_estate',
    detail: { inspected: result.inspected, flagged: result.flagged },
    req,
  });
  res.json(result);
});

router.post('/:agentId', requireWriteAccess, async (req, res) => {
  const result = await phi.inspectAndPersist(req.tenantId, req.params.agentId);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

router.get('/patterns', (req, res) => {
  res.json({
    patterns: phi.PATTERNS.map((p) => ({ code: p.code, weight: p.weight, detail: p.detail })),
    note: 'Scans agent metadata, data stores, and protocols — does not open EHR patient records.',
  });
});

module.exports = router;
