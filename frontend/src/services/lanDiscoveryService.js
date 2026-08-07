import { FEATURE_FLAGS } from './api';

let ws = null;
let reconnectTimer = null;

function getDiscoveryUrl() {
  return import.meta.env.VITE_LOCAL_DISCOVERY_URL || 'ws://localhost:4010';
}

function scheduleReconnect(startFn) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(() => {
    startFn();
  }, 2000);
}

export function startLanDiscovery({ peerId, incidentId, hasBackhaul, onPeers, onStatus }) {
  if (!FEATURE_FLAGS.localDiscoveryEnabled) {
    onStatus?.({ connected: false, reason: 'disabled' });
    return {
      stop() {}
    };
  }

  let heartbeat = null;
  let active = true;

  const connect = () => {
    if (!active) {
      return;
    }

    try {
      ws = new WebSocket(getDiscoveryUrl());
    } catch (error) {
      onStatus?.({ connected: false, reason: 'connection_error' });
      scheduleReconnect(connect);
      return;
    }

    ws.onopen = () => {
      onStatus?.({ connected: true, reason: 'connected' });
      ws.send(
        JSON.stringify({
          type: 'announce',
          peerId,
          incidentId,
          hasBackhaul,
          localIps: []
        })
      );

      heartbeat = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        ws.send(
          JSON.stringify({
            type: 'announce',
            peerId,
            incidentId,
            hasBackhaul,
            localIps: []
          })
        );
      }, 8000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'peers') {
          onPeers?.(Array.isArray(message.peers) ? message.peers : []);
        }
      } catch (error) {
        onStatus?.({ connected: true, reason: 'bad_message' });
      }
    };

    ws.onerror = () => {
      onStatus?.({ connected: false, reason: 'socket_error' });
    };

    ws.onclose = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      onStatus?.({ connected: false, reason: 'closed' });
      scheduleReconnect(connect);
    };
  };

  connect();

  return {
    stop() {
      active = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    }
  };
}
