const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    uploadedByRole: {
      type: String,
      default: 'anonymous'
    },
    deviceId: {
      type: String,
      default: ''
    },
    note: {
      type: String,
      default: ''
    },
    storagePath: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    geoHash: {
      type: String,
      default: ''
    },
    capturedAt: {
      type: Date,
      default: null
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    signedAt: {
      type: Date,
      required: true
    },
    signatureAlgo: {
      type: String,
      default: 'HMAC-SHA256'
    },
    signature: {
      type: String,
      required: true
    },
    metadataSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

evidenceSchema.index({ location: '2dsphere' });
evidenceSchema.index({ incident: 1, createdAt: -1 });

module.exports = mongoose.model('Evidence', evidenceSchema);
