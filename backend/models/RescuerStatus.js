const mongoose = require('mongoose');

const rescuerStatusSchema = new mongoose.Schema(
  {
    rescuer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
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
    online: {
      type: Boolean,
      default: false
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null
    },
    onScene: {
      type: Boolean,
      default: false
    },
    lastPing: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

rescuerStatusSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('RescuerStatus', rescuerStatusSchema);
