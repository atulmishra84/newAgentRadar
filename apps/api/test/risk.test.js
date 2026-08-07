'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  scoreAgent,
  confidenceFromSources,
  buildFrameworkScores,
  agentFingerprint,
} = require('@agentradar/shared');

describe('risk formula', () => {
  it('scores PHI + shadow + no owner + never reviewed', () => {
    const agent = {
      phi_flag: true,
      pii_flag: true,
      shadow: true,
      owner: null,
      last_reviewed_at: null,
      framework_scores: { HIPAA: { status: 'fail' }, SOC2: { status: 'fail' } },
    };
    const frameworks = buildFrameworkScores(agent);
    const scored = scoreAgent({ ...agent, framework_scores: frameworks });
    assert.equal(scored.risk_score >= 75, true);
    assert.equal(scored.risk_level, 'critical');
    assert.ok(scored.risk_factors.some((f) => f.code === 'phi_access'));
    assert.ok(scored.risk_factors.some((f) => f.code === 'shadow_ai'));
  });

  it('returns low for clean sanctioned agent', () => {
    const agent = {
      phi_flag: false,
      pii_flag: false,
      shadow: false,
      owner: 'owner@acme.health',
      last_reviewed_at: '2026-07-01',
      framework_scores: {},
    };
    const scored = scoreAgent(agent);
    assert.equal(scored.risk_score, 0);
    assert.equal(scored.risk_level, 'low');
  });
});

describe('confidence', () => {
  it('maps source counts', () => {
    assert.equal(confidenceFromSources(['a']), 'candidate');
    assert.equal(confidenceFromSources(['a', 'b']), 'likely');
    assert.equal(confidenceFromSources(['a', 'b', 'c']), 'confirmed');
  });
});

describe('fingerprint', () => {
  it('is stable for same external identity', () => {
    const a = agentFingerprint({ category: 'cloud', external_id: 'azure:/sub/x', name: 'A' });
    const b = agentFingerprint({ category: 'cloud', external_id: 'azure:/sub/x', name: 'Renamed' });
    assert.equal(a, b);
  });

  it('respects tunable shadow weight', () => {
    const agent = { shadow: true, owner: 'x', last_reviewed_at: '2026-01-01', framework_scores: {} };
    const scored = scoreAgent(agent, { shadow: 40, phi: 20, pii: 10, compliance_per_fail: 3, compliance_cap: 20, no_owner: 10, never_reviewed: 10 });
    assert.equal(scored.risk_score, 40);
  });
});
