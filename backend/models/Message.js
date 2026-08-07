const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true
    },
    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    senderName: {
      type: String,
      default: ''
    },
    senderId: {
      type: String,
      default: 'anonymous'
    },
    senderType: {
      type: String,
      enum: ['victim', 'rescuer', 'admin'],
      default: 'victim'
    },
    senderRole: {
      type: String,
      enum: ['victim', 'rescuer', 'admin', 'system'],
      default: 'victim'
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    type: {
      type: String,
      enum: ['text', 'transcript', 'system'],
      default: 'text'
    },
    isTranscript: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      default: null
    },
    language: {
      type: String,
      default: 'en-US'
    },
    source: {
      type: String,
      enum: ['webspeech', 'azure_batch', 'manual', 'system'],
      default: 'manual'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    draft: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ incident: 1, timestamp: 1 });

// Pre-save hook to transform "admin-static" to null senderUser with Admin metadata
messageSchema.pre('save', function(next) {
  if (this.senderUser === 'admin-static') {
    this.senderUser = null;
    this.senderName = 'Admin';
    this.senderRole = 'admin';
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
