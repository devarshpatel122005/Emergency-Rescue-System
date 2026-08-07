import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { ensureLeafletIcons, victimMarkerIcon, rescuerMarkerIcon } from './leafletIcons';

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

function AdminMap({ victimLocation, rescuerLocation, fallbackCenter }) {
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
      <MapContainer center={center} zoom={14} style={{ height: '320px', width: '100%' }}>
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
          <Marker position={[rescuerLocation.lat, rescuerLocation.lng]} icon={rescuerMarkerIcon}>
            <Popup>Assigned rescuer</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}

export default AdminMap;
