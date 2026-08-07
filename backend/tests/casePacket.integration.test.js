const { buildCasePacketPayload } = require('../services/casePacketService');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Message = require('../models/Message');
const Evidence = require('../models/Evidence');
const ChainOfCustodyLog = require('../models/ChainOfCustodyLog');

function createQueryResult(result) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject)
  };
  return query;
}

describe('Case Packet Integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('collects incident artifacts for case packet export', async () => {
    const incident = {
      _id: 'inc-1',
      toObject: () => ({ _id: 'inc-1', shortMessage: 'Fire' })
    };

    jest.spyOn(Incident, 'findById').mockReturnValueOnce(createQueryResult(incident));
    jest.spyOn(Assignment, 'findOne').mockReturnValueOnce(createQueryResult({ _id: 'asg-1' }));
    jest.spyOn(Message, 'find').mockReturnValueOnce(createQueryResult([{ _id: 'msg-1' }]));
    jest.spyOn(Evidence, 'find').mockReturnValueOnce(createQueryResult([{ _id: 'ev-1' }]));
    jest.spyOn(ChainOfCustodyLog, 'find').mockReturnValueOnce(createQueryResult([{ _id: 'log-1' }]));

    const payload = await buildCasePacketPayload('inc-1');

    expect(payload.incident._id).toBe('inc-1');
    expect(payload.messages).toHaveLength(1);
    expect(payload.evidenceItems).toHaveLength(1);
    expect(payload.custodyLogs).toHaveLength(1);
  });
});
