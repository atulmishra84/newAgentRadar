'use strict';

const express = require('express');
const { authenticate, requireWriteAccess } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const agents = require('../services/agents');
const { logAudit } = require('../services/audit');
const { forwardToSiem } = require('../services/siem');
const enforcement = require('../services/enforcement');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json({ agents: await agents.listAgents(req.tenantId, req.query) });
});

router.get('/stats', async (req, res) => {
  res.json(await agents.dashboardStats(req.tenantId));
});

router.get('/evidence/estate', async (req, res) => {
  const pkg = await agents.estateEvidence(req.tenantId);
  res.json(pkg);
});

router.get('/:id', async (req, res) => {
  const agent = await agents.getAgent(req.tenantId, req.params.id);
  if (!agent) return res.status(404).json({ error: 'Not found' });
  res.json({ agent });
});

router.get('/:id/evidence', async (req, res) => {
  const pkg = await agents.evidencePackage(req.tenantId, req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Not found' });
  res.json(pkg);
});

router.patch('/:id', requireWriteAccess, async (req, res) => {
  const agent = await agents.updateAgent(req.tenantId, req.params.id, req.body || {});
  if (!agent) return res.status(404).json({ error: 'Not found' });
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'agent.update',
    detail: { id: agent.id, patch: req.body },
    req,
  });
  res.json({ agent });
});

router.post('/:id/approve', requireWriteAccess, async (req, res) => {
  const agent = await agents.updateAgent(req.tenantId, req.params.id, {
    shadow: false,
    lifecycle: 'approved',
    last_reviewed_at: new Date().toISOString(),
  });
  if (!agent) return res.status(404).json({ error: 'Not found' });
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'agent.approve',
    detail: { id: agent.id },
    req,
  });
  const deliveries = await enforcement.deliver(
    req.tenantId,
    'agent.approve',
    { agent },
    { user: req.user, req }
  );
  await forwardToSiem({ action: 'agent.approve', agentId: agent.id, name: agent.name });
  res.json({ agent, enforcement: deliveries });
});

router.post('/:id/quarantine', requireWriteAccess, async (req, res) => {
  const agent = await agents.updateAgent(req.tenantId, req.params.id, {
    lifecycle: 'quarantined',
  });
  if (!agent) return res.status(404).json({ error: 'Not found' });
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'agent.quarantine',
    detail: { id: agent.id },
    req,
  });
  const deliveries = await enforcement.deliver(
    req.tenantId,
    'agent.quarantine',
    { agent },
    { user: req.user, req }
  );
  await forwardToSiem({ action: 'agent.quarantine', agentId: agent.id, name: agent.name });
  res.json({ agent, enforcement: deliveries });
});

router.post('/:id/assign-owner', requireWriteAccess, async (req, res) => {
  const { owner } = req.body || {};
  if (!owner) return res.status(400).json({ error: 'owner required' });
  const agent = await agents.updateAgent(req.tenantId, req.params.id, { owner });
  if (!agent) return res.status(404).json({ error: 'Not found' });
  res.json({ agent });
});

router.post('/:id/accept-risk', requireWriteAccess, async (req, res) => {
  try {
    const agent = await agents.acceptRisk(req.tenantId, req.params.id, {
      reason: req.body?.reason,
      expires_at: req.body?.expires_at,
      userId: req.user.sub,
    });
    if (!agent) return res.status(404).json({ error: 'Not found' });
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user.sub,
      actorEmail: req.user.email,
      action: 'agent.accept_risk',
      detail: { id: agent.id, reason: req.body?.reason, expires_at: req.body?.expires_at },
      req,
    });
    res.json({ agent });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
