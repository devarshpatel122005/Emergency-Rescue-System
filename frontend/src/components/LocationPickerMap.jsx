import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { ensureLeafletIcons, victimMarkerIcon } from './leafletIcons';

ensureLeafletIcons();

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }
    map.setView(center, 15, { animate: true });
  }, [map, center]);

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      onPick({ lat, lng });
    }
  });
  return null;
}

function DraggablePin({ value, onChange }) {
  const position = useMemo(() => [value.lat, value.lng], [value]);

  return (
    <Marker
      position={position}
      icon={victimMarkerIcon}
      draggable
      eventHandlers={{
        dragend: (event) => {
          const { lat, lng } = event.target.getLatLng();
          onChange({ lat, lng });
        }
      }}
    />
  );
}

function LocationPickerMap({ value, onChange, currentLocation }) {
  useEffect(() => {
    if (!value && currentLocation?.lat !== undefined && currentLocation?.lng !== undefined) {
      onChange(currentLocation);
    }
  }, [value, currentLocation, onChange]);

  const center = useMemo(() => {
    if (value?.lat !== undefined && value?.lng !== undefined) {
      return [value.lat, value.lng];
    }
    if (currentLocation?.lat !== undefined && currentLocation?.lng !== undefined) {
      return [currentLocation.lat, currentLocation.lng];
    }
    return [20.5937, 78.9629];
  }, [value, currentLocation]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={center} zoom={15} style={{ height: '300px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={center} />
        <MapClickHandler onPick={onChange} />

        {value?.lat !== undefined && value?.lng !== undefined ? (
          <DraggablePin value={value} onChange={onChange} />
        ) : null}
      </MapContainer>
    </div>
  );
}

export default LocationPickerMap;
