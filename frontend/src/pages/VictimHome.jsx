import { Link, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Sidebar from '../components/Sidebar';
import SOSButtons from '../components/SOSButtons';
import IncidentTemplates from '../components/IncidentTemplates';
import PTTButton from '../components/PTTButton';
import ChatPanel from '../components/ChatPanel';
import LocationPickerMap from '../components/LocationPickerMap';
import { createIncident, updateIncidentLocation } from '../services/incidentService';
import { getOrCreateDeviceId } from '../services/deviceService';
import { onSocket } from '../services/socket';
import { getLocationErrorMessage, requestCurrentLocation } from '../services/locationService';

function VictimHome({ user }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeIncident, setActiveIncident] = useState(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [manualPoint, setManualPoint] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  if (user && !user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  const getCurrentLocation = useCallback(async () => {
    try {
      return await requestCurrentLocation({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000
      });
    } catch (error) {
      const wrapped = new Error(getLocationErrorMessage(error));
      wrapped.code = error?.code;
      throw wrapped;
    }
  }, []);

  useEffect(() => {
    getCurrentLocation()
      .then((coords) => setCurrentLocation(coords))
      .catch(() => {
        // silent fallback
      });
  }, [getCurrentLocation]);

  useEffect(() => {
    const offCreated = onSocket('incident:created', (incident) => {
      if (activeIncident && incident?._id === activeIncident._id) {
        setActiveIncident(incident);
      }
    });

    const offNew = onSocket('incident:new', (incident) => {
      if (activeIncident && incident?._id === activeIncident._id) {
        setActiveIncident(incident);
      }
    });

    const offAssigned = onSocket('incident:assigned', ({ incident }) => {
      if (activeIncident && incident?._id === activeIncident._id) {
        setActiveIncident(incident);
      }
    });

    const offRescuerStatus = onSocket('rescuer:status_update', (payload) => {
      if (!activeIncident?.assignedRescuer?._id || payload.rescuerId !== activeIncident.assignedRescuer._id) {
        return;
      }

      setActiveIncident((prev) => {
        if (!prev || !prev.assignedRescuer) {
          return prev;
        }
        return {
          ...prev,
          assignedRescuer: {
            ...prev.assignedRescuer,
            status: payload.status,
            online: payload.online
          }
        };
      });
    });

    const offCompleted = onSocket('incident:completed', (incident) => {
      if (activeIncident && incident?._id === activeIncident._id) {
        setActiveIncident(null);
      }
    });

    return () => {
      offCreated();
      offNew();
      offAssigned();
      offRescuerStatus();
      offCompleted();
    };
  }, [activeIncident]);

  useEffect(() => {
    if (!activeIncident?._id || activeIncident.reporterLiveTracking === false) {
      return undefined;
    }

    const pushLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await updateIncidentLocation(activeIncident._id, {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              deviceId: getOrCreateDeviceId()
            });
          } catch (error) {
            // silent by design
          }
        },
        () => {
          // silent by design
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    };

    pushLocation();
    const timer = setInterval(pushLocation, 10000);
    return () => clearInterval(timer);
  }, [activeIncident?._id, activeIncident?.reporterLiveTracking]);

  const openManualLocation = async () => {
    setManualLocation((value) => !value);

    if (!manualLocation) {
      try {
        const coords = currentLocation || (await getCurrentLocation());
        setCurrentLocation(coords);
        setManualPoint(coords);
      } catch (error) {
        setManualPoint(null);
      }
    }
  };

  const resolveIncidentLocation = async () => {
    if (manualLocation && manualPoint?.lat !== undefined && manualPoint?.lng !== undefined) {
      return manualPoint;
    }

    try {
      const coords = await getCurrentLocation();
      setCurrentLocation(coords);
      return coords;
    } catch (error) {
      if (manualPoint?.lat !== undefined && manualPoint?.lng !== undefined) {
        return manualPoint;
      }
      throw error;
    }
  };

  const submitIncident = async ({ department, message, templateType = 'custom', details = '' }) => {
    setLoading(true);
    setNotice('');

    try {
      const coords = await resolveIncidentLocation();

      const payload = {
        reporterId: user?._id || null,
        anonymous: !user,
        department,
        lat: coords.lat,
        lng: coords.lng,
        shortMessage: message?.trim() || `${department} emergency`,
        details,
        templateType,
        deviceId: getOrCreateDeviceId(),
        reporterLiveTracking: !manualLocation
      };

      const result = await createIncident(payload);
      const incident = result.incident || result;
      setActiveIncident(incident);

      if (result.no_rescuer_available) {
        setNotice(t('noRescuer', { department }));
      } else {
        setNotice(t('quickSent'));
      }
    } catch (error) {
      if (!manualLocation) {
        setManualLocation(true);
      }
      setNotice(error.response?.data?.message || error.message || t('locationError'));
    } finally {
      setLoading(false);
    }
  };

  const submitTemplateIncident = async (templatePayload) => {
    await submitIncident({
      department: templatePayload.department,
      message: templatePayload.shortMessage,
      templateType: templatePayload.templateType,
      details: templatePayload.details
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <Sidebar role="victim" />

        <section className="flex-1 space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-brand-900">{t('appTitle')}</h1>
              <div className="flex items-center gap-2 text-xs">
                <LanguageSwitcher />
                <Link className="underline" to="/login">
                  {t('login')}
                </Link>
                <span>/</span>
                <Link className="underline" to="/register">
                  {t('register')}
                </Link>
              </div>
            </div>
          </header>

          {notice ? <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">{notice}</div> : null}

          <div className="space-y-4">
            <SOSButtons onSOS={submitIncident} loading={loading} />

            <div className="card p-4">
              <button type="button" className="btn-secondary" onClick={openManualLocation}>
                {t('reportDifferentLocation')}
              </button>

              {manualLocation ? (
                <div className="mt-3 space-y-2">
                  <LocationPickerMap value={manualPoint} onChange={setManualPoint} currentLocation={currentLocation} />
                  <p className="text-xs text-slate-600">
                    {manualPoint
                      ? `${t('latitude')}: ${manualPoint.lat.toFixed(6)} | ${t('longitude')}: ${manualPoint.lng.toFixed(6)}`
                      : t('tapMapToPin')}
                  </p>
                </div>
              ) : null}
            </div>

            <IncidentTemplates onSubmit={submitTemplateIncident} loading={loading} />

            <PTTButton incidentId={activeIncident?._id} speakerType="victim" large />

            <ChatPanel incidentId={activeIncident?._id} user={user} senderType="victim" />

            {activeIncident ? (
              <div className="card p-4 text-sm text-slate-700">
                <p>
                  <strong>{t('assignedIncident')}:</strong> {activeIncident.shortMessage}
                </p>
                <p>
                  <strong>{t('department')}:</strong> {activeIncident.department}
                </p>
                <p>
                  <strong>{t('status')}:</strong> {activeIncident.status}
                </p>
                <p>
                  <strong>{t('assignedRescuer')}:</strong>{' '}
                  {activeIncident.assignedRescuer?.name || t('unassigned')}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default VictimHome;
