import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { ensureLeafletIcons, victimMarkerIcon, rescuerNavigationIcon } from './leafletIcons';

ensureLeafletIcons();

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }
    map.setView(center, 14, { animate: true });
  }, [map, center]);

  return null;
}

function RoutingLayer({ from, to }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) {
      return undefined;
    }

    const control = L.Routing.control({
      waypoints: [L.latLng(from.lat, from.lng), L.latLng(to.lat, to.lng)],
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#2563eb', opacity: 0.9, weight: 4 }]
      },
      createMarker: () => null
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, from, to]);

  return null;
}

function NavigationMap({ victimLocation, rescuerLocation, fallbackCenter }) {
  const center = useMemo(() => {
    if (victimLocation?.lat !== undefined && victimLocation?.lng !== undefined) {
      return [victimLocation.lat, victimLocation.lng];
    }
    if (fallbackCenter?.lat !== undefined && fallbackCenter?.lng !== undefined) {
      return [fallbackCenter.lat, fallbackCenter.lng];
    }
    if (rescuerLocation?.lat !== undefined && rescuerLocation?.lng !== undefined) {
      return [rescuerLocation.lat, rescuerLocation.lng];
    }
    return [20.5937, 78.9629];
  }, [victimLocation, rescuerLocation, fallbackCenter]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={center} zoom={14} style={{ height: '340px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={center} />

        {victimLocation?.lat !== undefined && victimLocation?.lng !== undefined ? (
          <Marker position={[victimLocation.lat, victimLocation.lng]} icon={victimMarkerIcon}>
            <Popup>Victim location</Popup>
          </Marker>
        ) : null}

        {rescuerLocation?.lat !== undefined && rescuerLocation?.lng !== undefined ? (
          <Marker position={[rescuerLocation.lat, rescuerLocation.lng]} icon={rescuerNavigationIcon}>
            <Popup>Rescuer location</Popup>
          </Marker>
        ) : null}

        {victimLocation && rescuerLocation ? <RoutingLayer from={rescuerLocation} to={victimLocation} /> : null}
      </MapContainer>
    </div>
  );
}

export default NavigationMap;
