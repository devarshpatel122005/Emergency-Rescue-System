import { useEffect, useState } from 'react';

/**
 * PWA Install Prompt
 *
 * Listens for the `beforeinstallprompt` browser event and renders
 * a dismissable install banner with an <button id="installApp"> button
 * so the user can add the app to their home screen.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      // Prevent Chrome from showing the default mini-infobar
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide banner if app is already installed
    window.addEventListener('appinstalled', () => {
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(255,59,59,0.4)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(255,59,59,0.25), 0 2px 8px rgba(0,0,0,0.5)',
        maxWidth: '360px',
        width: 'calc(100vw - 32px)',
        backdropFilter: 'blur(12px)',
        animation: 'slideUp 0.35s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Icon */}
      <img
        src="/icons/icon-192.png"
        alt="Rescue App"
        style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0 }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '14px', lineHeight: 1.3 }}>
          Install Emergency Rescue
        </p>
        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.4 }}>
          Add to home screen for offline use
        </p>
      </div>

      {/* Install button */}
      <button
        id="installApp"
        onClick={handleInstall}
        style={{
          background: '#ff3b3b',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '8px 16px',
          fontWeight: 700,
          fontSize: '13px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.target.style.background = '#cc2222')}
        onMouseLeave={e => (e.target.style.background = '#ff3b3b')}
      >
        Install
      </button>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          color: 'rgba(255,255,255,0.5)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '4px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
