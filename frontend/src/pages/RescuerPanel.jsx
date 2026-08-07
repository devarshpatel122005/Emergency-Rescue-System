import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusToggle from '../components/StatusToggle';
import PTTButton from '../components/PTTButton';
import NavigationDirections from '../components/NavigationDirections';
import ChatPanel from '../components/ChatPanel';
import { completeIncident, listIncidents, uploadIncidentEvidence } from '../services/incidentService';
import { getMyRescuerStatus, updateRescuerStatus } from '../services/rescuerService';
import { onSocket } from '../services/socket';

function RescuerPanel({ user, onLogout }) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState('offline');
  const [notice, setNotice] = useState('');
  const [onScene, setOnScene] = useState(false);
  const [rescuerLocation, setRescuerLocation] = useState(null);
  const [victimLocation, setVictimLocation] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('approved');

  const currentIncident = useMemo(() => incidents[0] || null, [incidents]);

  const fallbackCenter = rescuerLocation;

  const loadAssignments = async () => {
    const data = await listIncidents({ assignedTo: user._id });
    setIncidents(data.filter((item) => item.status !== 'resolved'));
  };

  const loadPersistedStatus = async () => {
    const profile = await getMyRescuerStatus();
    setOnline(Boolean(profile.online));
    setStatus(profile.status || (profile.online ? 'online' : 'offline'));
    setApprovalStatus(profile.approvalStatus || 'approved');

    if (profile.location?.coordinates?.length === 2) {
      setRescuerLocation({
        lat: profile.location.coordinates[1],
        lng: profile.location.coordinates[0]
      });
    }
  };

  useEffect(() => {
    Promise.all([loadAssignments(), loadPersistedStatus()]).catch(() => setNotice(t('loadAssignmentsFailed')));
  }, [user._id, t]);

  useEffect(() => {
    const offCreated = onSocket('incident:created', (incident) => {
      const assignedId = incident?.assignedRescuer?._id || incident?.assignedRescuer;
      if (assignedId && String(assignedId) === String(user._id)) {
        loadAssignments().catch(() => {});
      }
    });

    const offAssigned = onSocket('incident:assigned', ({ incident, rescuer }) => {
      const assignedRescuerId = rescuer?._id || incident?.assignedRescuer?._id;
      if (String(assignedRescuerId) === String(user._id)) {
        loadAssignments().catch(() => {});
      }
    });

    const offCompleted = onSocket('incident:completed', () => {
      loadAssignments().catch(() => {});
      setOnScene(false);
    });

    const offStatus = onSocket('rescuer:status_update', (payload) => {
      if (String(payload.rescuerId) !== String(user._id)) {
        return;
      }
      setStatus(payload.status || 'offline');
      setOnline(Boolean(payload.online));
    });

    const offOnScene = onSocket('rescuer:onscene', (payload) => {
      if (String(payload.rescuerId) === String(user._id) && currentIncident && payload.incidentId === currentIncident._id) {
        setOnScene(true);
      }
    });

    const offRescuerLocation = onSocket('rescuer:location_update', (payload) => {
      if (String(payload.rescuer?._id) !== String(user._id)) {
        return;
      }

      const [lng, lat] = payload.location?.coordinates || [];
      if (lat !== undefined && lng !== undefined) {
        setRescuerLocation({ lat, lng });
      }
    });

    const offVictimLocation = onSocket('victim:location_update', (payload) => {
      if (!currentIncident || payload.incidentId !== currentIncident._id) {
        return;
      }
      setVictimLocation(payload.location);
    });

    return () => {
      offCreated();
      offAssigned();
      offCompleted();
      offStatus();
      offOnScene();
      offRescuerLocation();
      offVictimLocation();
    };
  }, [user._id, currentIncident]);

  useEffect(() => {
    if (!online || !currentIncident || approvalStatus !== 'approved') {
      return undefined;
    }

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const point = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setRescuerLocation(point);
          await updateRescuerStatus({
            online: true,
            lat: point.lat,
            lng: point.lng,
            incidentId: currentIncident._id
          });
        },
        async () => {
          await updateRescuerStatus({ online: true, incidentId: currentIncident._id });
        }
      );
    };

    ping();
    const timer = setInterval(ping, 10000);
    return () => clearInterval(timer);
  }, [online, currentIncident, approvalStatus]);

  useEffect(() => {
    if (currentIncident?.location?.coordinates?.length === 2) {
      setVictimLocation({
        lat: currentIncident.location.coordinates[1],
        lng: currentIncident.location.coordinates[0]
      });
    } else {
      setVictimLocation(null);
    }
  }, [currentIncident]);

  const handleToggleStatus = async (next) => {
    try {
      setNotice('');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await updateRescuerStatus({
            online: next,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            incidentId: currentIncident?._id || null
          });
        },
        async () => {
          await updateRescuerStatus({ online: next, incidentId: currentIncident?._id || null });
        }
      );
    } catch (error) {
      setNotice(error.response?.data?.message || t('statusUpdateFailed'));
    }
  };

  const handleUploadEvidence = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentIncident) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('capturedAt', new Date().toISOString());
      formData.append('deviceId', `rescuer-${user._id}`);

      await uploadIncidentEvidence(currentIncident._id, formData);
      setNotice(t('evidenceUpdated'));
    } catch (error) {
      setNotice(error.response?.data?.message || t('evidenceUploadFailed'));
    }
  };

  const handleMarkCompleted = async () => {
    if (!currentIncident) {
      return;
    }

    try {
      await completeIncident(currentIncident._id);
      setNotice(t('incidentCompleted'));
    } catch (error) {
      setNotice(error.response?.data?.message || t('completeIncidentFailed'));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-brand-900">{t('assignedEmergency')}</h1>
            <div className="flex gap-2">
              <Link className="btn-secondary" to="/rescuer/ar">
                AR Mode
              </Link>
              <button type="button" className="btn-secondary" onClick={onLogout}>
                {t('logout')}
              </button>
            </div>
          </div>
        </header>

        {notice ? <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">{notice}</div> : null}

        <section className="card space-y-4 p-4" id="status">
          <StatusToggle
            checked={online}
            onChange={handleToggleStatus}
            label={`${t('status')}: ${status}`}
            disabled={approvalStatus !== 'approved' || status === 'busy'}
          />

          {approvalStatus !== 'approved' ? <p className="text-sm text-amber-700">Account pending admin approval</p> : null}

          {currentIncident ? (
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>{t('assignedVictim')}:</strong> {currentIncident.reporterUser?.name || t('anonymous')}
              </p>
              <p>
                <strong>{t('location')}:</strong>{' '}
                {currentIncident.location?.coordinates
                  ? `${currentIncident.location.coordinates[1].toFixed(5)}, ${currentIncident.location.coordinates[0].toFixed(5)}`
                  : '-'}
              </p>
              <p>
                <strong>{t('department')}:</strong> {currentIncident.department}
              </p>
              <p>
                <strong>{t('emergencyType')}:</strong> {currentIncident.templateType || 'custom'}
              </p>
              <p>
                <strong>{t('status')}:</strong> {onScene ? t('onScene') : currentIncident.status}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">{t('noAssignment')}</p>
          )}
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-lg font-semibold text-brand-900">{t('navigate')}</h2>
          <NavigationDirections from={rescuerLocation} to={victimLocation} fallbackCenter={fallbackCenter} />
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="text-lg font-semibold text-brand-900">{t('responderActions')}</h2>
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer" htmlFor="rescuer-evidence-upload">
              {t('uploadEvidence')}
            </label>
            <input
              id="rescuer-evidence-upload"
              className="hidden"
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleUploadEvidence}
            />

            <button type="button" className="btn-primary" onClick={handleMarkCompleted}>
              {t('markCompleted')}
            </button>
          </div>
        </section>

        <ChatPanel incidentId={currentIncident?._id} user={user} senderType="rescuer" />

        <PTTButton incidentId={currentIncident?._id} speakerType="rescuer" />
      </div>
    </main>
  );
}

export default RescuerPanel;
