import api from './api';

export async function getKpis(filters = {}) {
  const response = await api.get('/analytics/kpis', { params: filters });
  return response.data.data;
}

export async function getResponseTimes(filters = {}) {
  const response = await api.get('/analytics/response-times', { params: filters });
  return response.data.data;
}
