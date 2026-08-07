import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import PTTButton from '../components/PTTButton';
import ChatPanel from '../components/ChatPanel';
import AdminMap from '../components/AdminMap';
import EvidenceViewer from '../components/EvidenceViewer';
import { completeIncident, listIncidentEvidence, listIncidents } from '../services/incidentService';
import { onSocket } from '../services/socket';

function formatCoordinatePair(point) {
  if (!point || !Array.isArray(point.coordinates) || point.coordinates.length !== 2) {
    return '-';
  }

  return `${point.coordinates[1].toFixed(5)}, ${point.coordinates[0].toFixed(5)}`;
}

function formatLatLng(location) {
  if (!location || location.lat === undefined || location.lng === undefined) {
    return '-';
  }
  return `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`;
}

function AdminDashboard({ user, onLogout }) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [notice, setNotice] = useState('');
  const [rescuerLocation, setRescuerLocation] = useState(null);
  const [victimLocation, setVictimLocation] = useState(null);
  const [evidenceRows, setEvidenceRows] = useState([]);
  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);

  const selectedIncident = useMemo(
    () => incidents.find((item) => item._id === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );

  const victimMapLocation = useMemo(() => {
    if (victimLocation?.lat !== undefined && victimLocation?.lng !== undefined) {
      return victimLocation;
    }
    if (selectedIncident?.location?.coordinates?.length === 2) {
      return {
        lat: selectedIncident.location.coordinates[1],
        lng: selectedIncident.location.coordinates[0]
      };
    }
    return null;
  }, [victimLocation, selectedIncident]);

  const load = async () => {
    const data = await listIncidents();
    setIncidents(data.filter((item) => item.status !== 'resolved'));
  };

  const loadEvidence = async (incidentId) => {
    const rows = await listIncidentEvidence(incidentId);
    setEvidenceRows(rows);
  };

  useEffect(() => {
    load().catch(() => setNotice(t('loadIncidentsFailed')));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        // silent
      }
    );
  }, [t]);

  useEffect(() => {
    const upsertIncident = (incoming) => {
      if (!incoming || !incoming._id) {
        return;
      }

      setIncidents((prev) => {
        const exists = prev.some((item) => item._id === incoming._id);
        if (incoming.status === 'resolved') {
          return prev.filter((item) => item._id !== incoming._id);
        }
        if (exists) {
          return prev.map((item) => (item._id === incoming._id ? incoming : item));
        }
        return [incoming, ...prev];
      });
    };

    const offCreated = onSocket('incident:created', upsertIncident);
    const offNew = onSocket('incident:new', upsertIncident);
    const offAssigned = onSocket('incident:assigned', (payload) => upsertIncident(payload.incident));
    const offUpdate = onSocket('incident:update', upsertIncident);
    const offCompleted = onSocket('incident:completed', (incident) => upsertIncident(incident));

    const offRescuerLocation = onSocket('rescuer:location_update', (payload) => {
      const rescuerId = payload.rescuer?._id;
      if (!selectedIncident?.assignedRescuer?._id || selectedIncident.assignedRescuer._id !== rescuerId) {
        return;
      }
      const [lng, lat] = payload.location?.coordinates || [];
      if (lat !== undefined && lng !== undefined) {
        setRescuerLocation({ lat, lng, onScene: Boolean(payload.onScene) });
      }
    });

    const offRescuerStatus = onSocket('rescuer:status_update', (payload) => {
      setIncidents((prev) =>
        prev.map((incident) => {
          const assignedId = incident.assignedRescuer?._id || incident.assignedRescuer;
          if (!assignedId || String(assignedId) !== String(payload.rescuerId)) {
            return incident;
          }
          return {
            ...incident,
            assignedRescuer: {
              ...(incident.assignedRescuer || {}),
              _id: String(assignedId),
              status: payload.status,
              online: payload.online
            }
          };
        })
      );
    });

    const offVictimLocation = onSocket('victim:location_update', (payload) => {
      if (!selectedIncident || payload.incidentId !== selectedIncident._id) {
        return;
      }
      setVictimLocation(payload.location);
    });

    const offOnScene = onSocket('rescuer:onscene', (payload) => {
      if (!selectedIncident || payload.incidentId !== selectedIncident._id) {
        return;
      }
      setRescuerLocation((prev) => ({ ...(prev || {}), onScene: true }));
    });

    return () => {
      offCreated();
      offNew();
      offAssigned();
      offUpdate();
      offCompleted();
      offRescuerLocation();
      offRescuerStatus();
      offVictimLocation();
      offOnScene();
    };
  }, [selectedIncident]);

  useEffect(() => {
    if (incidents.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(incidents[0]._id);
    }
    if (selectedIncidentId && !incidents.some((item) => item._id === selectedIncidentId)) {
      setSelectedIncidentId(incidents[0]?._id || '');
    }
  }, [incidents, selectedIncidentId]);

  useEffect(() => {
    setRescuerLocation(null);
    setVictimLocation(null);
    setEvidenceRows([]);
    setEvidenceVisible(false);
  }, [selectedIncidentId]);

  const handleViewEvidence = async () => {
    if (!selectedIncident) {
      return;
    }

    try {
      await loadEvidence(selectedIncident._id);
      setEvidenceVisible(true);
    } catch (error) {
      setNotice(error.response?.data?.message || t('evidenceLoadFailed'));
    }
  };

  const handleComplete = async () => {
    if (!selectedIncident) {
      return;
    }

    try {
      await completeIncident(selectedIncident._id);
      setNotice(t('incidentCompleted'));
    } catch (error) {
      setNotice(error.response?.data?.message || t('completeIncidentFailed'));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <Sidebar role="admin" onLogout={onLogout} />

        <section className="flex-1 space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-xl font-bold text-brand-900">{t('dashboard')}</h1>
          </header>

          {notice ? <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">{notice}</div> : null}

          <div className="grid gap-4 xl:grid-cols-[330px_1fr]">
            <section className="card p-4">
              <h2 className="mb-3 text-lg font-semibold">{t('incidents')}</h2>
              <div className="max-h-[65vh] space-y-2 overflow-auto">
                {incidents.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('noActiveIncidents')}</p>
                ) : (
                  incidents.map((incident) => (
                    <button
                      key={incident._id}
                      type="button"
                      className={`w-full rounded-md border p-3 text-left ${
                        selectedIncidentId === incident._id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                      }`}
                      onClick={() => setSelectedIncidentId(incident._id)}
                    >
                      <p className="font-semibold text-slate-900">{incident.shortMessage}</p>
                      <p className="text-xs text-slate-600">
                        {incident.department} | {incident.status}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="space-y-4">
              {!selectedIncident ? (
                <div className="card p-4 text-sm text-slate-600">{t('selectIncident')}</div>
              ) : (
                <>
                  <div className="card grid gap-4 p-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold text-brand-900">{t('victimDetails')}</h3>
                      <p>
                        <strong>{t('nameLabel')}:</strong> {selectedIncident.reporterUser?.name || t('anonymous')}
                      </p>
                      <p>
                        <strong>{t('phone')}:</strong> {selectedIncident.reporterUser?.phone || '-'}
                      </p>
                      <p>
                        <strong>{t('age')}:</strong> {selectedIncident.reporterUser?.age || '-'}
                      </p>
                      <p>
                        <strong>{t('bloodGroup')}:</strong> {selectedIncident.reporterUser?.blood_group || '-'}
                      </p>
                      <p>
                        <strong>{t('messageLabel')}:</strong> {selectedIncident.shortMessage}
                      </p>
                      <p>
                        <strong>{t('department')}:</strong> {selectedIncident.department}
                      </p>
                      <p>
                        <strong>{t('victimLocation')}:</strong>{' '}
                        {victimLocation ? formatLatLng(victimLocation) : formatCoordinatePair(selectedIncident.location)}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-brand-900">{t('rescuerDetails')}</h3>
                      {selectedIncident.assignedRescuer ? (
                        <>
                          <p>
                            <strong>{t('nameLabel')}:</strong> {selectedIncident.assignedRescuer.name}
                          </p>
                          <p>
                            <strong>{t('phone')}:</strong> {selectedIncident.assignedRescuer.phone || '-'}
                          </p>
                          <p>
                            <strong>{t('department')}:</strong> {selectedIncident.assignedRescuer.department || '-'}
                          </p>
                          <p>
                            <strong>{t('status')}:</strong> {selectedIncident.assignedRescuer.status || t('offline')}
                          </p>
                          <p>
                            <strong>{t('liveRescuerLocation')}:</strong> {formatLatLng(rescuerLocation)}
                          </p>
                          <p>
                            <strong>{t('derivedLabel')}:</strong> {rescuerLocation?.onScene ? t('onScene') : t('notOnScene')}
                          </p>
                        </>
                      ) : (
                        <p>{t('unassigned')}</p>
                      )}
                    </div>
                  </div>

                  <div className="card p-4">
                    <AdminMap
                      victimLocation={victimMapLocation}
                      rescuerLocation={rescuerLocation}
                      fallbackCenter={mapCenter}
                    />
                  </div>

                  <div className="card space-y-3 p-4">
                    <h3 className="text-lg font-semibold text-brand-900">{t('responderActions')}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary" onClick={handleViewEvidence}>
                        {t('viewEvidence')}
                      </button>

                      <button type="button" className="btn-primary" onClick={handleComplete}>
                        {t('markCompleted')}
                      </button>
                    </div>

                    {evidenceVisible ? <EvidenceViewer rows={evidenceRows} /> : null}
                  </div>

                  <ChatPanel incidentId={selectedIncident._id} user={user} senderType="admin" />

                  <PTTButton incidentId={selectedIncident._id} speakerType="admin" />
                </>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminDashboard;
