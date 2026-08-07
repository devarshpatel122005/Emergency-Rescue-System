import { onSocket } from './socket';

export {
  connectSocket,
  disconnectSocket,
  getSocket,
  emitSocket,
  onSocket,
  joinIncidentChannel,
  leaveIncidentChannel
} from './socket';

export function announceDiscovery(payload) {
  // Discovery is disabled in this iteration. Kept as a no-op for compatibility.
  void payload;
}

export function onSocketEvent(eventName, callback) {
  return onSocket(eventName, callback);
}
