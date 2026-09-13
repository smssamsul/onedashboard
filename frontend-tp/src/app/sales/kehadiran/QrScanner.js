"use client";

import { useEffect, useRef } from "react";

const ELEMENT_ID = "qr-scanner-region";

/**
 * Scanner QR pakai kamera (html5-qrcode). Dipisah jadi komponen sendiri
 * supaya start/stop kamera bersih waktu mount/unmount - React StrictMode
 * dan pindah halaman gampang bikin kamera "nyangkut" kalau logicnya
 * dicampur di komponen utama.
 *
 * onScan dipanggil sekali per hasil scan valid, lalu scanner dijeda
 * (bukan berhenti total) selama `pauseMs` supaya QR yang sama tidak
 * ke-scan berkali-kali beruntun selagi masih di depan kamera.
 */
export default function QrScanner({ onScan, active = true, pauseMs = 2500 }) {
  const scannerRef = useRef(null);
  const isPausedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;

      const html5QrCode = new Html5Qrcode(ELEMENT_ID);
      scannerRef.current = html5QrCode;

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
        .catch(() => {
          // Gagal buka kamera (izin ditolak / tidak ada kamera) - biarkan area
          // scanner kosong, pesan sudah ditangani lewat cek permission di parent.
        });
    });

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div
      id={ELEMENT_ID}
      style={{
        width: "100%",
        maxWidth: 360,
        margin: "0 auto",
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
      }}
    />
  );
}
