import { io } from 'socket.io-client';

let socket = null;
let socketToken = null;

export const SOCKET_EVENTS = {
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_NEW: 'incident:new',
  INCIDENT_ASSIGNED: 'incident:assigned',
  INCIDENT_COMPLETED: 'incident:completed',
  RESCUER_ONLINE: 'rescuer:online',
  RESCUER_LOCATION: 'rescuer:location_update',
  RESCUER_STATUS: 'rescuer:status_update',
  RESCUER_ONSCENE: 'rescuer:onscene',
  VICTIM_LOCATION: 'victim:location_update',
  MESSAGE_NEW: 'message:new',
  TRANSCRIPT_NEW: 'transcript:new'
};

function getServerUrl() {
  const configured = import.meta.env.VITE_SIGNALING_SERVER_URL || import.meta.env.SIGNALING_SERVER_URL;
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    const port = import.meta.env.VITE_API_PORT || '4000';
    return `${protocol}//${host}:${port}`;
  }

  return 'http://localhost:4000';
}

export function connectSocket(token) {
  const normalizedToken = token || null;

  if (socket && socket.connected && socketToken === normalizedToken) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getServerUrl(), {
    transports: ['websocket'],
    auth: normalizedToken ? { token: normalizedToken } : {}
  });
  socketToken = normalizedToken;

  return socket;
}

export function getSocket() {
  return socket;
}

export function emitSocket(eventName, payload) {
  socket?.emit(eventName, payload);
}

export function onSocket(eventName, callback) {
  if (!socket) {
    return () => {};
  }

  socket.on(eventName, callback);
  return () => socket?.off(eventName, callback);
}

export function joinIncidentChannel(incidentId) {
  if (!incidentId) {
    return;
  }
  emitSocket('channel:join', { incidentId });
}

export function leaveIncidentChannel(incidentId) {
  if (!incidentId) {
    return;
  }
  emitSocket('channel:leave', { incidentId });
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
  socketToken = null;
}
