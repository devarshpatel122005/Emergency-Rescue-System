import api from './api';

export async function createMessage(payload) {
  const response = await api.post('/messages', payload);
  return response.data.data;
}

export async function listMessages(incidentId) {
  const response = await api.get('/messages', { params: { incidentId } });
  return response.data.data;
}
