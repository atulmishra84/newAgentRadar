'use strict';

const required = (key, fallback) => {
  const v = process.env[key];
  if (v !== undefined && v !== '') return v;
  if (fallback !== undefined) return fallback;
  return '';
};

module.exports = {
  env: required('NODE_ENV', 'development'),
  port: parseInt(required('PORT', '4000'), 10),
  appUrl: required('APP_URL', 'http://localhost:5173'),
  postgres: {
    host: required('POSTGRES_HOST', 'localhost'),
    port: parseInt(required('POSTGRES_PORT', '5432'), 10),
    database: required('POSTGRES_DB', 'agentradar'),
    user: required('POSTGRES_USER', 'agentradar'),
    password: required('POSTGRES_PASSWORD', 'agentradar'),
  },
  redis: {
    host: required('REDIS_HOST', 'localhost'),
    port: parseInt(required('REDIS_PORT', '6379'), 10),
  },
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me-agentradar-jwt'),
  encryptionKey: required(
    'ENCRYPTION_KEY',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  ),
  cookieSecure: required('COOKIE_SECURE', 'false') === 'true',
  discoveryDemoMode: required('DISCOVERY_DEMO_MODE', 'true') === 'true',
  azure: {
    tenantId: required('AZURE_TENANT_ID'),
    clientId: required('AZURE_CLIENT_ID'),
    clientSecret: required('AZURE_CLIENT_SECRET'),
    subscriptionId: required('AZURE_SUBSCRIPTION_ID'),
  },
  entra: {
    tenantId: required('ENTRA_TENANT_ID'),
    clientId: required('ENTRA_CLIENT_ID'),
    clientSecret: required('ENTRA_CLIENT_SECRET'),
    redirectUri: required('ENTRA_REDIRECT_URI', 'http://localhost:4000/api/auth/entra/callback'),
  },
  siem: {
    webhookUrl: required('SIEM_WEBHOOK_URL'),
  },
};
