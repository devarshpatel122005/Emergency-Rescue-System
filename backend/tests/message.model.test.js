const mongoose = require('mongoose');
const Message = require('../models/Message');

describe('Message Model - Admin Message Handling', () => {
  const validIncidentId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should transform "admin-static" to null senderUser with Admin metadata in pre-save hook', () => {
    const message = new Message({
      incident: validIncidentId,
      text: 'Admin message',
      senderUser: 'admin-static'
    });

    // Manually trigger the pre-save hook
    const preSaveHook = message.schema.s.hooks._pres.get('save')[0].fn;
    preSaveHook.call(message, () => {});

    expect(message.senderUser).toBeNull();
    expect(message.senderName).toBe('Admin');
    expect(message.senderRole).toBe('admin');
  });

  test('should preserve existing senderUser when not "admin-static"', () => {
    const userId = new mongoose.Types.ObjectId();
    const message = new Message({
      incident: validIncidentId,
      text: 'User message',
      senderUser: userId,
      senderName: 'John Doe',
      senderRole: 'rescuer'
    });

    // Manually trigger the pre-save hook
    const preSaveHook = message.schema.s.hooks._pres.get('save')[0].fn;
    preSaveHook.call(message, () => {});

    expect(message.senderUser.toString()).toBe(userId.toString());
    expect(message.senderName).toBe('John Doe');
    expect(message.senderRole).toBe('rescuer');
  });

  test('should handle message with null senderUser', () => {
    const message = new Message({
      incident: validIncidentId,
      text: 'Anonymous message',
      senderUser: null,
      senderName: 'Guest',
      senderRole: 'victim'
    });

    // Manually trigger the pre-save hook
    const preSaveHook = message.schema.s.hooks._pres.get('save')[0].fn;
    preSaveHook.call(message, () => {});

    expect(message.senderUser).toBeNull();
    expect(message.senderName).toBe('Guest');
    expect(message.senderRole).toBe('victim');
  });

  test('should validate message schema allows null senderUser', () => {
    const message = new Message({
      incident: validIncidentId,
      text: 'Test message',
      senderUser: null
    });

    const validationError = message.validateSync();
    expect(validationError).toBeUndefined();
  });

  test('should validate required fields', () => {
    const message = new Message({
      senderUser: null
    });

    const validationError = message.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.incident).toBeDefined();
    expect(validationError.errors.text).toBeDefined();
  });

  test('should enforce text maxlength', () => {
    const longText = 'a'.repeat(5001);
    const message = new Message({
      incident: validIncidentId,
      text: longText,
      senderUser: null
    });

    const validationError = message.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.text).toBeDefined();
  });
});
