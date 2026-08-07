import api from './api';
import {
  uploadEvidence as uploadEvidenceRequest,
  listEvidence as listEvidenceRequest,
  exportCasePacket as exportCasePacketRequest
} from './evidenceService';

export async function createIncident(payload) {
  const response = await api.post('/incidents', payload);
  return response.data.data;
}

export async function listIncidents(params = {}) {
  const response = await api.get('/incidents', { params });
  return response.data.data;
}

export async function getIncident(id) {
  const response = await api.get(`/incidents/${id}`);
  return response.data.data;
}

export async function updateIncident(id, payload) {
  const response = await api.patch(`/incidents/${id}`, payload);
  return response.data.data;
}

export async function completeIncident(id) {
  const response = await api.patch(`/incidents/${id}/complete`);
  return response.data.data;
}

export async function updateIncidentLocation(id, payload) {
  const response = await api.post(`/incidents/${id}/location`, payload);
  return response.data.data;
}

export async function assignIncident(id, payload) {
  const response = await api.post(`/incidents/${id}/assign`, payload);
  return response.data.data;
}

export async function uploadIncidentEvidence(id, payload) {
  return uploadEvidenceRequest(id, payload);
}

export async function listIncidentEvidence(id) {
  return listEvidenceRequest(id);
}

export async function exportIncidentCasePacket(id) {
  return exportCasePacketRequest(id);
}
