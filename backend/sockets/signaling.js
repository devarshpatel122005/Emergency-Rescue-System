const Transcript = require('../models/Transcript');
const { incrementSocketEvent } = require('../services/metricsService');

const rooms = new Map();
const socketMembership = new Map();

function getRoomName(incidentId) {
  return `incident:${incidentId}`;
}

function ensureRoom(incidentId) {
  if (!rooms.has(incidentId)) {
    rooms.set(incidentId, new Map());
  }
  return rooms.get(incidentId);
}

function ensureMembership(socketId) {
  if (!socketMembership.has(socketId)) {
    socketMembership.set(socketId, new Set());
  }
  return socketMembership.get(socketId);
}

function toPeerView(metadata) {
  return {
    socketId: metadata.socketId,
    userId: metadata.userId,
    role: metadata.role,
    hasBackhaul: metadata.hasBackhaul,
    localIps: metadata.localIps,
    publicKey: metadata.publicKey,
    discoverySources: metadata.discoverySources
  };
}

function listPeers(incidentId) {
  const room = rooms.get(incidentId);
  if (!room) {
    return [];
  }

  return Array.from(room.values())
    .map(toPeerView)
    .sort((a, b) => a.socketId.localeCompare(b.socketId));
}

function emitRoomState(io, incidentId) {
  io.to(getRoomName(incidentId)).emit('channel:state', {
    incidentId,
    peers: listPeers(incidentId)
  });
}

function getMember(room, socketId) {
  return room ? room.get(socketId) : null;
}

function isMember(incidentId, socketId) {
  const room = rooms.get(incidentId);
  return room ? room.has(socketId) : false;
}

function removeFromIncident(io, socket, incidentId) {
  const room = rooms.get(incidentId);
  if (!room || !room.has(socket.id)) {
    return;
  }

  room.delete(socket.id);
  socket.leave(getRoomName(incidentId));

  io.to(getRoomName(incidentId)).emit('ptt:peer-left', {
    incidentId,
    peerId: socket.id
  });

  emitRoomState(io, incidentId);

  if (room.size === 0) {
    rooms.delete(incidentId);
  }

  const membership = socketMembership.get(socket.id);
  if (membership) {
    membership.delete(incidentId);
    if (membership.size === 0) {
      socketMembership.delete(socket.id);
    }
  }
}

function removeFromAllIncidents(io, socket) {
  const membership = socketMembership.get(socket.id);
  if (!membership) {
    return;
  }

  Array.from(membership).forEach((incidentId) => {
    removeFromIncident(io, socket, incidentId);
  });
}

function validateRelayTarget(socket, incidentId, to) {
  if (!incidentId || !to) {
    socket.emit('signaling:error', { message: 'incidentId and target peer are required.' });
    return false;
  }

  if (!isMember(incidentId, socket.id) || !isMember(incidentId, to)) {
    socket.emit('signaling:error', { message: 'Both peers must belong to the same incident room.' });
    return false;
  }

  return true;
}

function getSpeakerType(socket, requested) {
  if (requested && ['admin', 'rescuer', 'victim'].includes(requested)) {
    return requested;
  }

  if (!socket.user) {
    return 'victim';
  }

  if (socket.user.role === 'admin') {
    return 'admin';
  }
  if (socket.user.role === 'rescuer') {
    return 'rescuer';
  }

  return 'victim';
}

