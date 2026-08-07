const DEVICE_KEY = 'ers_device_id';

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = `ers-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}
