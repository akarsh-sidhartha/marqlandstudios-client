/**
 * src/components/BarcodeScannerModal.js
 *
 * Full-screen camera overlay that reads a barcode (or QR code) off a live
 * video feed using the browser's native BarcodeDetector API — deliberately
 * no extra npm dependency (no zxing/quagga/etc). Meant to be opened from a
 * form's "Tracking ID" field on mobile, so a courier can point the phone
 * camera at the shipping label instead of typing the ID by hand.
 *
 * BarcodeDetector isn't implemented everywhere yet (notably Safari/iOS as
 * of this writing — Chrome/Edge/Android WebView support it). Rather than
 * fail silently, `supported` renders a clear fallback message so the user
 * knows to type the ID manually instead of wondering why nothing happens.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Camera as CameraIcon, AlertCircle } from 'lucide-react';

const SCAN_INTERVAL_MS = 250;
const BARCODE_FORMATS = [
  'code_128', 'code_39', 'code_93', 'codabar', 'ean_13', 'ean_8',
  'itf', 'upc_a', 'upc_e', 'qr_code',
];

const BarcodeScannerModal = ({ onDetected, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const detectorRef = useRef(null);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setSupported(false);
      return;
    }
    try {
      detectorRef.current = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
    } catch {
      // Some implementations reject an explicit format list — fall back to
      // whatever formats the browser supports by default rather than give up.
      try {
        detectorRef.current = new window.BarcodeDetector();
      } catch {
        setSupported(false);
        return;
      }
    }

    let cancelled = false;

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
            }
          } catch {
            // Transient mid-frame decode errors are normal — just keep polling.
          }
        }, SCAN_INTERVAL_MS);
      })
      .catch(err => {
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access to scan, or enter the tracking ID manually.'
            : 'Could not access the camera. Please enter the tracking ID manually.'
        );
      });

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <button onClick={onClose} title="Close" style={{
        position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
        cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
      }}>
        <X size={22} />
      </button>

      {!supported ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.75)', maxWidth: 320 }}>
          <AlertCircle size={28} style={{ marginBottom: 12, color: '#e08585' }} />
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Live barcode scanning isn't supported in this browser. Please enter the tracking ID manually.
          </p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.75)', maxWidth: 320 }}>
          <AlertCircle size={28} style={{ marginBottom: 12, color: '#e08585' }} />
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{error}</p>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block', borderRadius: 4, background: '#000' }} />
            {/* Scan-guide frame — purely visual, decoding runs on the full frame */}
            <div style={{
              position: 'absolute', inset: '20% 8%', border: '2px solid #d4b06a',
              borderRadius: 4, pointerEvents: 'none',
            }} />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CameraIcon size={13} /> Point the camera at the barcode
          </p>
        </>
      )}
    </div>
  );
};

export default BarcodeScannerModal;