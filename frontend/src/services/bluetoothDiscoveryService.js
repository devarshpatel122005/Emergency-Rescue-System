function unsupported(reason) {
  return {
    supported: false,
    reason
  };
}

export function getSupportState() {
  if (!window.isSecureContext) {
    return unsupported('Web Bluetooth requires a secure context (HTTPS or localhost).');
  }

  if (!('bluetooth' in navigator)) {
    return unsupported('Web Bluetooth API is not available in this browser.');
  }

  return {
    supported: true,
    reason: 'available'
  };
}

export async function startScan() {
  const state = getSupportState();
  if (!state.supported) {
    return state;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: []
    });

    return {
      supported: true,
      peer: {
        id: device.id,
        name: device.name || 'unknown-device'
      },
      note: 'POC only: no full mesh transport implemented in Phase 2.'
    };
  } catch (error) {
    return {
      supported: true,
      error: error.message
    };
  }
}

export async function startAdvertise(payload = {}) {
  const state = getSupportState();
  if (!state.supported) {
    return state;
  }

  // Web Bluetooth advertisement APIs are limited and not standardized across browsers.
  return {
    supported: true,
    simulated: true,
    payload,
    note: 'Advertisement is simulated in Phase 2 POC; use LAN + server signaling fallback.'
  };
}
