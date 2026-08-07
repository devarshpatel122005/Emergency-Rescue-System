const Incident = require('../models/Incident');

function buildIncidentFilters(query = {}) {
  const filters = {};

  if (query.templateType) {
    filters.templateType = query.templateType;
  }

  if (query.status) {
    filters.status = query.status;
  }

  if (query.department) {
    filters.department = query.department;
  }

  if (query.from || query.to) {
    filters.createdAt = {};
    if (query.from) {
      filters.createdAt.$gte = new Date(query.from);
    }
    if (query.to) {
      filters.createdAt.$lte = new Date(query.to);
    }
  }

  return filters;
}

function toMinutes(from, to) {
  if (!from || !to) {
    return null;
  }

  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(diff) || diff < 0) {
    return null;
  }
  return diff / 60000;
}

function average(values) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function getKpis(req, res, next) {
  try {
    const filters = buildIncidentFilters(req.query);
    const incidents = await Incident.find(filters).sort({ createdAt: -1 }).lean();

    const assignmentTimes = [];
    const resolutionTimes = [];

    incidents.forEach((incident) => {
      const assignedAt = incident.updatedAt;
      const createdAt = incident.createdAt;

      if (incident.status === 'assigned') {
        const assignedMinutes = toMinutes(createdAt, assignedAt);
        if (assignedMinutes !== null) {
          assignmentTimes.push(assignedMinutes);
        }
      }

      if (incident.status === 'resolved') {
        const resolutionMinutes = toMinutes(createdAt, assignedAt);
        if (resolutionMinutes !== null) {
          resolutionTimes.push(resolutionMinutes);
        }
      }
    });

    const byStatus = incidents.reduce((acc, incident) => {
      acc[incident.status] = (acc[incident.status] || 0) + 1;
      return acc;
    }, {});

    const byDepartment = incidents.reduce((acc, incident) => {
      acc[incident.department] = (acc[incident.department] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        totals: {
          incidents: incidents.length,
          active: incidents.filter((item) => item.status !== 'resolved').length,
          resolved: incidents.filter((item) => item.status === 'resolved').length
        },
        averages: {
          assignmentMinutes: average(assignmentTimes),
          resolutionMinutes: average(resolutionTimes)
        },
        byStatus,
        byDepartment
      },
      message: 'Analytics KPIs fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function getResponseTimes(req, res, next) {
  try {
    const filters = buildIncidentFilters(req.query);
    const incidents = await Incident.find(filters)
      .select('status templateType department createdAt updatedAt shortMessage')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const rows = incidents.map((incident) => ({
      incidentId: String(incident._id),
      shortMessage: incident.shortMessage,
      status: incident.status,
      templateType: incident.templateType,
      department: incident.department,
      createdAt: incident.createdAt,
      assignmentMinutes: incident.status === 'assigned' ? toMinutes(incident.createdAt, incident.updatedAt) : null,
      resolutionMinutes: incident.status === 'resolved' ? toMinutes(incident.createdAt, incident.updatedAt) : null
    }));

    return res.json({
      success: true,
      data: rows,
      message: 'Response time dataset fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getKpis,
  getResponseTimes
};
