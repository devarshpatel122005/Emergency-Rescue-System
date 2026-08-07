jest.mock('../models/Incident');
jest.mock('../models/Assignment');
jest.mock('../models/User');
jest.mock('../models/RescuerStatus');
jest.mock('../models/Rescuer');
jest.mock('../sockets/incidents', () => ({
  emitIncidentNew: jest.fn(),
  emitIncidentAssigned: jest.fn(),
  emitIncidentUpdate: jest.fn(),
  emitIncidentCompleted: jest.fn(),
  emitVictimLocation: jest.fn(),
  emitRescuerStatus: jest.fn()
}));

const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const RescuerStatus = require('../models/RescuerStatus');
const Rescuer = require('../models/Rescuer');
const { emitIncidentNew, emitIncidentAssigned } = require('../sockets/incidents');
const { createIncident } = require('../controllers/incidentController');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeQuery(data) {
  return {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    then(resolve) {
      return Promise.resolve(resolve(data));
    },
    catch() {
      return this;
    }
  };
}

describe('Incident create auto-assignment smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Incident.distinct.mockResolvedValue([]);
  });

  it('creates incident and returns no_rescuer_available when no online rescuer in department', async () => {
    const req = {
      body: {
        lat: 19.1,
        lng: 72.8,
        shortMessage: 'Fire emergency',
        deviceId: 'dev-1',
        department: 'Fire'
      },
      user: null
    };
    const res = makeRes();
    const next = jest.fn();

    const incidentDoc = {
      _id: 'inc-no-rescuer',
      save: jest.fn()
    };

    Incident.create.mockResolvedValue(incidentDoc);
    Incident.findById.mockReturnValue(
      makeQuery({ _id: 'inc-no-rescuer', shortMessage: 'Fire emergency', assignedRescuer: null })
    );
    User.find.mockReturnValue(makeQuery([]));

    await createIncident(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(User.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.no_rescuer_available).toBe(true);
    expect(emitIncidentNew).toHaveBeenCalledWith(expect.any(Object));
  });

  it('auto-assigns nearest online rescuer when department matches', async () => {
    const req = {
      body: {
        lat: 19.1,
        lng: 72.8,
        shortMessage: 'Medical emergency',
        deviceId: 'dev-2',
        department: 'Medical'
      },
      user: { id: 'admin-1', role: 'admin' }
    };
    const res = makeRes();
    const next = jest.fn();

    const incidentDoc = {
      _id: 'inc-assigned',
      save: jest.fn().mockResolvedValue(undefined)
    };

    Incident.create.mockResolvedValue(incidentDoc);

    const populatedIncident = {
      _id: 'inc-assigned',
      shortMessage: 'Medical emergency',
      assignedRescuer: { _id: 'rescuer-1', name: 'Rescuer One' }
    };

    Incident.findById
      .mockReturnValueOnce(makeQuery(populatedIncident))
      .mockReturnValueOnce(makeQuery(populatedIncident));

    User.find.mockReturnValue(makeQuery([{ _id: 'rescuer-1', department: 'Medical' }]));
    User.findOne.mockReturnValue(makeQuery({ _id: 'rescuer-1', status: 'online', approvalStatus: 'approved' }));

    RescuerStatus.find.mockReturnValue(
      makeQuery([
        {
          rescuer: { _id: 'rescuer-1', name: 'Rescuer One' },
          location: { coordinates: [72.8005, 19.1005] },
          lastPing: new Date()
        }
      ])
    );

    Assignment.findOneAndUpdate.mockReturnValue(
      makeQuery({
        _id: 'asg-1',
        incident: 'inc-assigned',
        rescuer: { _id: 'rescuer-1', name: 'Rescuer One' }
      })
    );

    User.findOneAndUpdate.mockResolvedValue({});
    Rescuer.findOneAndUpdate.mockResolvedValue({});
    RescuerStatus.findOneAndUpdate.mockReturnValue(makeQuery({}));

    await createIncident(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.no_rescuer_available).toBe(false);
    expect(payload.data.assignment).toBeTruthy();
    expect(emitIncidentAssigned).toHaveBeenCalledWith(expect.any(Object));
  });
});
