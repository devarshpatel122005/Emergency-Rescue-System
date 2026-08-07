const { observeHttpRequest } = require('../services/metricsService');

function normalizePath(req) {
  const base = req.baseUrl || '';
  const routePath = req.route && req.route.path ? req.route.path : req.path;
  return `${base}${routePath}` || '/';
}

function metricsMiddleware(req, res, next) {
  res.on('finish', () => {
    observeHttpRequest(req.method, normalizePath(req), res.statusCode);
  });

  next();
}

module.exports = {
  metricsMiddleware
};
