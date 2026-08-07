import api from './api';

export async function registerRescuer(payload) {
  const formData = payload instanceof FormData ? payload : new FormData();

  if (!(payload instanceof FormData)) {
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
  }

  const response = await api.post('/rescuers/register', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.data;
}

export async function updateRescuerStatus(payload) {
  const response = await api.post('/rescuers/status', payload);
  return response.data.data;
}

export async function getNearbyRescuers(params = {}) {
  const response = await api.get('/rescuers/nearby', { params });
  return response.data.data;
}

export async function getMyRescuerStatus() {
  const response = await api.get('/rescuers/me/status');
  return response.data.data;
}

export async function getPendingRescuers() {
  const response = await api.get('/rescuers/pending');
  return response.data.data;
}

export async function approveRescuer(id) {
  const response = await api.post(`/rescuers/${id}/approve`);
  return response.data.data;
}

export async function rejectRescuer(id) {
  const response = await api.post(`/rescuers/${id}/reject`);
  return response.data.data;
}
