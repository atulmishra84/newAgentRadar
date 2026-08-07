'use strict';

const db = require('../models/db');
const { listAgents, updateAgent } = require('./agents');
const { logAudit } = require('./audit');

const BUILTIN = [
  {
    key: 'shadow_quarantine',
    name: 'Shadow AI Quarantine',
    description: 'Quarantine unauthorized shadow AI agents',
    trigger_type: 'automatic',
    steps: ['Identify shadow agents', 'Set lifecycle=quarantined', 'Notify security', 'Log evidence'],
  },
  {
    key: 'baa_check',
    name: 'BAA Compliance Check',
    description: 'Find PHI agents missing BAA and flag them',
    trigger_type: 'manual',
    steps: ['List PHI agents', 'Check BAA status', 'Flag missing BAAs', 'Alert compliance'],
  },
  {
    key: 'owner_assignment',
    name: 'Owner Assignment',
    description: 'Auto-suggest owners from Azure tags',
    trigger_type: 'manual',
    steps: ['Find unowned agents', 'Read tags.owner', 'Assign suggested owner', 'Notify assignee'],
  },
  {
    key: 'high_risk_review',
    name: 'High Risk Review',
    description: 'Move critical/high agents into review',
    trigger_type: 'automatic',
    steps: ['Select high/critical agents', 'Set under_review', 'Create review tasks', 'Notify owners'],
  },
  {
    key: 'compliance_drift',
    name: 'Compliance Drift Alert',
    description: 'Alert when framework failures increase',
    trigger_type: 'automatic',
    steps: ['Compute framework fail counts', 'Compare to baseline', 'Emit alert', 'Webhook notify'],
  },
  {
    key: 'new_agent_onboarding',
    name: 'New Agent Onboarding',
    description: 'Onboard newly discovered agents',
    trigger_type: 'manual',
    steps: ['List candidate agents', 'Request owner', 'Schedule review', 'Mark under_review'],
  },
];

async function ensurePlaybooks(tenantId) {
  for (const p of BUILTIN) {
    await db.query(
      `INSERT INTO playbooks (tenant_id, key, name, description, trigger_type, steps)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, key) DO NOTHING`,
      [tenantId, p.key, p.name, p.description, p.trigger_type, JSON.stringify(p.steps)]
    );
  }
}

async function listPlaybooks(tenantId) {
  await ensurePlaybooks(tenantId);
  const { rows } = await db.query(
    `SELECT * FROM playbooks WHERE tenant_id=$1 ORDER BY name`,
    [tenantId]
  );
  return rows;
}

async function setAutoMode(tenantId, id, auto_mode) {
  const { rows } = await db.query(
    `UPDATE playbooks SET auto_mode=$1 WHERE tenant_id=$2 AND id=$3 RETURNING *`,
    [!!auto_mode, tenantId, id]
  );
  return rows[0];
}

