const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

const navigationController = require('../controllers/navigationController');
const routingService = require('../services/routingService');

function buildRes() {
  return httpMocks.createResponse({ eventEmitter: EventEmitter });
}

describe('Navigation Route Controller', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns simplified route payload with bearing', async () => {
    jest.spyOn(routingService, 'fetchRoute').mockResolvedValue({
      distanceMeters: 1200,
      durationSeconds: 300,
      coordinates: [[72.87, 19.07], [72.88, 19.08]],
      breadcrumbs: [[72.87, 19.07], [72.88, 19.08]],
      bearing: 56
    });

    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/navigation/route',
      query: {
        fromLat: '19.076',
        fromLng: '72.8777',
        toLat: '19.080',
        toLng: '72.880'
      }
    });
    const res = buildRes();

    await navigationController.getRoute(req, res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().data.bearing).toBe(56);
    expect(res._getJSONData().success).toBe(true);
  });
});
