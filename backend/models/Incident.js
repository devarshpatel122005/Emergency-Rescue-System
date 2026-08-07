const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    anonymous: {
      type: Boolean,
      default: false
    },
    reporterUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    templateType: {
      type: String,
      enum: ['assault', 'fire', 'drowning', 'custom'],
      default: 'custom'
    },
    department: {
      type: String,
      enum: ['Fire', 'Assault', 'Medical', 'Other'],
      required: true
    },
    shortMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    details: {
      type: String,
      default: '',
      maxlength: 5000
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    status: {
      type: String,
      enum: ['new', 'assigned', 'resolved'],
      default: 'new'
    },
    deviceId: {
      type: String,
      required: true,
      trim: true
    },
    reporterLiveTracking: {
      type: Boolean,
      default: true
    },
    media: [
      {
        filename: String,
        path: String,
        mimeType: String,
        size: Number
      }
    ],
    assignedRescuer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, templateType: 1, department: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
