#!/usr/bin/env node
const path = require('path');
const Module = require('module');

const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
process.env.NODE_PATH = process.env.NODE_PATH
  ? `${backendNodeModules}${path.delimiter}${process.env.NODE_PATH}`
  : backendNodeModules;
Module._initPaths();

const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/models/User');
const Rescuer = require('../backend/models/Rescuer');
const RescuerStatus = require('../backend/models/RescuerStatus');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ers';

const seedUsers = [
  {
    name: 'Rescuer One',
    email: 'rescuer1@ers.test',
    password: 'rescuerpass',
    role: 'rescuer',
    age: 28,
    gender: 'Male',
    blood_group: 'A+',
    phone: '2222222222',
    department: 'Fire'
  },
  {
    name: 'Rescuer Two',
    email: 'rescuer2@ers.test',
    password: 'rescuerpass',
    role: 'rescuer',
    age: 30,
    gender: 'Female',
    blood_group: 'B+',
    phone: '3333333333',
    department: 'Medical'
  },
  {
    name: 'Victim Demo',
    email: 'victim1@ers.test',
    password: 'victimpass',
    role: 'victim',
    age: 24,
    gender: 'Female',
    blood_group: 'O+',
    phone: '4444444444',
    department: ''
  }
];

async function upsertUser(user) {
  const passwordHash = await bcrypt.hash(user.password, 10);

  const doc = await User.findOneAndUpdate(
    { email: user.email },
    {
      name: user.name,
      email: user.email,
      passwordHash,
      role: user.role,
      age: user.age,
      gender: user.gender,
      blood_group: user.blood_group,
      phone: user.phone,
      department: user.department,
      approvalStatus: 'approved',
      idCardImage: user.role === 'rescuer' ? '/uploads/id-cards/seed-id-card.png' : '',
      status: user.role === 'rescuer' ? 'offline' : 'offline',
      online: false,
      isActive: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (doc.role === 'rescuer') {
    await Rescuer.findOneAndUpdate(
      { user: doc._id },
      {
        user: doc._id,
        department: doc.department,
        status: 'offline',
        online: false,
        location: { type: 'Point', coordinates: [0, 0] }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await RescuerStatus.findOneAndUpdate(
      { rescuer: doc._id },
      {
        rescuer: doc._id,
        online: false,
        location: { type: 'Point', coordinates: [0, 0] },
        incident: null,
        onScene: false,
        lastPing: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return doc;
}

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to ${mongoUri}`);

    const created = [];
    for (const user of seedUsers) {
      const document = await upsertUser(user);
      created.push({
        email: document.email,
        role: document.role,
        department: document.department || '-',
        profileComplete: Boolean(document.profileComplete)
      });
    }

    console.table(created);
    console.log('Seed completed.');
    console.log('Admin login is hardcoded: admin@ers.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
