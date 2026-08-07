function parseList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeServer(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('stun:') || url.startsWith('turn:') || url.startsWith('turns:')) {
    return url;
  }

  return `stun:${url}`;
}

function buildIceServersFromEnv(env = process.env) {
  const stunServersRaw = parseList(env.STUN_SERVERS);
  const stunServers = stunServersRaw.length > 0
    ? stunServersRaw.map(normalizeServer).filter(Boolean)
    : ['stun:stun.l.google.com:19302'];

  const iceServers = [{ urls: stunServers }];

  if (env.TURN_SERVER) {
    const turnServer = env.TURN_SERVER.startsWith('turn:') || env.TURN_SERVER.startsWith('turns:')
      ? env.TURN_SERVER
      : `turn:${env.TURN_SERVER}`;

    iceServers.push({
      urls: [turnServer],
      username: env.TURN_USER || '',
      credential: env.TURN_PASS || ''
    });
  }

  return iceServers;
}

module.exports = {
  buildIceServersFromEnv
};
