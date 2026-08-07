const MIN_SPEED_KMH = 5;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(origin, destination) {
  const [originLng, originLat] = origin;
  const [destLng, destLat] = destination;

  const earthRadiusKm = 6371;
  const dLat = toRadians(destLat - originLat);
  const dLng = toRadians(destLng - originLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(originLat)) * Math.cos(toRadians(destLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function computeEtaMinutes(distanceKm, speedKmh) {
  const validSpeed = Math.max(Number(speedKmh) || 0, MIN_SPEED_KMH);
  return (distanceKm / validSpeed) * 60;
}

function rankResponders(incidentLocation, rescuerStatuses) {
  return rescuerStatuses
    .map((status) => {
      const distanceKm = haversineDistanceKm(incidentLocation, status.location.coordinates);
      const etaMinutes = computeEtaMinutes(distanceKm, status.speedKmh);

      return {
        status,
        distanceKm,
        etaMinutes
      };
    })
    .sort((a, b) => {
      if (a.etaMinutes !== b.etaMinutes) {
        return a.etaMinutes - b.etaMinutes;
      }

      const aPing = new Date(a.status.lastPing || 0).getTime();
      const bPing = new Date(b.status.lastPing || 0).getTime();
      if (aPing !== bPing) {
        return bPing - aPing;
      }

      const aId = String(a.status.rescuer?._id || a.status.rescuer || '');
      const bId = String(b.status.rescuer?._id || b.status.rescuer || '');
      return aId.localeCompare(bId);
    });
}

module.exports = {
  rankResponders,
  haversineDistanceKm,
  computeEtaMinutes
};
