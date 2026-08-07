'use strict';

const config = require('../config');

async function forwardToSiem(event) {
  if (!config.siem.webhookUrl) {
    return { forwarded: false, reason: 'SIEM_WEBHOOK_URL not configured' };
  }
  try {
    const res = await fetch(config.siem.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'agentradar',
        timestamp: new Date().toISOString(),
        ...event,
      }),
    });
    return { forwarded: res.ok, status: res.status };
  } catch (err) {
    return { forwarded: false, error: err.message };
  }
}

module.exports = { forwardToSiem };
