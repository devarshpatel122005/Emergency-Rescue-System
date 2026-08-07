const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

const healthRoutes = require('../routes/healthRoutes');

function runRouter(router, req, res) {
  return new Promise((resolve, reject) => {
    res.on('end', resolve);
    router.handle(req, res, reject);
  });
}

describe('Health Route Smoke', () => {
  it('GET / should return 200', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/'
    });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await runRouter(healthRoutes, req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().success).toBe(true);
    expect(res._getJSONData().data.status).toBe('ok');
  });
});
