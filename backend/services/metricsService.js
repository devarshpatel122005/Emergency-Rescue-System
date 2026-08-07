const metricsState = {
  startedAt: Date.now(),
  httpRequests: new Map(),
  socketEvents: new Map(),
  relayItems: new Map(),
  autoassign: new Map(),
  notifications: new Map(),
  evidence: new Map(),
  casePacket: new Map(),
  arRoute: new Map(),
  speech: new Map(),
  activeSocketConnections: 0
};

function incrementMap(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function escapeLabel(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function renderCounter(map, metricName, labelKeys) {
  const lines = [];

  for (const [key, count] of map.entries()) {
    const parts = key.split('|');
    const labels = labelKeys
      .map((labelKey, index) => `${labelKey}="${escapeLabel(parts[index] || '')}"`)
      .join(',');

    lines.push(`${metricName}{${labels}} ${count}`);
  }

  return lines;
}

function observeHttpRequest(method, routePath, statusCode) {
  incrementMap(metricsState.httpRequests, `${method}|${routePath}|${statusCode}`);
}

function incrementSocketEvent(eventName) {
  incrementMap(metricsState.socketEvents, String(eventName));
}

function incrementRelay(kind, status) {
  incrementMap(metricsState.relayItems, `${kind}|${status}`);
}

function incrementAutoassign(result) {
  incrementMap(metricsState.autoassign, String(result));
}

function incrementNotification(channel, status) {
  incrementMap(metricsState.notifications, `${channel}|${status}`);
}

function incrementEvidenceMetric(operation, status) {
  incrementMap(metricsState.evidence, `${operation}|${status}`);
}

function incrementCasePacketMetric(operation, status) {
  incrementMap(metricsState.casePacket, `${operation}|${status}`);
}

function incrementMergeSplitMetric() {
  // Merge/split removed in this iteration.
}

function incrementArRouteMetric(operation, status) {
  incrementMap(metricsState.arRoute, `${operation}|${status}`);
}

function incrementSpeechMetric(operation, status) {
  incrementMap(metricsState.speech, `${operation}|${status}`);
}

function changeActiveSocketConnections(delta) {
  metricsState.activeSocketConnections += delta;
  if (metricsState.activeSocketConnections < 0) {
    metricsState.activeSocketConnections = 0;
  }
}

function renderPrometheusText() {
  const lines = [];

  lines.push('# HELP ers_http_requests_total Total HTTP requests');
  lines.push('# TYPE ers_http_requests_total counter');
  lines.push(...renderCounter(metricsState.httpRequests, 'ers_http_requests_total', ['method', 'path', 'status']));

  lines.push('# HELP ers_socket_events_total Total socket events observed');
  lines.push('# TYPE ers_socket_events_total counter');
  lines.push(...renderCounter(metricsState.socketEvents, 'ers_socket_events_total', ['event']));

  lines.push('# HELP ers_relay_items_total Total relay items by kind/status');
  lines.push('# TYPE ers_relay_items_total counter');
  lines.push(...renderCounter(metricsState.relayItems, 'ers_relay_items_total', ['kind', 'status']));

  lines.push('# HELP ers_autoassign_total Auto-assignment attempts');
  lines.push('# TYPE ers_autoassign_total counter');
  lines.push(...renderCounter(metricsState.autoassign, 'ers_autoassign_total', ['result']));

  lines.push('# HELP ers_notifications_total Notification processing counts');
  lines.push('# TYPE ers_notifications_total counter');
  lines.push(...renderCounter(metricsState.notifications, 'ers_notifications_total', ['channel', 'status']));

  lines.push('# HELP ers_evidence_total Evidence pipeline operations');
  lines.push('# TYPE ers_evidence_total counter');
  lines.push(...renderCounter(metricsState.evidence, 'ers_evidence_total', ['operation', 'status']));

  lines.push('# HELP ers_case_packet_total Case packet export operations');
  lines.push('# TYPE ers_case_packet_total counter');
  lines.push(...renderCounter(metricsState.casePacket, 'ers_case_packet_total', ['operation', 'status']));

  lines.push('# HELP ers_ar_route_total AR route generation operations');
  lines.push('# TYPE ers_ar_route_total counter');
  lines.push(...renderCounter(metricsState.arRoute, 'ers_ar_route_total', ['operation', 'status']));

  lines.push('# HELP ers_speech_total Azure speech operations');
  lines.push('# TYPE ers_speech_total counter');
  lines.push(...renderCounter(metricsState.speech, 'ers_speech_total', ['operation', 'status']));

  lines.push('# HELP ers_active_socket_connections Current connected sockets');
  lines.push('# TYPE ers_active_socket_connections gauge');
  lines.push(`ers_active_socket_connections ${metricsState.activeSocketConnections}`);

  lines.push('# HELP ers_process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE ers_process_uptime_seconds gauge');
  lines.push(`ers_process_uptime_seconds ${Math.floor(process.uptime())}`);

  return `${lines.join('\n')}\n`;
}

module.exports = {
  observeHttpRequest,
  incrementSocketEvent,
  incrementRelay,
  incrementAutoassign,
  incrementNotification,
  incrementEvidenceMetric,
  incrementCasePacketMetric,
  incrementMergeSplitMetric,
  incrementArRouteMetric,
  incrementSpeechMetric,
  changeActiveSocketConnections,
  renderPrometheusText,
  metricsState
};
