const routingService = require('../services/routingService');
const { incrementArRouteMetric } = require('../services/metricsService');

async function getRoute(req, res, next) {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    const route = await routingService.fetchRoute({ fromLat, fromLng, toLat, toLng });
    incrementArRouteMetric('route', 'success');

    return res.json({
      success: true,
      data: route,
      message: 'Navigation route generated.'
    });
  } catch (error) {
    incrementArRouteMetric('route', 'failed');
    return next(error);
  }
}

module.exports = {
  getRoute
};
