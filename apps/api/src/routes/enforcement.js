'use strict';

const express = require('express');
const { authenticate, requireWriteAccess, requireRoles, ROLES } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const enforcement = require('../services/enforcement');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/webhooks', async (req, res) => {
  res.json({ webhooks: await enforcement.listWebhooks(req.tenantId) });
});

router.post('/webhooks', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  if (!req.body?.name || !req.body?.url) {
    return res.status(400).json({ error: 'name and url required' });
  }
  const webhook = await enforcement.upsertWebhook(req.tenantId, req.body);
  res.status(201).json({ webhook });
});

router.delete('/webhooks/:id', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  await enforcement.deleteWebhook(req.tenantId, req.params.id);
  res.json({ ok: true });
});

router.get('/deliveries', async (req, res) => {
  res.json({ deliveries: await enforcement.listDeliveries(req.tenantId) });
});

module.exports = router;
