const mongoose = require('mongoose');

const relayItemSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    kind: {
      type: String,
      enum: ['incident', 'message', 'notification'],
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    sourceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sourcePeerId: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['accepted', 'rejected'],
      default: 'accepted'
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

relayItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RelayItem', relayItemSchema);
