const Roadblock = require('../models/Roadblock');

async function listRoadblocks(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const filters = includeInactive ? {} : { active: true };
    const roadblocks = await Roadblock.find(filters).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: roadblocks,
      message: 'Roadblocks fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRoadblocks
};
