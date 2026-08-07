const mongoose = require('mongoose');

const roadblockSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
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
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

roadblockSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Roadblock', roadblockSchema);
