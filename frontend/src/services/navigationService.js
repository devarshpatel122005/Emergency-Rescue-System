import api from './api';

export async function getRoute(params) {
  const response = await api.get('/navigation/route', { params });
  return response.data.data;
}
