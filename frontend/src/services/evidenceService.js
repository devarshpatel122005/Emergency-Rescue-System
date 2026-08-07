import api from './api';

export async function uploadEvidence(incidentId, payload) {
  const formData = payload instanceof FormData ? payload : new FormData();

  if (!(payload instanceof FormData)) {
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
  }

  const response = await api.post(`/evidence/${incidentId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data.data;
}

export async function listEvidence(incidentId) {
  const response = await api.get(`/evidence/${incidentId}`);
  return response.data.data;
}

export async function exportCasePacket(incidentId) {
  const response = await api.get(`/incidents/${incidentId}/export-case-packet`, {
    responseType: 'blob'
  });

  const blob = response.data;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `incident-${incidentId}-case-packet.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);

  return true;
}
