'use strict';

require('./config/loadEnv');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config');
const { csrfProtection } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const connectorRoutes = require('./routes/connectors');
const discoveryRoutes = require('./routes/discovery');
const policyRoutes = require('./routes/policies');
const playbookRoutes = require('./routes/playbooks');
const baaRoutes = require('./routes/baa');
const complianceRoutes = require('./routes/compliance');
const riskRoutes = require('./routes/risk');
const reportRoutes = require('./routes/reports');
const opsRoutes = require('./routes/ops');
const modelRoutes = require('./routes/models');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const enforcementRoutes = require('./routes/enforcement');
const settingsRoutes = require('./routes/settings');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: config.appUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'agentradar-api', env: config.env });
});

app.use('/api/auth', authRoutes);

// CSRF on mutating API routes (auth login/entra skipped inside middleware)
app.use('/api', csrfProtection);

app.use('/api/agents', agentRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/playbooks', playbookRoutes);
app.use('/api/baa', baaRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enforcement', enforcementRoutes);
app.use('/api/settings', settingsRoutes);

// Serve built SPA in production
const webDist = path.join(__dirname, '../../../apps/web/dist');
app.use(express.static(webDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(webDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`AgentRadar API listening on :${config.port}`);
  });
}

module.exports = app;
