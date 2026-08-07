'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.TEST_API_URL || 'http://localhost:4000';

async function json(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

describe('auth + agents integration', () => {
  let token;
  let csrf;
  let available = true;

  before(async () => {
    try {
      const csrfRes = await json('/api/auth/csrf');
      csrf = csrfRes.data.csrfToken;
    } catch {
      available = false;
    }
  });

  it('logs in with demo analyst', async (t) => {
    if (!available) {
      t.skip('API not running');
      return;
    }
    const { res, data } = await json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'analyst@acme.health', password: 'Analyst123!' }),
    });
    assert.equal(res.status, 200);
    assert.ok(data.token);
    token = data.token;
    csrf = data.csrfToken || csrf;
  });

  it('lists agents with JWT', async (t) => {
    if (!available || !token) {
      t.skip('API not running');
      return;
    }
    const { res, data } = await json('/api/agents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.agents));
    assert.ok(data.agents.length >= 1);
  });

  it('quarantines an agent with CSRF', async (t) => {
    if (!available || !token) {
      t.skip('API not running');
      return;
    }
    const list = await json('/api/agents?shadow=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const agent = list.data.agents?.[0];
    if (!agent) return;
    const { res, data } = await json(`/api/agents/${agent.id}/quarantine`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': csrf,
        Cookie: `ar_csrf=${csrf}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    assert.equal(data.agent.lifecycle, 'quarantined');
  });

  it('computes risk analytics', async (t) => {
    if (!available || !token) {
      t.skip('API not running');
      return;
    }
    const { res, data } = await json('/api/risk/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.ok(data.distribution);
    assert.ok(data.top);
  });
});
