const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      unique: true
    },
    rescuer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['assigned', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'assigned'
    },
    note: {
      type: String,
      default: ''
    },
    etaMinutes: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

assignmentSchema.index({ status: 1, rescuer: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
