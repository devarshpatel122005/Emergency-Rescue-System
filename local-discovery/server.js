const { WebSocketServer } = require('ws');

const port = Number(process.env.LOCAL_DISCOVERY_PORT || 4010);
const ttlMs = Number(process.env.LOCAL_DISCOVERY_TTL_MS || 15000);

const peers = new Map();
const clients = new Set();

function broadcastPeers() {
  const now = Date.now();
  const snapshot = Array.from(peers.values()).filter((peer) => now - peer.updatedAt <= ttlMs);

  const payload = JSON.stringify({
    type: 'peers',
    peers: snapshot
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function cleanupStalePeers() {
  const now = Date.now();
  let removed = false;

  for (const [peerId, peer] of peers.entries()) {
    if (now - peer.updatedAt > ttlMs) {
      peers.delete(peerId);
      removed = true;
    }
  }

  if (removed) {
    broadcastPeers();
  }
}

const wss = new WebSocketServer({ port });

wss.on('connection', (socket) => {
  clients.add(socket);

  socket.on('message', (rawMessage) => {
    let message;
    try {
      message = JSON.parse(String(rawMessage));
    } catch (error) {
      return;
    }

    if (message.type !== 'announce' || !message.peerId || !message.incidentId) {
      return;
    }

    peers.set(message.peerId, {
      peerId: message.peerId,
      incidentId: message.incidentId,
      hasBackhaul: Boolean(message.hasBackhaul),
      localIps: Array.isArray(message.localIps) ? message.localIps.slice(0, 10) : [],
      updatedAt: Date.now()
    });

    broadcastPeers();
  });

  socket.on('close', () => {
    clients.delete(socket);
  });

  broadcastPeers();
});

setInterval(cleanupStalePeers, 5000);

console.log(`ERS local discovery server listening on ws://0.0.0.0:${port}`);
