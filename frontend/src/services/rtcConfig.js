function parseList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIceUrl(url, fallbackPrefix = 'stun:') {
  if (!url) {
    return null;
  }

  if (url.startsWith('stun:') || url.startsWith('turn:') || url.startsWith('turns:')) {
    return url;
  }

  return `${fallbackPrefix}${url}`;
}

export function getIceServers() {
  const stunServers = parseList(import.meta.env.VITE_STUN_SERVERS || import.meta.env.STUN_SERVERS)
    .map((entry) => normalizeIceUrl(entry, 'stun:'));

  const iceServers = [
    {
      urls: stunServers.length > 0 ? stunServers : ['stun:stun.l.google.com:19302']
    }
  ];

  const turnServer = import.meta.env.VITE_TURN_SERVER || import.meta.env.TURN_SERVER;
  if (turnServer) {
    iceServers.push({
      urls: [normalizeIceUrl(turnServer, 'turn:')],
      username: import.meta.env.VITE_TURN_USER || import.meta.env.TURN_USER || '',
      credential: import.meta.env.VITE_TURN_PASS || import.meta.env.TURN_PASS || ''
    });
  }

  return iceServers;
}
