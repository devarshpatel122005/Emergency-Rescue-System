import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { announceDiscovery, getSocket } from './socketService';
import { getIceServers } from './rtcConfig';
import { startLanDiscovery } from './lanDiscoveryService';

const peerConnections = new Map();
const statsListeners = new Set();

let localStream = null;
let currentIncidentId = null;
let localKeyPair = null;
let remoteKeys = new Map();
let dynamicIceServers = getIceServers();
let lanDiscoverySession = null;
let socketCleanupHandlers = [];
let dataMessageHandler = null;

const pttStats = {
  connected: false,
  talking: false,
  muted: false,
  peerCount: 0,
  path: 'server',
  localDiscoveryConnected: false,
  socketId: null
};

function emitStats() {
  for (const listener of statsListeners) {
    listener({ ...pttStats });
  }
}

function updatePeerCount() {
  pttStats.peerCount = Array.from(peerConnections.values()).filter((entry) => entry.connected).length;
  emitStats();
}

function attachSocketListener(eventName, handler) {
  const socket = getSocket();
  if (!socket) {
    return;
  }

  socket.on(eventName, handler);
  socketCleanupHandlers.push(() => socket.off(eventName, handler));
}

function resetSocketListeners() {
  socketCleanupHandlers.forEach((dispose) => dispose());
  socketCleanupHandlers = [];
}

function getAudioConstraints() {
  return {
    audio: {
      sampleRate: 48000,
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      latency: 0
    },
    video: false
  };
}

async function ensureLocalAudio() {
  if (localStream) {
    return localStream;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
  } catch (error) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  localStream.getAudioTracks().forEach((track) => {
    track.enabled = false;
  });

  return localStream;
}

function getIceConfig() {
  return {
    iceServers: dynamicIceServers && dynamicIceServers.length > 0 ? dynamicIceServers : getIceServers()
  };
}

async function applyAudioSenderHints(peerConnection) {
  const senders = peerConnection.getSenders();
  for (const sender of senders) {
    if (!sender.track || sender.track.kind !== 'audio' || !sender.getParameters || !sender.setParameters) {
      continue;
    }

    try {
      const parameters = sender.getParameters() || {};
      if (!parameters.encodings || parameters.encodings.length === 0) {
        parameters.encodings = [{}];
      }

      parameters.encodings[0].maxBitrate = 32000;
      parameters.encodings[0].priority = 'high';
      parameters.encodings[0].networkPriority = 'high';

      parameters.degradationPreference = 'maintain-framerate';
      await sender.setParameters(parameters);
    } catch (error) {
      // Ignore unsupported parameter hints.
    }
  }
}

function computeSharedKey(peerId) {
  const peer = peerConnections.get(peerId);
  const remotePublicKeyBase64 = remoteKeys.get(peerId);

  if (!peer || !localKeyPair || !remotePublicKeyBase64) {
    return;
  }

  try {
    const remotePublicKey = naclUtil.decodeBase64(remotePublicKeyBase64);
    peer.sharedKey = nacl.box.before(remotePublicKey, localKeyPair.secretKey);
  } catch (error) {
    // Keep waiting for valid key payload.
  }
}

