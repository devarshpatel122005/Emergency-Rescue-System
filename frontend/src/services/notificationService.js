import api from './api';

export async function listNotifications(params = {}) {
  const response = await api.get('/notifications', { params });
  return response.data.data;
}

export async function queueNotification(payload) {
  const response = await api.post('/notifications/queue', payload);
  return response.data.data;
}

export async function triggerNotification(notificationId) {
  const response = await api.post(`/notifications/${notificationId}/trigger`);
  return response.data.data;
}
