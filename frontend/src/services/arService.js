export function checkSupport() {
  const hasAFrame = typeof window !== 'undefined' && Boolean(window.AFRAME);
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasGeolocation = !!navigator.geolocation;

  if (!hasAFrame) {
    return {
      supported: false,
      reason: 'A-Frame/AR.js runtime not loaded.'
    };
  }

  if (!hasGetUserMedia || !hasGeolocation) {
    return {
      supported: false,
      reason: 'Camera and geolocation support required for AR mode.'
    };
  }

  return {
    supported: true,
    reason: 'supported'
  };
}

export async function requestPermissions() {
  const support = checkSupport();
  if (!support.supported) {
    return support;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (error) {
    return {
      supported: false,
      reason: 'Camera permission denied.'
    };
  }

  try {
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000
      });
    });
  } catch (error) {
    return {
      supported: false,
      reason: 'Location permission denied.'
    };
  }

  return {
    supported: true,
    reason: 'granted'
  };
}

export function getFallbackPath() {
  return '/dashboard';
}
