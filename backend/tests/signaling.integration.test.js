const { attachSignalingHandlers } = require('../sockets/signaling');

class FakeIO {
  constructor() {
    this.sockets = new Map();
    this.roomMembers = new Map();
  }

  register(socket) {
    this.sockets.set(socket.id, socket);
  }

  joinRoom(roomName, socketId) {
    if (!this.roomMembers.has(roomName)) {
      this.roomMembers.set(roomName, new Set());
    }
    this.roomMembers.get(roomName).add(socketId);
  }

  leaveRoom(roomName, socketId) {
    const members = this.roomMembers.get(roomName);
    if (!members) {
      return;
    }
    members.delete(socketId);
    if (members.size === 0) {
      this.roomMembers.delete(roomName);
    }
  }

  emitToRoom(roomName, event, payload, excludeSocketId = null) {
    const members = this.roomMembers.get(roomName);
    if (!members) {
      return;
    }

    for (const memberId of members) {
      if (excludeSocketId && memberId === excludeSocketId) {
        continue;
      }
      const socket = this.sockets.get(memberId);
      socket?.serverEmit(event, payload);
    }
  }

  to(target) {
    const io = this;
    return {
      emit(event, payload) {
        if (target.startsWith('incident:')) {
          io.emitToRoom(target, event, payload);
          return;
        }

        const socket = io.sockets.get(target);
        socket?.serverEmit(event, payload);
      }
    };
  }
}

class FakeSocket {
  constructor(io, id, user) {
    this.io = io;
    this.id = id;
    this.user = user;
    this.handlers = new Map();
    this.received = [];
    this.io.register(this);
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  clientEmit(event, payload) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((handler) => handler(payload));
  }

  serverEmit(event, payload) {
    this.received.push({ event, payload });
  }

  emit(event, payload) {
    this.serverEmit(event, payload);
  }

  join(roomName) {
    this.io.joinRoom(roomName, this.id);
  }

  leave(roomName) {
    this.io.leaveRoom(roomName, this.id);
  }

  to(roomName) {
    const socket = this;
    return {
      emit(event, payload) {
        socket.io.emitToRoom(roomName, event, payload, socket.id);
      }
    };
  }
}

function findEvent(socket, eventName) {
  return socket.received.filter((entry) => entry.event === eventName);
}

describe('Socket Signaling Integration', () => {
  it('supports multi-peer room state and signaling relay', () => {
    const io = new FakeIO();
    const socketA = new FakeSocket(io, 'peer-a', { id: 'u-a', role: 'rescuer' });
    const socketB = new FakeSocket(io, 'peer-b', { id: 'u-b', role: 'rescuer' });
    const socketC = new FakeSocket(io, 'peer-c', { id: 'u-c', role: 'victim' });

    attachSignalingHandlers(io, socketA);
    attachSignalingHandlers(io, socketB);
    attachSignalingHandlers(io, socketC);

    socketA.clientEmit('channel:join', { incidentId: 'inc-1', hasBackhaul: true });
    socketB.clientEmit('channel:join', { incidentId: 'inc-1', hasBackhaul: false });

    const participantsA = findEvent(socketA, 'ptt:participants')[0];
    const participantsB = findEvent(socketB, 'ptt:participants')[0];

    expect(participantsA.payload.incidentId).toBe('inc-1');
    expect(participantsA.payload.shouldOfferTo).toEqual([]);
    expect(participantsB.payload.shouldOfferTo).toEqual([]);

    socketA.clientEmit('crypto:public-key', {
      incidentId: 'inc-1',
      publicKey: 'pub-key-a'
    });

    const cryptoEventsB = findEvent(socketB, 'crypto:public-key');
    expect(cryptoEventsB.length).toBe(1);
    expect(cryptoEventsB[0].payload.publicKey).toBe('pub-key-a');

    socketA.clientEmit('signaling:offer', {
      incidentId: 'inc-1',
      to: 'peer-b',
      sdp: { type: 'offer', sdp: 'abc' }
    });

    const offersForB = findEvent(socketB, 'signaling:offer');
    expect(offersForB.length).toBe(1);
    expect(offersForB[0].payload.from).toBe('peer-a');

    socketC.clientEmit('signaling:offer', {
      incidentId: 'inc-1',
      to: 'peer-b',
      sdp: { type: 'offer', sdp: 'invalid' }
    });

    const errorForC = findEvent(socketC, 'signaling:error');
    expect(errorForC.length).toBe(1);

    socketB.clientEmit('channel:leave', { incidentId: 'inc-1' });

    const peerLeftForA = findEvent(socketA, 'ptt:peer-left');
    expect(peerLeftForA.length).toBe(1);
    expect(peerLeftForA[0].payload.peerId).toBe('peer-b');
  });
});
