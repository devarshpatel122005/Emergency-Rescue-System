const OSRM_BASE_URL = 'https://router.project-osrm.org';

function normalizePoint(point) {
  if (!point) {
    return null;
  }

  const lat = Number(point.lat);
  const lng = Number(point.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function formatInstruction(step) {
  const maneuver = step?.maneuver || {};
  const roadName = step?.name ? ` on ${step.name}` : '';
  const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : '';

  if (maneuver.type === 'arrive') {
    return 'Arrive at destination';
  }

  if (maneuver.type === 'depart') {
    return `Head${modifier}${roadName}`.trim();
  }

  if (maneuver.type === 'roundabout') {
    return `Take roundabout${roadName}`.trim();
  }

  return `Turn${modifier}${roadName}`.trim();
}

function mapStep(step, index) {
  const coords = step?.maneuver?.location || [];

  return {
    id: `${index}-${coords[0] || 0}-${coords[1] || 0}`,
    instruction: formatInstruction(step),
    distanceMeters: Number(step?.distance || 0),
    durationSeconds: Number(step?.duration || 0),
    bearingAfter: Number(step?.maneuver?.bearing_after || 0),
    location: {
      lat: Number(coords[1] || 0),
      lng: Number(coords[0] || 0)
    }
  };
}

export function haversineMeters(a, b) {
  const p1 = normalizePoint(a);
  const p2 = normalizePoint(b);

  if (!p1 || !p2) {
    return Infinity;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);

  const m1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(p1.lat)) * Math.cos(toRadians(p2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const m2 = 2 * Math.atan2(Math.sqrt(m1), Math.sqrt(1 - m1));
  return earthRadius * m2;
}

export function buildOsmNavigationLink(from, to) {
  const source = normalizePoint(from);
  const target = normalizePoint(to);

  if (!source || !target) {
    return '#';
  }

  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${source.lat}%2C${source.lng}%3B${target.lat}%2C${target.lng}`;
}

export async function getDrivingRoute({ from, to }) {
  const source = normalizePoint(from);
  const target = normalizePoint(to);

  if (!source || !target) {
    throw new Error('Valid source and destination coordinates are required.');
  }

  const url = `${OSRM_BASE_URL}/route/v1/driving/${source.lng},${source.lat};${target.lng},${target.lat}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Navigation service unavailable.');
  }

  const payload = await response.json();
  if (!payload.routes || payload.routes.length === 0) {
    throw new Error('No route found.');
  }

  const route = payload.routes[0];
  const allSteps = (route.legs || []).flatMap((leg) => leg.steps || []);

  return {
    distanceMeters: Number(route.distance || 0),
    durationSeconds: Number(route.duration || 0),
    coordinates: (route.geometry?.coordinates || []).map((entry) => ({
      lat: Number(entry[1]),
      lng: Number(entry[0])
    })),
    steps: allSteps.map(mapStep)
  };
}
