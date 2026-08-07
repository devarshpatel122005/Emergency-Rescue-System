import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let initialized = false;

export function ensureLeafletIcons() {
  if (initialized) {
    return;
  }

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow
  });
  initialized = true;
}

function pinIcon(color) {
  return L.divIcon({
    className: '',
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
      </div>
    `
  });
}

function ringIcon(color) {
  return L.divIcon({
    className: '',
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
    html: `
      <div style="width:24px;height:24px;border-radius:999px;border:3px solid ${color};background:#ffffffcc;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>
    `
  });
}

export const victimMarkerIcon = pinIcon('#dc2626');
export const rescuerMarkerIcon = ringIcon('#dc2626');
export const rescuerNavigationIcon = pinIcon('#0f766e');
