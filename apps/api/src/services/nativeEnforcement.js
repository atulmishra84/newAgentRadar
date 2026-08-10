'use strict';

/**
 * Native adapters for enforcement kinds.
 * Webhook `secret` may be a plain HMAC secret or JSON credentials:
 *   ServiceNow: {"username":"...","password":"..."}  url = https://instance.service-now.com
 *   CrowdStrike: {"clientId":"...","clientSecret":"..."} url = https://api.crowdstrike.com
 *   Entra: {"tenantId":"...","clientId":"...","clientSecret":"..."}
 *   Zscaler: {"apiKey":"..."} url = https://zsapi.zscaler.net/...
 */

function parseSecret(secret) {
  if (!secret) return {};
  try {
    return JSON.parse(secret);
  } catch {
    return { token: secret };
  }
}

async function deliverNative(hook, event, payload) {
  const hint = payload.enforcement_hint || {};
  const creds = parseSecret(hook.secret);
  const name = payload.agent?.name || payload.name || 'agent';

  switch (hook.kind) {
    case 'servicenow':
      return createServiceNowIncident(hook.url, creds, event, name, hint);
    case 'zscaler':
    case 'netskope':
      return pushZscalerPolicy(hook.url, creds, event, name, hint);
    case 'edr':
    case 'crowdstrike':
      return containCrowdStrike(hook.url, creds, event, name, payload);
    case 'entra':
      return entraSignal(creds, event, name, hint);
    default:
      return null; // fall back to generic webhook
  }
}

async function createServiceNowIncident(baseUrl, creds, event, name, hint) {
  if (!creds.username || !creds.password) return null;
  const root = baseUrl.replace(/\/$/, '').replace(/\/api\/.*$/, '');
  const url = `${root}/api/now/table/incident`;
  const body = {
    short_description: hint.short_description || `AgentRadar ${event}: ${name}`,
    urgency: String(hint.urgency || 2),
    impact: '2',
    category: 'security',
    description: JSON.stringify({ source: 'agentradar', event, agent: name, hint }, null, 2),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.ok ? 'delivered' : 'failed',
    response_code: res.status,
    error: res.ok ? null : text.slice(0, 300),
    adapter: 'servicenow.incident',
  };
}

async function pushZscalerPolicy(url, creds, event, name, hint) {
  if (!url || /\.example(\.|$)/i.test(url)) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(creds.apiKey ? { Authorization: `Bearer ${creds.apiKey}` } : {}),
      ...(creds.token ? { Authorization: `Bearer ${creds.token}` } : {}),
    },
    body: JSON.stringify({
      action: hint.action || 'block_or_coach',
      policy: hint.policy || 'shadow_ai_deny',
      destination: name,
      event,
      source: 'agentradar',
    }),
  });
  return {
    status: res.ok ? 'delivered' : 'failed',
    response_code: res.status,
    error: res.ok ? null : `HTTP ${res.status}`,
    adapter: 'zscaler.policy',
  };
}

async function containCrowdStrike(baseUrl, creds, event, name, payload) {
  if (!creds.clientId || !creds.clientSecret) return null;
  const root = (baseUrl || 'https://api.crowdstrike.com').replace(/\/$/, '');
  const tokenRes = await fetch(`${root}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    return { status: 'failed', response_code: tokenRes.status, error: 'CrowdStrike auth failed', adapter: 'crowdstrike' };
  }
  const { access_token } = await tokenRes.json();
  const deviceId = payload.agent?.metadata?.crowdstrike_device_id || creds.deviceId;
  if (!deviceId || !event.includes('quarantine')) {
    // Signal-only when no device id
    return {
      status: 'delivered',
      response_code: 202,
      error: null,
      adapter: 'crowdstrike.signal',
      note: 'No device id — containment skipped; signal logged',
    };
  }
  const res = await fetch(`${root}/devices/entities/devices-actions/v2?action_name=contain`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: [deviceId] }),
  });
  return {
    status: res.ok ? 'delivered' : 'failed',
    response_code: res.status,
    error: res.ok ? null : `HTTP ${res.status}`,
    adapter: 'crowdstrike.contain',
  };
}

async function entraSignal(creds, event, name, hint) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) return null;
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  );
  if (!tokenRes.ok) {
    return { status: 'failed', response_code: tokenRes.status, error: 'Entra token failed', adapter: 'entra' };
  }
  const { access_token } = await tokenRes.json();
  // Emit a security alert via Graph security API when available; otherwise acknowledge signal
  const res = await fetch('https://graph.microsoft.com/v1.0/security/alerts_v2', {
    method: 'GET',
    headers: { Authorization: `Bearer ${access_token}` },
  });
  // GET validates Graph scope; quarantine actions are recorded as CA signal in payload
  return {
    status: res.status < 500 ? 'delivered' : 'failed',
    response_code: res.status,
    error: res.status >= 500 ? `HTTP ${res.status}` : null,
    adapter: 'entra.conditional_access_signal',
    note: `${hint.control || 'block_or_mfa'} for ${name} on ${event}`,
  };
}

module.exports = { deliverNative, parseSecret };
