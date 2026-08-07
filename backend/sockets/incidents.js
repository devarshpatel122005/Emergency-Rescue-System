const { emitEvent } = require('../services/socketService');

function emitIncidentNew(incident) {
  emitEvent('incident:new', incident);
  emitEvent('incident:created', incident);
}

function emitIncidentAssigned(payload) {
  emitEvent('incident:assigned', payload);
}

function emitIncidentUpdate(incident) {
  emitEvent('incident:update', incident);
}

function emitIncidentCompleted(incident) {
  emitEvent('incident:completed', incident);
}

function emitRescuerOnline(payload) {
  emitEvent('rescuer:online', payload);
}

function emitRescuerLocation(payload) {
  emitEvent('rescuer:location_update', payload);
}

function emitRescuerStatus(payload) {
  emitEvent('rescuer:status_update', payload);
}

function emitRescuerOnScene(payload) {
  emitEvent('rescuer:onscene', payload);
}

function emitVictimLocation(payload) {
  emitEvent('victim:location_update', payload);
}

function emitMessageNew(payload) {
  emitEvent('message:new', payload);
}

function emitTranscriptNew(payload) {
  emitEvent('transcript:new', payload);
}

module.exports = {
  emitIncidentNew,
  emitIncidentAssigned,
  emitIncidentUpdate,
  emitIncidentCompleted,
  emitRescuerOnline,
  emitRescuerLocation,
  emitRescuerStatus,
  emitRescuerOnScene,
  emitVictimLocation,
  emitMessageNew,
  emitTranscriptNew
};
