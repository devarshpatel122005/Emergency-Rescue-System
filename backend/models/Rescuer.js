const mongoose = require('mongoose');

const rescuerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    online: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy'],
      default: 'offline'
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
    lastSeenAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

rescuerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Rescuer', rescuerSchema);
