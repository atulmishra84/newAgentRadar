'use strict';

const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const db = require('../models/db');
const { encrypt, decrypt } = require('../utils/crypto');

function generateSecret() {
  return authenticator.generateSecret();
}

async function enrollStart(user) {
  const secret = generateSecret();
  const enc = encrypt(secret);
  await db.query(
    `UPDATE users SET mfa_secret_enc=$1, mfa_enabled=false, updated_at=NOW() WHERE id=$2`,
    [JSON.stringify(enc), user.id || user.sub]
  );
  const email = user.email || 'user';
  const otpauth = authenticator.keyuri(email, 'AgentRadar', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { secret, otpauth, qrDataUrl };
}

async function enrollConfirm(userId, code) {
  const { rows } = await db.query(`SELECT mfa_secret_enc FROM users WHERE id=$1`, [userId]);
  const row = rows[0];
  if (!row?.mfa_secret_enc) throw new Error('MFA enrollment not started');
  const enc = typeof row.mfa_secret_enc === 'string' ? JSON.parse(row.mfa_secret_enc) : row.mfa_secret_enc;
  const secret = decrypt(enc);
  const ok = authenticator.verify({ token: String(code || '').replace(/\s/g, ''), secret });
  if (!ok) throw new Error('Invalid MFA code');
  await db.query(`UPDATE users SET mfa_enabled=true, updated_at=NOW() WHERE id=$1`, [userId]);
  return true;
}

async function verifyUserCode(userId, code) {
  const { rows } = await db.query(
    `SELECT mfa_enabled, mfa_secret_enc FROM users WHERE id=$1`,
    [userId]
  );
  const row = rows[0];
  if (!row?.mfa_enabled || !row.mfa_secret_enc) return false;
  const enc = typeof row.mfa_secret_enc === 'string' ? JSON.parse(row.mfa_secret_enc) : row.mfa_secret_enc;
  const secret = decrypt(enc);
  return authenticator.verify({ token: String(code || '').replace(/\s/g, ''), secret });
}

async function disable(userId) {
  await db.query(
    `UPDATE users SET mfa_enabled=false, mfa_secret_enc=NULL, updated_at=NOW() WHERE id=$1`,
    [userId]
  );
}

module.exports = {
  generateSecret,
  enrollStart,
  enrollConfirm,
  verifyUserCode,
  disable,
};