function decryptMessage(peerId, packet) {
  const peer = peerConnections.get(peerId);
  if (!peer || !peer.sharedKey) {
    return null;
  }

  try {
    const nonce = naclUtil.decodeBase64(packet.nonce);
    const box = naclUtil.decodeBase64(packet.box);
    const clear = nacl.box.open.after(box, nonce, peer.sharedKey);
    if (!clear) {
      return null;
    }

    const decoded = naclUtil.encodeUTF8(clear);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

function setupDataChannel(peerId, channel) {
  const peer = peerConnections.get(peerId);
  if (!peer) {
    return;
  }

  peer.dataChannel = channel;
  channel.binaryType = 'arraybuffer';

  channel.onopen = () => {
    peer.connected = true;
    updatePeerCount();
  };

  channel.onclose = () => {
    peer.connected = false;
    updatePeerCount();
  };

  channel.onmessage = (event) => {
    let parsed;
    try {
      parsed = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    const payload = parsed.enc ? decryptMessage(peerId, parsed) : parsed;
    if (!payload || !dataMessageHandler) {
      return;
    }

    dataMessageHandler({
      fromPeerId: peerId,
      type: payload.type,
      payload: payload.payload
    });
  };
}

async function ensurePeer(peerId) {
  if (peerConnections.has(peerId)) {
    return peerConnections.get(peerId);
  }

  const stream = await ensureLocalAudio();
  const socket = getSocket();

  const peerConnection = new RTCPeerConnection(getIceConfig());
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  await applyAudioSenderHints(peerConnection);

  const peer = {
    peerId,
    peerConnection,
    dataChannel: null,
    sharedKey: null,
    connected: false
  };

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate || !socket || !currentIncidentId) {
      return;
    }

    socket.emit('signaling:ice', {
      incidentId: currentIncidentId,
      to: peerId,
      candidate: event.candidate
    });
  };

  peerConnection.onconnectionstatechange = () => {
    const connected = ['connected', 'completed'].includes(peerConnection.connectionState);
    peer.connected = connected;
    updatePeerCount();
  };

  peerConnection.ondatachannel = (event) => {
    setupDataChannel(peerId, event.channel);
  };

  peerConnections.set(peerId, peer);
  computeSharedKey(peerId);

  return peer;
}

async function createOfferForPeer(peerId) {
  const socket = getSocket();
  const peer = await ensurePeer(peerId);

  if (!peer.dataChannel) {
    const dataChannel = peer.peerConnection.createDataChannel('ers-data', {
      ordered: false,
      maxRetransmits: 0
    });
    setupDataChannel(peerId, dataChannel);
  }

  const offer = await peer.peerConnection.createOffer();
  await peer.peerConnection.setLocalDescription(offer);

  socket.emit('signaling:offer', {
    incidentId: currentIncidentId,
    to: peerId,
    sdp: offer
  });
}

function cleanupPeer(peerId) {
  const peer = peerConnections.get(peerId);
  if (!peer) {
    return;
  }

  peer.dataChannel?.close();
  peer.peerConnection.close();
  peerConnections.delete(peerId);
  remoteKeys.delete(peerId);
  updatePeerCount();
}

function shouldOfferToPeer(localSocketId, peerSocketId) {
  if (!localSocketId || !peerSocketId) {
    return false;
  }
  return localSocketId.localeCompare(peerSocketId) < 0;
}

function setTrackState() {
  if (!localStream) {
    return;
  }

  const enabled = pttStats.talking && !pttStats.muted;
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

function setupSocketHandlers() {
  resetSocketListeners();

  attachSocketListener('socket:ready', ({ socketId, iceServers }) => {
    pttStats.socketId = socketId;
    if (Array.isArray(iceServers) && iceServers.length > 0) {
      dynamicIceServers = iceServers;
    }
    emitStats();
  });

  attachSocketListener('channel:state', ({ peers = [] }) => {
    const selfId = pttStats.socketId;
    const remotePeers = peers.filter((peer) => peer.socketId !== selfId);
    pttStats.peerCount = remotePeers.length;
    emitStats();
  });

  attachSocketListener('ptt:participants', async ({ peers = [], shouldOfferTo = [] }) => {
    const selfId = pttStats.socketId;

    for (const peer of peers) {
      const peerId = typeof peer === 'string' ? peer : peer.socketId;
      if (!peerId || peerId === selfId) {
        continue;
      }

      await ensurePeer(peerId);
      if (shouldOfferTo.includes(peerId) || shouldOfferToPeer(selfId, peerId)) {
        await createOfferForPeer(peerId);
      }
    }
  });

  attachSocketListener('ptt:peer-joined', async ({ peer, peerId }) => {
    const joinedPeerId = peer?.socketId || peerId;
    if (!joinedPeerId || joinedPeerId === pttStats.socketId) {
      return;
    }

    await ensurePeer(joinedPeerId);
    if (shouldOfferToPeer(pttStats.socketId, joinedPeerId)) {
      await createOfferForPeer(joinedPeerId);
    }
  });

  attachSocketListener('ptt:peer-left', ({ peerId }) => {
    cleanupPeer(peerId);
  });

  attachSocketListener('crypto:public-key', ({ peerId, publicKey }) => {
    if (!peerId || !publicKey) {
      return;
    }

    remoteKeys.set(peerId, publicKey);
    computeSharedKey(peerId);
  });

  attachSocketListener('signaling:offer', async ({ from, sdp }) => {
    const socket = getSocket();
    const peer = await ensurePeer(from);

    await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await peer.peerConnection.createAnswer();
    await peer.peerConnection.setLocalDescription(answer);

    socket.emit('signaling:answer', {
      incidentId: currentIncidentId,
      to: from,
      sdp: answer
    });
  });

  attachSocketListener('signaling:answer', async ({ from, sdp }) => {
    const peer = peerConnections.get(from);
    if (!peer) {
      return;
    }

    await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  });

  attachSocketListener('signaling:ice', async ({ from, candidate }) => {
    const peer = await ensurePeer(from);
    await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });

  attachSocketListener('signaling:renegotiate', async ({ from }) => {
    if (!from) {
      return;
    }

    if (shouldOfferToPeer(pttStats.socketId, from)) {
      await createOfferForPeer(from);
    }
  });

}

export function registerDataMessageHandler(handler) {
  dataMessageHandler = handler;
}

export async function joinPTTChannel(incidentId) {
  const socket = getSocket();
  if (!socket) {
    throw new Error('Socket connection is required before joining PTT channel.');
  }

  currentIncidentId = incidentId;
  localKeyPair = nacl.box.keyPair();

  await ensureLocalAudio();
  setupSocketHandlers();

  pttStats.connected = true;
  pttStats.path = 'server';
  emitStats();

  socket.emit('channel:join', {
    incidentId,
    hasBackhaul: navigator.onLine,
    localIps: [],
    discoverySources: ['server']
  });

  socket.emit('crypto:public-key', {
    incidentId,
    publicKey: naclUtil.encodeBase64(localKeyPair.publicKey)
  });

  announceDiscovery({
    incidentId,
    hasBackhaul: navigator.onLine,
    localIps: [],
    discoverySources: ['server']
  });

  lanDiscoverySession = startLanDiscovery({
    peerId: pttStats.socketId || socket.id,
    incidentId,
    hasBackhaul: navigator.onLine,
    onPeers: (peers) => {
      if (Array.isArray(peers) && peers.length > 0) {
        pttStats.path = 'lan+server';
      }
      emitStats();
    },
    onStatus: (status) => {
      pttStats.localDiscoveryConnected = Boolean(status.connected);
      if (!status.connected) {
        pttStats.path = 'server';
      }
      emitStats();
    }
  });
}

export function leavePTTChannel() {
  const socket = getSocket();

  if (socket && currentIncidentId) {
    socket.emit('channel:leave', { incidentId: currentIncidentId });
  }

  if (lanDiscoverySession) {
    lanDiscoverySession.stop();
    lanDiscoverySession = null;
  }

  resetSocketListeners();

  for (const peerId of Array.from(peerConnections.keys())) {
    cleanupPeer(peerId);
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  currentIncidentId = null;
  localKeyPair = null;
  remoteKeys = new Map();

  pttStats.connected = false;
  pttStats.talking = false;
  pttStats.muted = false;
  pttStats.peerCount = 0;
  pttStats.localDiscoveryConnected = false;
  pttStats.path = 'server';
  emitStats();
}

export function toggleTalk(enabled) {
  pttStats.talking = Boolean(enabled);
  setTrackState();
  emitStats();
}

export function setMute(muted) {
  pttStats.muted = Boolean(muted);
  setTrackState();
  emitStats();
}

export function getPTTStats() {
  return { ...pttStats };
}

export function subscribePTTStats(listener) {
  statsListeners.add(listener);
  listener({ ...pttStats });

  return () => {
    statsListeners.delete(listener);
  };
}

export function sendEncryptedDataToPeer(peerId, type, payload) {
  const peer = peerConnections.get(peerId);
  if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open' || !peer.sharedKey) {
    return false;
  }

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const clear = naclUtil.decodeUTF8(JSON.stringify({ type, payload }));
  const box = nacl.box.after(clear, nonce, peer.sharedKey);

  peer.dataChannel.send(
    JSON.stringify({
      enc: true,
      nonce: naclUtil.encodeBase64(nonce),
      box: naclUtil.encodeBase64(box)
    })
  );

  return true;
}

export function sendEncryptedDataToPeers(type, payload) {
  let sent = 0;
  for (const peerId of peerConnections.keys()) {
    if (sendEncryptedDataToPeer(peerId, type, payload)) {
      sent += 1;
    }
  }

  return sent;
}
