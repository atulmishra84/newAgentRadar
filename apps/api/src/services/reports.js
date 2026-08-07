'use strict';

const PDFDocument = require('pdfkit');
const { dashboardStats } = require('./agents');
const { estateCompliance } = require('./compliance');
const { listAgents } = require('./agents');

async function cisoReport(tenantId) {
  const stats = await dashboardStats(tenantId);
  const { frameworks } = await estateCompliance(tenantId);
  const agents = await listAgents(tenantId);

  const posture =
    stats.critical > 0 || stats.shadow > 5
      ? 'Critical'
      : stats.high > 3 || stats.phi_no_baa > 0
        ? 'High'
        : stats.avg_risk >= 30
          ? 'Medium'
          : 'Low';

  const keyRisks = [
    { label: 'Shadow AI agents', count: stats.shadow },
    { label: 'PHI agents missing BAA', count: stats.phi_no_baa },
    { label: 'Critical risk agents', count: stats.critical },
    { label: 'Unowned agents', count: stats.unowned },
    { label: 'Never reviewed', count: stats.never_reviewed },
  ];

  const recommendations = [];
  if (stats.shadow > 0) recommendations.push('Quarantine or approve all shadow AI agents this week.');
  if (stats.phi_no_baa > 0) recommendations.push('Execute BAAs for every PHI-touching agent before next audit.');
  if (stats.unowned > 0) recommendations.push('Assign owners to unowned agents via Operations workbench.');
  if (stats.never_reviewed > 0) recommendations.push('Complete overdue agent reviews (>90 days).');
  if (stats.critical > 0) recommendations.push('Remediate critical-risk agents via Policy Engine auto-remediate.');
  if (!recommendations.length) recommendations.push('Maintain current posture; expand connector coverage.');

  return {
    generated_at: new Date().toISOString(),
    posture,
    estate: stats,
    frameworks,
    keyRisks,
    recommendations,
    topAgents: agents.slice(0, 10).map((a) => ({
      name: a.name,
      risk_score: a.risk_score,
      risk_level: a.risk_level,
      shadow: a.shadow,
      phi_flag: a.phi_flag,
    })),
  };
}

function renderCisoPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text('AgentRadar CISO Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${report.generated_at}`);
    doc.text(`Overall risk posture: ${report.posture}`);
    doc.moveDown();
    doc.fontSize(14).text('Estate Summary');
    doc.fontSize(11);
    doc.text(`Total agents: ${report.estate.total}`);
    doc.text(`Shadow AI: ${report.estate.shadow}`);
    doc.text(`PHI agents: ${report.estate.phi}`);
    doc.text(`Critical risk: ${report.estate.critical}`);
    doc.moveDown();
    doc.fontSize(14).text('Key Risks');
    doc.fontSize(11);
    for (const r of report.keyRisks) doc.text(`• ${r.label}: ${r.count}`);
    doc.moveDown();
    doc.fontSize(14).text('Recommendations');
    doc.fontSize(11);
    for (const r of report.recommendations) doc.text(`• ${r}`);
    doc.moveDown();
    doc.fontSize(14).text('Framework Compliance');
    doc.fontSize(11);
    for (const [fw, data] of Object.entries(report.frameworks)) {
      doc.text(`${fw}: ${data.passPct}% pass (${data.fail} fail / ${data.warn} warn)`);
    }
    doc.end();
  });
}

module.exports = { cisoReport, renderCisoPdf };
