const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

const authRoutes = require('../routes/authRoutes');

function runRouter(router, req, res) {
  return new Promise((resolve, reject) => {
    res.on('end', resolve);
    router.handle(req, res, reject);
  });
}

describe('Auth Route Smoke', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_jwt_secret';
  });

  it('POST /register should reject missing fields', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/register',
      body: {
        email: 'missing-name@ers.test'
      }
    });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await runRouter(authRoutes, req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().success).toBe(false);
  });

  it('POST /register should reject invalid role', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/register',
      body: {
        name: 'Invalid Role User',
        email: 'invalid-role@ers.test',
        password: '123456',
        role: 'invalid_role'
      }
    });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await runRouter(authRoutes, req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().success).toBe(false);
  });

  it('POST /login should reject missing credentials', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/login',
      body: {}
    });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await runRouter(authRoutes, req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().success).toBe(false);
  });
});
