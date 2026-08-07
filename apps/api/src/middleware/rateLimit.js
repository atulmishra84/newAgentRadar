'use strict';

const crypto = require('crypto');
const { ensureRedis } = require('../models/redis');
const config = require('../config');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 20;

async function rateLimitAuth(req, res, next) {
  try {
    const redis = await ensureRedis();
    const ip = req.ip || 'unknown';
    const key = `rl:auth:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, WINDOW_MS);
    if (count > MAX_AUTH_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many authentication attempts. Try again later.' });
    }
    next();
  } catch (err) {
    console.warn('Rate limit skipped (Redis):', err.message);
    next();
  }
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Bearer JWT clients are not vulnerable to cookie CSRF
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return next();
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/entra') || req.originalUrl?.startsWith('/api/auth/login')) {
    return next();
  }
  const cookieToken = req.cookies?.ar_csrf;
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  next();
}

function issueCsrfCookie(res) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie('ar_csrf', token, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSecure ? 'strict' : 'lax',
    path: '/',
  });
  return token;
}

module.exports = { rateLimitAuth, csrfProtection, issueCsrfCookie };
