'use strict';

const started = Date.now();
let requests = 0;
const byStatus = {};

function requestLog(req, res, next) {
  const t0 = Date.now();
  const id = `req_${t0.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  res.on('finish', () => {
    requests += 1;
    byStatus[res.statusCode] = (byStatus[res.statusCode] || 0) + 1;
    const ms = Date.now() - t0;
    if (req.path.startsWith('/api')) {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'http',
          requestId: id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ms,
          tenantId: req.user?.tenantId || null,
        })
      );
    }
  });
  next();
}

function metrics() {
  return {
    uptime_s: Math.round((Date.now() - started) / 1000),
    requests,
    by_status: byStatus,
  };
}

module.exports = { requestLog, metrics };
