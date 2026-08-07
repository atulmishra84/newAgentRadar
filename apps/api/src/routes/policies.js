'use strict';

const express = require('express');
const { authenticate, requireWriteAccess } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const policies = require('../services/policies');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json({ policies: await policies.listPolicies(req.tenantId) });
});

router.get('/:id/agents', async (req, res) => {
  res.json({ agents: await policies.policyAgents(req.tenantId, req.params.id) });
});

router.post('/:id/run', requireWriteAccess, async (req, res) => {
  const result = await policies.runPolicy(req.tenantId, req.params.id, {
    remediate: false,
    user: req.user,
    req,
  });
  res.json(result);
});

router.post('/:id/remediate', requireWriteAccess, async (req, res) => {
  const result = await policies.runPolicy(req.tenantId, req.params.id, {
    remediate: true,
    user: req.user,
    req,
  });
  res.json(result);
});

router.post('/remediate-all', requireWriteAccess, async (req, res) => {
  const results = await policies.remediateAll(req.tenantId, req.user, req);
  res.json({ results });
});

module.exports = router;
