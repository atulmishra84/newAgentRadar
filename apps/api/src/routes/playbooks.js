'use strict';

const express = require('express');
const { authenticate, requireWriteAccess } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const playbooks = require('../services/playbooks');
const db = require('../models/db');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  res.json({ playbooks: await playbooks.listPlaybooks(req.tenantId) });
});

router.get('/runs', async (req, res) => {
  res.json({ runs: await playbooks.runHistory(req.tenantId, req.query.playbookId) });
});

router.post('/:id/run', requireWriteAccess, async (req, res) => {
  const result = await playbooks.runPlaybook(req.tenantId, req.params.id, req.user, req);
  res.json({ run: result });
});

router.patch('/:id', requireWriteAccess, async (req, res) => {
  const { auto_mode, webhook_url } = req.body || {};
  if (auto_mode !== undefined) {
    const pb = await playbooks.setAutoMode(req.tenantId, req.params.id, auto_mode);
    return res.json({ playbook: pb });
  }
  if (webhook_url !== undefined) {
    const { rows } = await db.query(
      `UPDATE playbooks SET webhook_url=$1 WHERE tenant_id=$2 AND id=$3 RETURNING *`,
      [webhook_url, req.tenantId, req.params.id]
    );
    return res.json({ playbook: rows[0] });
  }
  res.status(400).json({ error: 'No updates provided' });
});

module.exports = router;
