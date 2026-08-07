import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ARView from '../components/ARView';
import ARTurnByTurn from '../components/ARTurnByTurn';
import ARChatPanel from '../components/ARChatPanel';
import ARTranscript from '../components/ARTranscript';
import { listIncidents } from '../services/incidentService';
import { getLocationErrorMessage, requestCurrentLocation } from '../services/locationService';
import { getDrivingRoute, haversineMeters } from '../services/navigation';
import { updateRescuerStatus } from '../services/rescuerService';
import { onSocket } from '../services/socket';

function pickVictimLocation(incident) {
  if (!incident?.location?.coordinates || incident.location.coordinates.length !== 2) {
    return null;
  }

  return {
    lat: Number(incident.location.coordinates[1]),
    lng: Number(incident.location.coordinates[0])
  };
}

function RescuerAR({ user, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [activeIncidentId, setActiveIncidentId] = useState('');
  const [rescuerLocation, setRescuerLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [notice, setNotice] = useState('');
  const lastRouteOriginRef = useRef(null);

  const activeIncident = useMemo(
    () => incidents.find((item) => item._id === activeIncidentId) || incidents[0] || null,
    [incidents, activeIncidentId]
  );

  const victimLocation = useMemo(() => pickVictimLocation(activeIncident), [activeIncident]);

  const loadAssignments = useCallback(async () => {
    try {
      const rows = await listIncidents({ assignedTo: user._id });
      const activeRows = rows.filter((entry) => entry.status !== 'resolved');
      setIncidents(activeRows);
      if (!activeIncidentId && activeRows[0]) {
        setActiveIncidentId(activeRows[0]._id);
      }
    } catch (error) {
      setNotice(error.response?.data?.message || 'Failed to load assignments.');
    }
  }, [user._id, activeIncidentId]);

  const refreshRoute = useCallback(
    async (force = false) => {
      if (!rescuerLocation || !victimLocation) {
        setRoute(null);
        return;
      }

      if (!force && lastRouteOriginRef.current) {
        const movedMeters = haversineMeters(lastRouteOriginRef.current, rescuerLocation);
        if (movedMeters < 10) {
          return;
        }
      }

      setRouteLoading(true);
      setRouteError('');

      try {
        const result = await getDrivingRoute({
          from: rescuerLocation,
          to: victimLocation
        });

        setRoute(result);
        lastRouteOriginRef.current = rescuerLocation;
      } catch (error) {
        setRouteError(error.message || 'Unable to fetch route.');
      } finally {
        setRouteLoading(false);
      }
    },
    [rescuerLocation, victimLocation]
  );

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    const offAssigned = onSocket('incident:assigned', ({ incident, rescuer }) => {
      const assignedId = rescuer?._id || incident?.assignedRescuer?._id || incident?.assignedRescuer;
      if (String(assignedId) === String(user._id)) {
        loadAssignments();
      }
    });

    const offIncidentNew = onSocket('incident:new', () => {
      loadAssignments();
    });

    const offCompleted = onSocket('incident:completed', () => {
      loadAssignments();
    });

    const offVictimLocation = onSocket('victim:location_update', (payload) => {
      if (!activeIncident || payload.incidentId !== activeIncident._id) {
        return;
      }

      setIncidents((prev) =>
        prev.map((entry) => {
          if (entry._id !== payload.incidentId) {
            return entry;
          }

          return {
            ...entry,
            location: {
              type: 'Point',
              coordinates: [Number(payload.location.lng), Number(payload.location.lat)]
            }
          };
        })
      );
    });

    const offRescuerLocation = onSocket('rescuer:location_update', (payload) => {
      if (String(payload?.rescuer?._id) !== String(user._id)) {
        return;
      }

      const [lng, lat] = payload.location?.coordinates || [];
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setRescuerLocation({ lat: Number(lat), lng: Number(lng) });
      }
    });

    return () => {
      offAssigned();
      offIncidentNew();
      offCompleted();
      offVictimLocation();
      offRescuerLocation();
    };
  }, [user._id, activeIncident, loadAssignments]);

  useEffect(() => {
    let active = true;

    const pushLocation = async () => {
      try {
        const point = await requestCurrentLocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000
        });

        if (!active) {
          return;
        }

        setRescuerLocation(point);

        if (activeIncident?._id) {
          try {
            await updateRescuerStatus({
              online: true,
              incidentId: activeIncident._id,
              lat: point.lat,
              lng: point.lng
            });
          } catch (statusError) {
            // silent status fallback
          }
        }
      } catch (locationError) {
        if (!active) {
          return;
        }
        setNotice((previous) => previous || getLocationErrorMessage(locationError));
      }
    };

    pushLocation();
    const timer = setInterval(pushLocation, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeIncident?._id]);

  useEffect(() => {
    refreshRoute(false);
  }, [refreshRoute]);

  useEffect(() => {
    if (!rescuerLocation || !victimLocation) {
      return undefined;
    }

    const timer = setInterval(() => {
      refreshRoute(true);
    }, 10000);

    return () => clearInterval(timer);
  }, [rescuerLocation, victimLocation, refreshRoute]);

  const victimMarkers = useMemo(() => {
    if (!victimLocation || !activeIncident) {
      return [];
    }

    return [
      {
        lat: victimLocation.lat,
        lng: victimLocation.lng,
        label: activeIncident.shortMessage || 'Victim'
      }
    ];
  }, [victimLocation, activeIncident]);

  const routePoints = useMemo(() => {
    if (!route?.steps?.length) {
      return [];
    }

    return route.steps.slice(0, 30).map((step, index) => ({
      lat: Number(step.location.lat),
      lng: Number(step.location.lng),
      label: `Step ${index + 1}`,
      bearing: step.bearingAfter
    }));
  }, [route]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-brand-900">AR Mode</h1>
            <div className="flex gap-2">
              <Link className="btn-secondary" to="/rescuer">
                Back to Rescuer Panel
              </Link>
              <button type="button" className="btn-secondary" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>

          {activeIncident ? (
            <p className="mt-2 text-sm text-slate-700">
              Active Incident: <strong>{activeIncident.shortMessage}</strong> ({activeIncident.department})
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No active assigned incident right now.</p>
          )}
        </header>

        {notice ? <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">{notice}</div> : null}

        <ARView victims={victimMarkers} routePoints={routePoints} currentLocation={rescuerLocation} />

        <ARTurnByTurn route={route} loading={routeLoading} error={routeError} />

        <ARTranscript incidentId={activeIncident?._id} speakerType="rescuer" />

        <ARChatPanel incidentId={activeIncident?._id} user={user} />
      </div>
    </main>
  );
}

export default RescuerAR;
