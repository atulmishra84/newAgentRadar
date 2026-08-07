'use strict';

const db = require('../models/db');
const { logAudit } = require('./audit');

async function listWebhooks(tenantId) {
  const { rows } = await db.query(
    `SELECT id, name, kind, url, enabled, events, created_at
     FROM enforcement_webhooks WHERE tenant_id=$1 ORDER BY name`,
    [tenantId]
  );
  return rows;
}

async function upsertWebhook(tenantId, payload) {
  const { rows } = await db.query(
    `INSERT INTO enforcement_webhooks (tenant_id, name, kind, url, enabled, events, secret)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (tenant_id, name) DO UPDATE SET
       kind=EXCLUDED.kind, url=EXCLUDED.url, enabled=EXCLUDED.enabled,
       events=EXCLUDED.events, secret=COALESCE(EXCLUDED.secret, enforcement_webhooks.secret)
     RETURNING id, name, kind, url, enabled, events, created_at`,
    [
      tenantId,
      payload.name,
      payload.kind || 'generic',
      payload.url,
      payload.enabled !== false,
      JSON.stringify(payload.events || ['agent.quarantine', 'agent.approve']),
      payload.secret || null,
    ]
  );
  return rows[0];
}

async function deleteWebhook(tenantId, id) {
  await db.query(`DELETE FROM enforcement_webhooks WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
}

async function deliver(tenantId, event, payload, { user, req } = {}) {
  const { rows: hooks } = await db.query(
    `SELECT * FROM enforcement_webhooks WHERE tenant_id=$1 AND enabled=true`,
    [tenantId]
  );
  const deliveries = [];

  for (const hook of hooks) {
    const events = hook.events || [];
    if (events.length && !events.includes(event)) continue;

    const body = {
      source: 'agentradar',
      event,
      kind: hook.kind,
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      ...payload,
      enforcement_hint: hintForKind(hook.kind, event, payload),
    };

    let status = 'simulated';
    let response_code = null;
    let error = null;

    const simulate =
      !hook.url ||
      /\.example(\.|$)|example\.(com|org|local)|localhost|127\.0\.0\.1/i.test(hook.url);

    if (!simulate) {
      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(hook.secret ? { 'X-AgentRadar-Secret': hook.secret } : {}),
          },
          body: JSON.stringify(body),
        });
        response_code = res.status;
        status = res.ok ? 'delivered' : 'failed';
        if (!res.ok) error = `HTTP ${res.status}`;
      } catch (err) {
        status = 'failed';
        error = err.message;
      }
    } else {
      status = 'simulated';
      response_code = 202;
    }

    const ins = await db.query(
      `INSERT INTO enforcement_deliveries
       (tenant_id, webhook_id, event, payload, status, response_code, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenantId, hook.id, event, JSON.stringify(body), status, response_code, error]
    );
    deliveries.push(ins.rows[0]);
  }

  await logAudit({
    tenantId,
    actorId: user?.sub,
    actorEmail: user?.email,
    action: `enforcement.${event}`,
    detail: { deliveries: deliveries.length, payload },
    req,
  });

  return deliveries;
}

function hintForKind(kind, event, payload) {
  const name = payload.agent?.name || payload.name || 'agent';
  switch (kind) {
    case 'servicenow':
      return {
        action: 'create_incident',
        short_description: `AgentRadar ${event}: ${name}`,
        urgency: event.includes('quarantine') ? 1 : 2,
      };
    case 'zscaler':
    case 'netskope':
      return { action: 'block_or_coach', destination: name, policy: 'shadow_ai_deny' };
    case 'edr':
    case 'crowdstrike':
    case 'defender':
      return { action: 'contain_process', target: name, reason: event };
    case 'entra':
      return { action: 'conditional_access_signal', app: name, control: 'block_or_mfa' };
    default:
      return { action: 'notify', event };
  }
}

async function listDeliveries(tenantId, limit = 50) {
  const { rows } = await db.query(
    `SELECT d.*, w.name AS webhook_name, w.kind
     FROM enforcement_deliveries d
     LEFT JOIN enforcement_webhooks w ON w.id = d.webhook_id
     WHERE d.tenant_id=$1
     ORDER BY d.created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return rows;
}

module.exports = {
  listWebhooks,
  upsertWebhook,
  deleteWebhook,
  deliver,
  listDeliveries,
};
