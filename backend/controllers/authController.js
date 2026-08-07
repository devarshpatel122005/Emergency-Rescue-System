const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const adminConfig = require('../config/admin');

function buildUserPayload(userDoc) {
  if (typeof userDoc.toJSON === 'function') {
    const user = userDoc.toJSON();
    return {
      ...user,
      profileComplete: Boolean(user.age && user.gender && user.blood_group && /^\d{10}$/.test(String(user.phone || '')))
    };
  }

  return {
    ...userDoc,
    profileComplete: true
  };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function validatePhone(phone) {
  return /^\d{10}$/.test(String(phone || ''));
}

function validateProfileFields({ name, age, gender, blood_group, phone }) {
  if (!name || !age || !gender || !blood_group || !phone) {
    return 'name, age, gender, blood_group and phone are required.';
  }

  const parsedAge = Number(age);
  if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
    return 'age must be a valid number.';
  }

  if (!User.GENDERS.includes(gender)) {
    return `gender must be one of: ${User.GENDERS.join(', ')}`;
  }

  if (!User.BLOOD_GROUPS.includes(blood_group)) {
    return `blood_group must be one of: ${User.BLOOD_GROUPS.join(', ')}`;
  }

  if (!validatePhone(phone)) {
    return 'phone must be exactly 10 digits.';
  }

  return null;
}

async function register(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      role = 'victim',
      age,
      gender,
      blood_group,
      phone
    } = req.body;

    if (!name || !email || !password || !age || !gender || !blood_group || !phone) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, age, gender, blood_group and phone are required.'
      });
    }

    if (role !== 'victim') {
      return res.status(400).json({
        success: false,
        message: 'role must be victim.'
      });
    }

    if (!User.GENDERS.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: `gender must be one of: ${User.GENDERS.join(', ')}`
      });
    }

    if (!User.BLOOD_GROUPS.includes(blood_group)) {
      return res.status(400).json({
        success: false,
        message: `blood_group must be one of: ${User.BLOOD_GROUPS.join(', ')}`
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'phone must be exactly 10 digits.'
      });
    }

    const parsedAge = Number(age);
    if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
      return res.status(400).json({
        success: false,
        message: 'age must be a valid number.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === adminConfig.email.toLowerCase()) {
      return res.status(409).json({
        success: false,
        message: 'This email is reserved for system admin.'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'victim',
      age: parsedAge,
      gender,
      blood_group,
      phone: String(phone),
      department: '',
      online: false
    });

    const token = createToken(user);
    const safeUser = buildUserPayload(user);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: safeUser,
        profileComplete: safeUser.profileComplete
      },
      message: 'Registration successful.'
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === adminConfig.email.toLowerCase()) {
      if (password !== adminConfig.password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.'
        });
      }

      const adminUser = { ...adminConfig.profile };
      const token = createToken(adminUser);

      return res.json({
        success: true,
        data: {
          token,
          user: adminUser,
          profileComplete: true,
          requiresProfileCompletion: false
        },
        message: 'Login successful.'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    if (user.role === 'rescuer' && user.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account pending admin approval'
      });
    }

    const token = createToken(user);
    const safeUser = buildUserPayload(user);

    return res.json({
      success: true,
      data: {
        token,
        user: safeUser,
        profileComplete: safeUser.profileComplete,
        requiresProfileCompletion: !safeUser.profileComplete
      },
      message: 'Login successful.'
    });
  } catch (error) {
    return next(error);
  }
}

async function completeProfile(req, res, next) {
  try {
    const { age, gender, blood_group, phone } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const error = validateProfileFields({
      name: user.name,
      age,
      gender,
      blood_group,
      phone
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    user.age = Number(age);
    user.gender = gender;
    user.blood_group = blood_group;
    user.phone = String(phone);
    await user.save();

    const token = createToken(user);
    const safeUser = buildUserPayload(user);

    return res.json({
      success: true,
      data: {
        token,
        user: safeUser,
        profileComplete: true
      },
      message: 'Profile completed.'
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, age, gender, blood_group, phone } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin profile editing is disabled.'
      });
    }

    const error = validateProfileFields({ name, age, gender, blood_group, phone });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    user.name = String(name).trim();
    user.age = Number(age);
    user.gender = gender;
    user.blood_group = blood_group;
    user.phone = String(phone);
    await user.save();

    const token = createToken(user);
    const safeUser = buildUserPayload(user);

    return res.json({
      success: true,
      data: {
        token,
        user: safeUser,
        profileComplete: true
      },
      message: 'Profile updated.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  completeProfile,
  updateProfile
};
