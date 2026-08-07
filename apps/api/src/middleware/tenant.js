'use strict';

function tenantScope(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }
  req.tenantId = req.user.tenantId;
  next();
}

module.exports = { tenantScope };
