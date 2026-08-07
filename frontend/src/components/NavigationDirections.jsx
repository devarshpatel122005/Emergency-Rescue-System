import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { buildOsmNavigationLink, getDrivingRoute, haversineMeters } from '../services/navigation';
import { ensureLeafletIcons, rescuerNavigationIcon, victimMarkerIcon } from './leafletIcons';

function MapCenterUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function arrowIcon(angle = 0) {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="font-size:18px;line-height:20px;color:#2563eb;transform:rotate(${Number(angle) || 0}deg);">➤</div>`
  });
}

function formatDistance(meters) {
  const km = Number(meters || 0) / 1000;
  return `${km.toFixed(2)} km`;
}

function formatEta(seconds) {
  const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function NavigationDirections({ from, to, fallbackCenter }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastRouteOriginRef = useRef(null);

  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const canRoute = Boolean(from && to && Number.isFinite(Number(from.lat)) && Number.isFinite(Number(from.lng)));

  const navigationUrl = useMemo(() => buildOsmNavigationLink(from, to), [from, to]);

  const mapCenter = useMemo(() => {
    if (to && Number.isFinite(Number(to.lat)) && Number.isFinite(Number(to.lng))) {
      return { lat: Number(to.lat), lng: Number(to.lng) };
    }

    if (from && Number.isFinite(Number(from.lat)) && Number.isFinite(Number(from.lng))) {
      return { lat: Number(from.lat), lng: Number(from.lng) };
    }

    if (fallbackCenter && Number.isFinite(Number(fallbackCenter.lat)) && Number.isFinite(Number(fallbackCenter.lng))) {
      return { lat: Number(fallbackCenter.lat), lng: Number(fallbackCenter.lng) };
    }

    return { lat: 20.5937, lng: 78.9629 };
  }, [from, to, fallbackCenter]);

  const refreshRoute = useCallback(
    async (force = false) => {
      if (!canRoute) {
        setRoute(null);
        return;
      }

      const current = {
        lat: Number(from.lat),
        lng: Number(from.lng)
      };

      if (!force && lastRouteOriginRef.current) {
        const movedMeters = haversineMeters(lastRouteOriginRef.current, current);
        if (movedMeters < 10) {
          return;
        }
      }

      setLoading(true);
      setError('');

      try {
        const result = await getDrivingRoute({
          from: current,
          to: {
            lat: Number(to.lat),
            lng: Number(to.lng)
          }
        });

        setRoute(result);
        lastRouteOriginRef.current = current;
      } catch (requestError) {
        setError(requestError.message || 'Failed to fetch route.');
      } finally {
        setLoading(false);
      }
    },
    [canRoute, from, to]
  );

  useEffect(() => {
    refreshRoute(true);
  }, [refreshRoute]);

  useEffect(() => {
    if (!canRoute) {
      return undefined;
    }

    const timer = setInterval(() => {
      refreshRoute(true);
    }, 10000);

    return () => clearInterval(timer);
  }, [canRoute, refreshRoute]);

  const routeLine = useMemo(() => {
    if (!route?.coordinates?.length) {
      return [];
    }
    return route.coordinates.map((point) => [point.lat, point.lng]);
  }, [route]);

  const stepMarkers = useMemo(() => {
    if (!route?.steps?.length) {
      return [];
    }
    return route.steps.slice(0, 20);
  }, [route]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-slate-100 px-2 py-1">Distance: {route ? formatDistance(route.distanceMeters) : '-'}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1">ETA: {route ? formatEta(route.durationSeconds) : '-'}</span>
        <a
          className={`rounded-md px-3 py-1.5 font-semibold ${navigationUrl === '#' ? 'bg-slate-200 text-slate-500' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
          href={navigationUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Navigation
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={15} className="h-[320px] w-full" scrollWheelZoom>
          <MapCenterUpdater center={mapCenter} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {to ? (
            <Marker position={[Number(to.lat), Number(to.lng)]} icon={victimMarkerIcon}>
              <Popup>Victim Location</Popup>
            </Marker>
          ) : null}

          {from ? (
            <Marker position={[Number(from.lat), Number(from.lng)]} icon={rescuerNavigationIcon}>
              <Popup>Rescuer Location</Popup>
            </Marker>
          ) : null}

          {routeLine.length > 0 ? <Polyline positions={routeLine} color="#2563eb" weight={5} opacity={0.8} /> : null}

          {stepMarkers.map((step) => (
            <Marker
              key={step.id}
              position={[Number(step.location.lat), Number(step.location.lng)]}
              icon={arrowIcon(step.bearingAfter)}
            >
              <Popup>{step.instruction}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading ? <p className="text-sm text-slate-500">Updating route...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="max-h-60 space-y-2 overflow-auto rounded-md border border-slate-200 bg-white p-3">
        {!route?.steps?.length ? (
          <p className="text-sm text-slate-500">Turn-by-turn directions will appear here when route is available.</p>
        ) : (
          route.steps.map((step, index) => (
            <div key={step.id} className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-sm font-semibold text-slate-800">
                {index + 1}. {step.instruction}
              </p>
              <p className="text-xs text-slate-600">
                {formatDistance(step.distanceMeters)} | {formatEta(step.durationSeconds)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default NavigationDirections;
