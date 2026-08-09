import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function InstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if the app is already running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone;

    if (isStandalone) return;

    // Capture Android/Chrome install event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt for iOS Safari users
    if (isIosDevice) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  // Only display the prompt if the user is currently on the /job-work route
  if (location.pathname !== '/job-work') return null;

  if (!showPrompt) return null;

  return (
    <div style={styles.banner}>
      {isIOS ? (
        <p style={styles.text}>
          To add this app to your home screen: tap the <strong>Share</strong> button below and select <strong>"Add to Home Screen"</strong>.
        </p>
      ) : (
        <div style={styles.flex}>
          <p style={styles.text}>Install this app for a better experience!</p>
          <button onClick={handleInstallClick} style={styles.button}>
            Install
          </button>
        </div>
      )}
      <button onClick={() => setShowPrompt(false)} style={styles.close}>
        ✕
      </button>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '400px',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex: { display: 'flex', alignItems: 'center', gap: '12px' },
  text: { margin: 0, fontSize: '14px' },
  button: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  close: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '16px',
    cursor: 'pointer',
    marginLeft: '8px',
  },
};