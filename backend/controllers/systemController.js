const mongoose = require('mongoose');
const { renderPrometheusText } = require('../services/metricsService');

function getHealthData() {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    db: dbStateMap[mongoose.connection.readyState] || 'unknown',
    localDiscoveryEnabled: String(process.env.LOCAL_DISCOVERY_ENABLED || 'true') === 'true',
    arEnabled: true,
    evidenceSigning: Boolean(process.env.EVIDENCE_SECRET || process.env.JWT_SECRET),
    azureSpeechConfigured: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
  };
}

function metrics(req, res) {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  return res.send(renderPrometheusText());
}

function healthcheck(req, res) {
  return res.json({
    success: true,
    data: getHealthData(),
    message: 'System healthcheck OK.'
  });
}

module.exports = {
  metrics,
  healthcheck,
  getHealthData
};
