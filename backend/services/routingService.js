function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeBearing(from, to) {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;

  const lng1 = toRad(from[0]);
  const lat1 = toRad(from[1]);
  const lng2 = toRad(to[0]);
  const lat2 = toRad(to[1]);

  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function simplifyWaypoints(coordinates, minDistanceMeters = 20) {
  if (!Array.isArray(coordinates) || coordinates.length <= 2) {
    return coordinates || [];
  }

  const simplified = [coordinates[0]];
  let last = coordinates[0];

  for (let index = 1; index < coordinates.length - 1; index += 1) {
    const point = coordinates[index];
    if (haversineMeters(last, point) >= minDistanceMeters) {
      simplified.push(point);
      last = point;
    }
  }

  simplified.push(coordinates[coordinates.length - 1]);
  return simplified;
}

async function fetchRoute({ fromLat, fromLng, toLat, toLng }) {
  const parsedFromLat = toNumber(fromLat);
  const parsedFromLng = toNumber(fromLng);
  const parsedToLat = toNumber(toLat);
  const parsedToLng = toNumber(toLng);

  if ([parsedFromLat, parsedFromLng, parsedToLat, parsedToLng].some((value) => value === null)) {
    const error = new Error('Invalid route coordinates.');
    error.statusCode = 400;
    throw error;
  }

  const url =
    'http://router.project-osrm.org/route/v1/driving/' +
    `${parsedFromLng},${parsedFromLat};${parsedToLng},${parsedToLat}` +
    '?overview=full&geometries=geojson&steps=true';

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`OSRM route request failed (${response.status}): ${body}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  if (payload.code !== 'Ok' || !Array.isArray(payload.routes) || payload.routes.length === 0) {
    const error = new Error(`No route found (${payload.code || 'UNKNOWN'}).`);
    error.statusCode = payload.code === 'NoRoute' ? 404 : 502;
    throw error;
  }

  const route = payload.routes[0];
  const coordinates = route.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    const error = new Error('Route geometry missing from OSRM response.');
    error.statusCode = 502;
    throw error;
  }

  const breadcrumbs = simplifyWaypoints(coordinates, 18);
  const firstTarget = breadcrumbs[1] || breadcrumbs[0];
  const bearing = computeBearing([parsedFromLng, parsedFromLat], firstTarget);

  // Parse steps from OSRM response
  const steps = [];
  if (route.legs && Array.isArray(route.legs)) {
    for (const leg of route.legs) {
      if (leg.steps && Array.isArray(leg.steps)) {
        for (const step of leg.steps) {
          const stepCoords = step.maneuver?.location || [0, 0];
          steps.push({
            id: `step-${steps.length}`,
            instruction: formatInstruction(step),
            distanceMeters: step.distance || 0,
            durationSeconds: step.duration || 0,
            bearingAfter: step.maneuver?.bearing_after || 0,
            location: { lat: stepCoords[1], lng: stepCoords[0] }
          });
        }
      }
    }
  }

  return {
    distanceMeters: Number(route.distance || 0),
    durationSeconds: Number(route.duration || 0),
    coordinates,
    breadcrumbs,
    bearing,
    steps
  };
}

function formatInstruction(step) {
  const maneuver = step.maneuver || {};
  const type = maneuver.type || '';
  const modifier = maneuver.modifier || '';
  const name = step.name || '';

  if (type === 'arrive') {
    return 'Arrive at destination';
  }
  if (type === 'depart') {
    return `Head ${modifier} ${name ? 'on ' + name : ''}`.trim();
  }
  if (type === 'turn') {
    return `Turn ${modifier} ${name ? 'on ' + name : ''}`.trim();
  }
  if (type === 'roundabout') {
    return `Take roundabout ${name ? 'on ' + name : ''}`.trim();
  }
  return `${type} ${modifier} ${name}`.trim();
}

module.exports = {
  fetchRoute,
  simplifyWaypoints,
  computeBearing
};