function attachSignalingHandlers(io, socket) {
  socket.on('channel:join', ({ incidentId, hasBackhaul = false, localIps = [], discoverySources = [] } = {}) => {
    incrementSocketEvent('channel:join');

    if (!incidentId) {
      return;
    }

    const room = ensureRoom(incidentId);
    const membership = ensureMembership(socket.id);

    socket.join(getRoomName(incidentId));

    room.set(socket.id, {
      socketId: socket.id,
      userId: socket.user ? socket.user.id : null,
      role: socket.user ? socket.user.role : null,
      hasBackhaul: Boolean(hasBackhaul),
      localIps: Array.isArray(localIps) ? localIps.slice(0, 10) : [],
      publicKey: null,
      discoverySources: Array.isArray(discoverySources) ? discoverySources.slice(0, 10) : []
    });

    membership.add(incidentId);

    const peers = listPeers(incidentId);
    const shouldOfferTo = peers
      .filter((peer) => peer.socketId !== socket.id)
      .filter((peer) => socket.id.localeCompare(peer.socketId) < 0)
      .map((peer) => peer.socketId);

    socket.emit('ptt:participants', {
      incidentId,
      peers,
      shouldOfferTo
    });

    const joinedPeer = toPeerView(getMember(room, socket.id));
    socket.to(getRoomName(incidentId)).emit('ptt:peer-joined', {
      incidentId,
      peer: joinedPeer
    });

    emitRoomState(io, incidentId);
  });

  socket.on('channel:leave', ({ incidentId } = {}) => {
    incrementSocketEvent('channel:leave');
    if (!incidentId) {
      return;
    }
    removeFromIncident(io, socket, incidentId);
  });

  socket.on('ptt:start', ({ incidentId, speakerType } = {}) => {
    incrementSocketEvent('ptt:start');
    if (!incidentId || !isMember(incidentId, socket.id)) {
      return;
    }

    io.to(getRoomName(incidentId)).emit('ptt:start', {
      incidentId,
      from: socket.id,
      speakerType: getSpeakerType(socket, speakerType),
      at: new Date().toISOString()
    });
  });

  socket.on('ptt:stop', ({ incidentId, speakerType } = {}) => {
    incrementSocketEvent('ptt:stop');
    if (!incidentId || !isMember(incidentId, socket.id)) {
      return;
    }

    io.to(getRoomName(incidentId)).emit('ptt:stop', {
      incidentId,
      from: socket.id,
      speakerType: getSpeakerType(socket, speakerType),
      at: new Date().toISOString()
    });
  });

  socket.on('transcript:send', async ({ incidentId, text, speakerType } = {}) => {
    incrementSocketEvent('transcript:send');

    if (!incidentId || !text || !isMember(incidentId, socket.id)) {
      return;
    }

    const transcript = await Transcript.create({
      incident: incidentId,
      text: String(text).trim(),
      speakerType: getSpeakerType(socket, speakerType),
      at: new Date()
    });

    io.to(getRoomName(incidentId)).emit('transcript:new', {
      _id: transcript._id,
      incident: transcript.incident,
      text: transcript.text,
      speakerType: transcript.speakerType,
      at: transcript.at
    });
  });

  socket.on('discovery:announce', ({ incidentId, hasBackhaul, localIps, discoverySources } = {}) => {
    incrementSocketEvent('discovery:announce');

    const room = rooms.get(incidentId);
    const member = getMember(room, socket.id);
    if (!member) {
      return;
    }

    if (hasBackhaul !== undefined) {
      member.hasBackhaul = Boolean(hasBackhaul);
    }

    if (Array.isArray(localIps)) {
      member.localIps = localIps.slice(0, 10);
    }

    if (Array.isArray(discoverySources)) {
      member.discoverySources = discoverySources.slice(0, 10);
    }

    emitRoomState(io, incidentId);
  });

  socket.on('crypto:public-key', ({ incidentId, publicKey } = {}) => {
    incrementSocketEvent('crypto:public-key');

    const room = rooms.get(incidentId);
    const member = getMember(room, socket.id);
    if (!member || !publicKey) {
      return;
    }

    member.publicKey = String(publicKey);

    socket.to(getRoomName(incidentId)).emit('crypto:public-key', {
      incidentId,
      peerId: socket.id,
      publicKey: member.publicKey
    });

    emitRoomState(io, incidentId);
  });

  socket.on('signaling:offer', ({ incidentId, to, sdp } = {}) => {
    incrementSocketEvent('signaling:offer');
    if (!validateRelayTarget(socket, incidentId, to)) {
      return;
    }

    io.to(to).emit('signaling:offer', {
      incidentId,
      from: socket.id,
      sdp
    });
  });

  socket.on('signaling:answer', ({ incidentId, to, sdp } = {}) => {
    incrementSocketEvent('signaling:answer');
    if (!validateRelayTarget(socket, incidentId, to)) {
      return;
    }

    io.to(to).emit('signaling:answer', {
      incidentId,
      from: socket.id,
      sdp
    });
  });

  socket.on('signaling:ice', ({ incidentId, to, candidate } = {}) => {
    incrementSocketEvent('signaling:ice');
    if (!validateRelayTarget(socket, incidentId, to)) {
      return;
    }

    io.to(to).emit('signaling:ice', {
      incidentId,
      from: socket.id,
      candidate
    });
  });

  socket.on('signaling:renegotiate', ({ incidentId, to, reason = 'update' } = {}) => {
    incrementSocketEvent('signaling:renegotiate');
    if (!validateRelayTarget(socket, incidentId, to)) {
      return;
    }

    io.to(to).emit('signaling:renegotiate', {
      incidentId,
      from: socket.id,
      reason
    });
  });

  socket.on('disconnect', () => {
    incrementSocketEvent('disconnect');
    removeFromAllIncidents(io, socket);
  });
}

module.exports = {
  attachSignalingHandlers,
  __internal: {
    rooms,
    socketMembership
  }
};