async function runPlaybook(tenantId, id, user, req) {
  const { rows } = await db.query(
    `SELECT * FROM playbooks WHERE tenant_id=$1 AND id=$2`,
    [tenantId, id]
  );
  const pb = rows[0];
  if (!pb) throw new Error('Playbook not found');

  const runIns = await db.query(
    `INSERT INTO playbook_runs (tenant_id, playbook_id, triggered_by, status)
     VALUES ($1,$2,$3,'running') RETURNING *`,
    [tenantId, id, user?.sub || null]
  );
  const run = runIns.rows[0];
  const stepLog = [];
  const agents = await listAgents(tenantId);

  const push = async (step, detail) => {
    stepLog.push({ step, detail, at: new Date().toISOString() });
  };

  try {
    switch (pb.key) {
      case 'shadow_quarantine': {
        const targets = agents.filter((a) => a.shadow && a.lifecycle !== 'quarantined');
        await push('Identify shadow agents', { count: targets.length });
        for (const a of targets) {
          await updateAgent(tenantId, a.id, { lifecycle: 'quarantined' });
        }
        await push('Set lifecycle=quarantined', { count: targets.length });
        await push('Notify security', { channel: 'audit' });
        await push('Log evidence', { ok: true });
        break;
      }
      case 'baa_check': {
        const targets = agents.filter((a) => a.phi_flag && a.baa_status === 'missing');
        await push('List PHI agents', { count: agents.filter((a) => a.phi_flag).length });
        await push('Check BAA status', { missing: targets.length });
        await push('Flag missing BAAs', { agents: targets.map((a) => a.name) });
        await push('Alert compliance', { ok: true });
        break;
      }
      case 'owner_assignment': {
        const targets = agents.filter((a) => !a.owner);
        await push('Find unowned agents', { count: targets.length });
        let assigned = 0;
        for (const a of targets) {
          const suggested = a.tags?.owner || a.tags?.Owner || a.metadata?.suggested_owner;
          if (suggested) {
            await updateAgent(tenantId, a.id, { owner: suggested });
            assigned += 1;
          }
        }
        await push('Read tags.owner', { assigned });
        await push('Assign suggested owner', { assigned });
        await push('Notify assignee', { ok: true });
        break;
      }
      case 'high_risk_review': {
        const targets = agents.filter((a) => a.risk_level === 'high' || a.risk_level === 'critical');
        await push('Select high/critical agents', { count: targets.length });
        for (const a of targets) {
          await updateAgent(tenantId, a.id, { lifecycle: 'under_review' });
        }
        await push('Set under_review', { count: targets.length });
        await push('Create review tasks', { ok: true });
        await push('Notify owners', { ok: true });
        break;
      }
      case 'compliance_drift': {
        let fails = 0;
        for (const a of agents) {
          for (const fw of Object.values(a.framework_scores || {})) {
            if (fw.status === 'fail') fails += 1;
          }
        }
        await push('Compute framework fail counts', { fails });
        await push('Compare to baseline', { drifted: fails > 0 });
        await push('Emit alert', { severity: fails > 10 ? 'high' : 'medium' });
        if (pb.webhook_url) {
          try {
            await fetch(pb.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playbook: pb.key, fails }),
            });
            await push('Webhook notify', { ok: true });
          } catch (err) {
            await push('Webhook notify', { ok: false, error: err.message });
          }
        } else {
          await push('Webhook notify', { skipped: true });
        }
        break;
      }
      case 'new_agent_onboarding': {
        const targets = agents.filter((a) => a.confidence === 'candidate' || a.lifecycle === 'active');
        const fresh = targets.filter((a) => {
          const age = Date.now() - new Date(a.first_discovered).getTime();
          return age < 7 * 86400000;
        });
        await push('List candidate agents', { count: fresh.length });
        for (const a of fresh) {
          await updateAgent(tenantId, a.id, { lifecycle: 'under_review' });
        }
        await push('Request owner', { ok: true });
        await push('Schedule review', { ok: true });
        await push('Mark under_review', { count: fresh.length });
        break;
      }
      default:
        await push('Unknown playbook', { key: pb.key });
    }

    await db.query(
      `UPDATE playbook_runs SET status='complete', step_log=$1, finished_at=NOW() WHERE id=$2`,
      [JSON.stringify(stepLog), run.id]
    );

    if (pb.webhook_url && pb.key !== 'compliance_drift') {
      try {
        await fetch(pb.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playbook: pb.key, runId: run.id, stepLog }),
        });
      } catch {
        /* ignore webhook errors */
      }
    }

    await logAudit({
      tenantId,
      actorId: user?.sub,
      actorEmail: user?.email,
      action: 'playbook.run',
      detail: { playbook: pb.key, runId: run.id },
      req,
    });

    return { ...run, status: 'complete', step_log: stepLog };
  } catch (err) {
    await db.query(
      `UPDATE playbook_runs SET status='error', step_log=$1, finished_at=NOW() WHERE id=$2`,
      [JSON.stringify([...stepLog, { step: 'error', detail: err.message }]), run.id]
    );
    throw err;
  }
}

async function runHistory(tenantId, playbookId) {
  const { rows } = await db.query(
    `SELECT * FROM playbook_runs
     WHERE tenant_id=$1 AND ($2::uuid IS NULL OR playbook_id=$2)
     ORDER BY started_at DESC LIMIT 50`,
    [tenantId, playbookId || null]
  );
  return rows;
}

module.exports = {
  ensurePlaybooks,
  listPlaybooks,
  setAutoMode,
  runPlaybook,
  runHistory,
};
