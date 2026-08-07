const mongoose = require('mongoose');

const roles = ['rescuer', 'admin', 'victim'];
const approvalStatuses = ['pending', 'approved', 'rejected'];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];
const rescuerStatuses = ['online', 'offline', 'busy'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: roles,
      default: 'victim'
    },
    age: {
      type: Number,
      required: function requiredAge() {
        return this.role !== 'admin';
      },
      min: 1,
      max: 120
    },
    gender: {
      type: String,
      enum: genders,
      required: function requiredGender() {
        return this.role !== 'admin';
      }
    },
    blood_group: {
      type: String,
      enum: bloodGroups,
      required: function requiredBloodGroup() {
        return this.role !== 'admin';
      }
    },
    phone: {
      type: String,
      required: function requiredPhone() {
        return this.role !== 'admin';
      },
      validate: {
        validator(value) {
          return /^\d{10}$/.test(String(value || ''));
        },
        message: 'phone must be exactly 10 digits.'
      }
    },
    department: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: rescuerStatuses,
      default: function defaultRescuerStatus() {
        return this.role === 'rescuer' ? 'offline' : 'offline';
      }
    },
    approvalStatus: {
      type: String,
      enum: approvalStatuses,
      default: function defaultApprovalStatus() {
        return this.role === 'rescuer' ? 'pending' : 'approved';
      }
    },
    idCardImage: {
      type: String,
      default: ''
    },
    online: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.pre('validate', function syncOnlineAndStatus(next) {
  if (this.role !== 'rescuer') {
    this.online = false;
    if (!this.status) {
      this.status = 'offline';
    }
    return next();
  }

  if (this.isModified('status')) {
    this.online = this.status !== 'offline';
    return next();
  }

  if (this.isModified('online')) {
    this.status = this.online ? 'online' : 'offline';
    return next();
  }

  if (!this.status) {
    this.status = this.online ? 'online' : 'offline';
  }
  this.online = this.status !== 'offline';
  return next();
});

userSchema.virtual('profileComplete').get(function profileComplete() {
  return Boolean(this.age && this.gender && this.blood_group && /^\d{10}$/.test(String(this.phone || '')));
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
module.exports.ALLOWED_ROLES = roles;
module.exports.APPROVAL_STATUSES = approvalStatuses;
module.exports.BLOOD_GROUPS = bloodGroups;
module.exports.GENDERS = genders;
module.exports.RESCUER_STATUSES = rescuerStatuses;
