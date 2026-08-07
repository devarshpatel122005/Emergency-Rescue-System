const mongoose = require('mongoose');

const notificationQueueSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null
    },
    channel: {
      type: String,
      enum: ['sms', 'email'],
      required: true
    },
    target: {
      type: String,
      required: true,
      trim: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed'],
      default: 'queued'
    },
    provider: {
      type: String,
      default: 'stub'
    },
    lastError: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

notificationQueueSchema.index({ status: 1, channel: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationQueue', notificationQueueSchema);
