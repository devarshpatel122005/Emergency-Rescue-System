import { useEffect, useMemo, useState } from 'react';
import { getLocationErrorMessage, requestCurrentLocation } from '../services/locationService';
import { haversineMeters } from '../services/navigation';

const AFRAME_SCRIPT_SOURCES = [
  'https://aframe.io/releases/1.5.0/aframe.min.js',
  'https://unpkg.com/aframe@1.5.0/dist/aframe.min.js'
];

const ARJS_SCRIPT_SOURCES = [
  'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.min.js',
  'https://unpkg.com/@ar-js-org/ar.js@3.4.5/aframe/build/aframe-ar.min.js'
];

function distanceLabel(currentLocation, targetLocation) {
  if (!currentLocation || !targetLocation) {
    return '';
  }

  const meters = haversineMeters(currentLocation, targetLocation);
  if (!Number.isFinite(meters)) {
    return '';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
}

function appendScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function loadScriptWithFallback(sources, checker) {
  if (checker()) {
    return;
  }

  let lastError = null;
  for (const source of sources) {
    try {
      await appendScript(source);
      if (checker()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load required AR runtime scripts.');
}

async function requestCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const error = new Error('Camera API is not supported on this browser.');
    error.code = 'camera_unsupported';
    throw error;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' }
    },
    audio: false
  });

  stream.getTracks().forEach((track) => track.stop());
}

function getArSupportIssue() {
  if (typeof window === 'undefined') {
    return '';
  }

  if (!window.isSecureContext && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    return 'AR on mobile requires HTTPS. Open this app over HTTPS to allow camera and location.';
  }

  if (!navigator.geolocation) {
    return 'Geolocation is not supported on this browser.';
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'Camera is not supported on this browser.';
  }

  return '';
}

function ARView({ victims = [], routePoints = [], currentLocation = null }) {
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function prepare() {
      const issue = getArSupportIssue();
      if (issue) {
        if (active) {
          setError(issue);
          setInitializing(false);
        }
        return;
      }

      try {
        await loadScriptWithFallback(AFRAME_SCRIPT_SOURCES, () => Boolean(window.AFRAME));
        await loadScriptWithFallback(
          ARJS_SCRIPT_SOURCES,
          () => Boolean(window.ARjs || window.AFRAME?.components?.['gps-entity-place'])
        );

        if (active) {
          setRuntimeReady(true);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'AR runtime failed to load.');
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    prepare();

    return () => {
      active = false;
    };
  }, []);

  const victimMarkers = useMemo(
    () =>
      victims
        .filter((entry) => Number.isFinite(Number(entry.lat)) && Number.isFinite(Number(entry.lng)))
        .map((entry, index) => ({
          ...entry,
          key: `victim-${index}`,
          distance: distanceLabel(currentLocation, entry)
        })),
    [victims, currentLocation]
  );

  const routeMarkers = useMemo(
    () =>
      routePoints
        .filter((entry) => Number.isFinite(Number(entry.lat)) && Number.isFinite(Number(entry.lng)))
        .map((entry, index) => ({
          ...entry,
          key: `route-${index}`,
          distance: distanceLabel(currentLocation, entry)
        })),
    [routePoints, currentLocation]
  );

  const startAr = async () => {
    setError('');

    try {
      await requestCameraPermission();
      await requestCurrentLocation({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      setSceneStarted(true);
    } catch (permissionError) {
      if (permissionError.code === 'camera_unsupported') {
        setError(permissionError.message);
      } else if (permissionError.name === 'NotAllowedError') {
        setError('Camera permission denied. Allow camera access and try again.');
      } else {
        setError(getLocationErrorMessage(permissionError));
      }
    }
  };

  if (initializing) {
    return <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">Preparing AR runtime...</div>;
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <p>{error}</p>
        <p className="text-xs text-red-600">Tip: On mobile, open this app over HTTPS and allow camera + location permissions.</p>
      </div>
    );
  }

  if (!runtimeReady) {
    return <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">AR runtime unavailable.</div>;
  }

  if (!sceneStarted) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm text-slate-700">AR is ready. Start AR to grant camera and location permissions.</p>
        <button type="button" className="btn-primary" onClick={startAr}>
          Start AR
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
      <div className="h-[420px] w-full">
        <a-scene
          key="rescuer-ar-scene"
          embedded
          vr-mode-ui="enabled: false"
          renderer="logarithmicDepthBuffer: true; antialias: true; alpha: true"
          arjs="sourceType: webcam; facingMode: environment; debugUIEnabled: false; gpsMinDistance: 1;"
        >
          {victimMarkers.map((marker) => (
            <a-entity key={marker.key} gps-entity-place={`latitude: ${marker.lat}; longitude: ${marker.lng};`}>
              <a-sphere radius="1.1" color="#dc2626" opacity="0.95"></a-sphere>
              <a-text
                value={`${marker.label || 'Victim'} ${marker.distance}`}
                color="#ffffff"
                align="center"
                position="0 2 0"
                scale="8 8 8"
              ></a-text>
            </a-entity>
          ))}

          {routeMarkers.map((marker) => (
            <a-entity key={marker.key} gps-entity-place={`latitude: ${marker.lat}; longitude: ${marker.lng};`}>
              <a-cone
                radius-bottom="0.9"
                radius-top="0"
                height="1.8"
                color="#facc15"
                rotation={`0 ${marker.bearing || 0} 90`}
              ></a-cone>
              <a-text
                value={`${marker.label || 'Route'} ${marker.distance}`}
                color="#fef08a"
                align="center"
                position="0 1.8 0"
                scale="7 7 7"
              ></a-text>
            </a-entity>
          ))}

          <a-camera gps-camera rotation-reader></a-camera>
        </a-scene>
      </div>
    </div>
  );
}

export default ARView;
