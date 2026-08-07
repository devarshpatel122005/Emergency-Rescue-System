const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true
    },
    speakerType: {
      type: String,
      enum: ['admin', 'rescuer', 'victim'],
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

transcriptSchema.index({ incident: 1, at: -1 });

module.exports = mongoose.model('Transcript', transcriptSchema);
