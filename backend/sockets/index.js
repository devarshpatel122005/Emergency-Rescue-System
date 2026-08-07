const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { attachSignalingHandlers } = require('./signaling');
const { buildIceServersFromEnv } = require('../services/rtcConfigService');
const { changeActiveSocketConnections, incrementSocketEvent } = require('../services/metricsService');

const SUPPORTED_REALTIME_EVENTS = [
  'incident:new',
  'incident:assigned',
  'rescuer:location_update',
  'message:new',
  'transcript:new'
];

function parseHandshakeToken(socket) {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  if (authToken) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return null;
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  io.use((socket, next) => {
    const token = parseHandshakeToken(socket);
    if (!token) {
      socket.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      return next();
    } catch (error) {
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    incrementSocketEvent('connection');
    changeActiveSocketConnections(1);

    socket.emit('socket:ready', {
      socketId: socket.id,
      user: socket.user,
      iceServers: buildIceServersFromEnv(),
      supportedEvents: SUPPORTED_REALTIME_EVENTS
    });

    attachSignalingHandlers(io, socket);

    socket.on('disconnect', () => {
      changeActiveSocketConnections(-1);
    });
  });

  return io;
}

module.exports = {
  initSocket
};
