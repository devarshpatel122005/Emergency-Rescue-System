const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isSecureLocationContext() {
  if (typeof window === 'undefined') {
    return true;
  }

  if (window.isSecureContext) {
    return true;
  }

  const host = window.location?.hostname || '';
  return LOCAL_HOSTS.has(host);
}

function mapGeolocationCode(code) {
  if (code === 1) {
    return 'permission_denied';
  }
  if (code === 2) {
    return 'position_unavailable';
  }
  if (code === 3) {
    return 'timeout';
  }
  return 'unknown';
}

export async function requestCurrentLocation(options = {}) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    const error = new Error('Geolocation is not supported on this device.');
    error.code = 'unsupported';
    throw error;
  }

  if (!isSecureLocationContext()) {
    const error = new Error('Location requires HTTPS on mobile browsers.');
    error.code = 'insecure_context';
    throw error;
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy || 0)
        });
      },
      (geoError) => {
        const error = new Error(geoError.message || 'Unable to fetch location.');
        error.code = mapGeolocationCode(geoError.code);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
        ...options
      }
    );
  });
}

export function getLocationErrorMessage(error) {
  const code = error?.code || 'unknown';

  if (code === 'insecure_context') {
    return 'Location and camera need HTTPS on mobile. Use Report Different Location or open the app over HTTPS.';
  }

  if (code === 'permission_denied') {
    return 'Location permission denied. Allow location permission or use Report Different Location.';
  }

  if (code === 'position_unavailable') {
    return 'Current location is unavailable. Try again or use Report Different Location.';
  }

  if (code === 'timeout') {
    return 'Location request timed out. Try again or use Report Different Location.';
  }

  if (code === 'unsupported') {
    return 'Geolocation is not supported on this device.';
  }

  return error?.message || 'Unable to fetch location.';
}

