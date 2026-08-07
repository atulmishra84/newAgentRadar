'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const { cisoReport, renderCisoPdf } = require('../services/reports');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/ciso', async (req, res) => {
  res.json(await cisoReport(req.tenantId));
});

router.get('/ciso.pdf', async (req, res) => {
  const report = await cisoReport(req.tenantId);
  const pdf = await renderCisoPdf(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="agentradar-ciso-report.pdf"');
  res.send(pdf);
});

module.exports = router;
