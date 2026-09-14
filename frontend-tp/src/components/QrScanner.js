"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const ELEMENT_ID = "qr-scanner-region";
const START_TIMEOUT_MS = 10000;

function messageForError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError") {
    return "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Kamera tidak ditemukan di perangkat ini.";
  }
  if (name === "NotReadableError") {
    return "Kamera sedang dipakai tab/aplikasi lain. Tutup tab lain yang memakai kamera, lalu coba lagi.";
  }
  return "Kamera tidak merespons. Coba lagi atau muat ulang halaman.";
}

/**
 * Scanner QR pakai kamera (html5-qrcode). Dipisah jadi komponen sendiri
 * supaya start/stop kamera bersih waktu mount/unmount - React StrictMode
 * dan pindah halaman gampang bikin kamera "nyangkut" kalau logicnya
 * dicampur di komponen utama. Dipakai bareng di halaman Kehadiran leader
 * (/sales/kehadiran) dan staff (/sales/staff/kehadiran + mode layar penuh).
 *
 * onScan dipanggil sekali per hasil scan valid, lalu scanner dijeda
 * (bukan berhenti total) selama `pauseMs` supaya QR yang sama tidak
 * ke-scan berkali-kali beruntun selagi masih di depan kamera.
 *
 * Kegagalan buka kamera (izin ditolak, tidak ada kamera, kamera dipakai
 * tab lain, dsb) sebelumnya didiamkan total - macet tanpa pesan apa pun.
 * Sekarang ditampilkan sebagai pesan + tombol "Coba Lagi" di dalam area
 * kamera itu sendiri, plus onError opsional buat parent yang mau reaksi
 * sendiri (mis. log tambahan).
 */
export default function QrScanner({ onScan, onError, active = true, pauseMs = 2500 }) {
  const scannerRef = useRef(null);
  const isPausedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timeoutId = null;
    setError(null);
    setStarting(true);

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;

      const html5QrCode = new Html5Qrcode(ELEMENT_ID);
      scannerRef.current = html5QrCode;

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const msg = "Kamera tidak merespons. Coba lagi atau muat ulang halaman.";
        setError(msg);
        setStarting(false);
        onErrorRef.current?.(new Error(msg));
      }, START_TIMEOUT_MS);

      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (isPausedRef.current) return;
            isPausedRef.current = true;
            onScanRef.current?.(decodedText);
            setTimeout(() => {
              isPausedRef.current = false;
            }, pauseMs);
          },
          () => {
            // Diabaikan - ini dipanggil terus tiap frame yang belum ketemu QR,
            // bukan error sungguhan.
          }
        )
        .then(() => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          setStarting(false);
        })
        .catch((err) => {
          if (cancelled) return;
          clearTimeout(timeoutId);
          const msg = messageForError(err);
          setError(msg);
          setStarting(false);
          onErrorRef.current?.(err);
        });
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, retryKey]);

  return (
    <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
      <div
        id={ELEMENT_ID}
        style={{
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
          minHeight: error ? 0 : 200,
        }}
      />
      {starting && !error && (
        <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>
          Membuka kamera...
        </p>
      )}
      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "0.75rem 1rem",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 8 }}>{error}</div>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #fca5a5",
              background: "#fff",
              color: "#991b1b",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
}
