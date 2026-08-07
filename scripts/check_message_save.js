const mongoose = require('mongoose');
const Message = require('../backend/models/Message');
const Incident = require('../backend/models/Incident');
require('dotenv').config({ path: './backend/.env' });

async function checkMessageSave() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ers-test';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Create test incident
    const testIncident = await Incident.create({
      shortMessage: 'Test incident for message validation',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.076]
      }
    });
    console.log('✓ Test incident created');

    // Create message with senderUser: "admin-static"
    const message = new Message({
      incident: testIncident._id,
      text: 'This is an admin message',
      senderUser: 'admin-static'
    });

    // Save message to database
    const savedMessage = await message.save();
    console.log('✓ Message saved successfully');

    // Verify transformations
    const checks = [];
    
    if (savedMessage.senderUser === null) {
      console.log('✓ senderUser is null');
      checks.push(true);
    } else {
      console.log('✗ senderUser is not null:', savedMessage.senderUser);
      checks.push(false);
    }

    if (savedMessage.senderName === 'Admin') {
      console.log('✓ senderName is "Admin"');
      checks.push(true);
    } else {
      console.log('✗ senderName is not "Admin":', savedMessage.senderName);
      checks.push(false);
    }

    if (savedMessage.senderRole === 'admin') {
      console.log('✓ senderRole is "admin"');
      checks.push(true);
    } else {
      console.log('✗ senderRole is not "admin":', savedMessage.senderRole);
      checks.push(false);
    }

    // Clean up test data
    await Message.deleteOne({ _id: savedMessage._id });
    await Incident.deleteOne({ _id: testIncident._id });
    console.log('✓ Test data cleaned up');

    // Final result
    if (checks.every(check => check === true)) {
      console.log('\n✓ All checks passed!');
      process.exit(0);
    } else {
      console.log('\n✗ Some checks failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkMessageSave();
