'use strict';

const express = require('express');
const { authenticate, requireWriteAccess, requireRoles, ROLES } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const { listModels, upsertModel, deleteModel } = require('../services/models');
const { logAudit } = require('../services/audit');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json({ models: await listModels(req.tenantId) });
});

router.post('/', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO, ROLES.ANALYST), async (req, res) => {
  try {
    const model = await upsertModel(req.tenantId, req.body || {});
    await logAudit({
      tenantId: req.tenantId,
      actorId: req.user.sub,
      actorEmail: req.user.email,
      action: 'model.upsert',
      detail: { id: model.id, name: model.name },
      req,
    });
    res.status(201).json({ model });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  const ok = await deleteModel(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
