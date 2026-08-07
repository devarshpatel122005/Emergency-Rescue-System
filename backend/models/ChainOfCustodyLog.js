const mongoose = require('mongoose');

const chainOfCustodyLogSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true
    },
    evidence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      default: null
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorRole: {
      type: String,
      default: 'system'
    },
    previousHash: {
      type: String,
      default: ''
    },
    entryHash: {
      type: String,
      required: true
    },
    eventPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

chainOfCustodyLogSchema.index({ incident: 1, createdAt: 1 });
chainOfCustodyLogSchema.index({ evidence: 1, createdAt: 1 });

module.exports = mongoose.model('ChainOfCustodyLog', chainOfCustodyLogSchema);
