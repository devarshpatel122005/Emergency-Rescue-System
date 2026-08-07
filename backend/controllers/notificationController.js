const NotificationQueue = require('../models/NotificationQueue');
const { sendWithGateway } = require('../services/gatewayService');
const { incrementNotification } = require('../services/metricsService');

async function queueNotification(req, res, next) {
  try {
    const { incidentId = null, channel, target, payload = {} } = req.body;

    if (!channel || !target) {
      return res.status(400).json({
        success: false,
        message: 'channel and target are required.'
      });
    }

    const queued = await NotificationQueue.create({
      incident: incidentId,
      channel,
      target,
      payload,
      status: 'queued',
      provider: 'stub'
    });

    incrementNotification(channel, 'queued');

    return res.status(201).json({
      success: true,
      data: queued,
      message: 'Notification queued.'
    });
  } catch (error) {
    return next(error);
  }
}

async function triggerNotification(req, res, next) {
  try {
    const job = await NotificationQueue.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Notification job not found.'
      });
    }

    try {
      const result = await sendWithGateway(job);
      job.status = 'sent';
      job.lastError = '';
      await job.save();
      incrementNotification(job.channel, 'sent');

      return res.json({
        success: true,
        data: {
          job,
          result
        },
        message: 'Notification sent via stub gateway.'
      });
    } catch (gatewayError) {
      job.status = 'failed';
      job.lastError = gatewayError.message;
      await job.save();
      incrementNotification(job.channel, 'failed');

      return res.status(500).json({
        success: false,
        data: job,
        message: gatewayError.message
      });
    }
  } catch (error) {
    return next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const { status, channel } = req.query;
    const filters = {};

    if (status) {
      filters.status = status;
    }

    if (channel) {
      filters.channel = channel;
    }

    const jobs = await NotificationQueue.find(filters)
      .populate('incident')
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({
      success: true,
      data: jobs,
      message: 'Notification queue fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  queueNotification,
  triggerNotification,
  listNotifications
};
