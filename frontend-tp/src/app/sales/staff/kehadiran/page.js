"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "@/components/Layout";
import { QrCode, CheckCircle2, XCircle, AlertTriangle, Users } from "lucide-react";
import { getKehadiran, scanQrCheckin } from "@/lib/sales/kehadiran";
import { getQuickOrderProducts, getProductById } from "@/lib/sales/products";
import QrScanner from "@/components/QrScanner";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

/**
 * Versi ringkas halaman Kehadiran untuk staff sales - cuma scan kamera +
 * daftar yang sudah hadir di sesi terpilih. Tanpa tandai-hadir-manual atau
 * riwayat lintas-sesi seperti versi head sales (/sales/kehadiran), supaya
 * staff fokus ke satu tugas: scan tiket peserta pas di lokasi acara.
 */
export default function StaffKehadiranPage() {
  const [produkList, setProdukList] = useState([]);
  const [produkId, setProdukId] = useState("");
  const [jadwalList, setJadwalList] = useState([]);
  const [jadwalId, setJadwalId] = useState("");
  const [kehadiran, setKehadiran] = useState([]);
  const [loading, setLoading] = useState(false);

  const [scanResult, setScanResult] = useState(null); // { type: 'success'|'warning'|'error', message, data }
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    getQuickOrderProducts().then((list) => setProdukList(Array.isArray(list) ? list : [])).catch(() => setProdukList([]));
  }, []);

  useEffect(() => {
    if (!produkId) {
      setJadwalList([]);
      setJadwalId("");
      return;
    }
    getProductById(produkId).then((detail) => {
      const jadwals = Array.isArray(detail?.jadwal_rel) ? detail.jadwal_rel : [];
      setJadwalList(jadwals);
      // Default ke jadwal terbaru (biasanya inilah sesi yang aktif dipakai ulang)
      const latest = [...jadwals].sort((a, b) => new Date(b.waktu_mulai) - new Date(a.waktu_mulai))[0];
      setJadwalId(latest ? String(latest.id) : "");
    });
  }, [produkId]);

  useEffect(() => {
    setScanResult(null);
  }, [jadwalId]);

  const loadKehadiran = useCallback(async (id) => {
    if (!id) {
      setKehadiran([]);
      return;
    }
    setLoading(true);
    const data = await getKehadiran(id);
    setKehadiran(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKehadiran(produkId);
  }, [produkId, loadKehadiran]);

  const jadwalTerpilih = useMemo(
    () => jadwalList.find((j) => String(j.id) === String(jadwalId)),
    [jadwalList, jadwalId]
  );

  // Cuma peserta sesi yang sedang dipilih - dicocokkan lewat tanggal_jadwal
  // (snapshot), sama seperti cara backend membedakan sesi kalau jadwal_id
  // yang sama dipakai ulang untuk tanggal event yang berbeda.
  const hadirSesiIni = useMemo(() => {
    if (!jadwalTerpilih) return [];
    return kehadiran
      .filter(
        (row) =>
          String(row.jadwal_id) === String(jadwalId) &&
          row.tanggal_jadwal === jadwalTerpilih.waktu_mulai
      )
      .sort((a, b) => new Date(b.waktu_checkin) - new Date(a.waktu_checkin));
  }, [kehadiran, jadwalId, jadwalTerpilih]);

  const handleScan = async (qrToken) => {
    if (!jadwalId) {
      setScanResult({ type: "error", message: "Pilih jadwal aktif dulu sebelum scan QR peserta" });
      return;
    }
    setScanning(true);
    try {
      const res = await scanQrCheckin(jadwalId, qrToken);
      if (res.already_checked_in) {
        setScanResult({ type: "warning", message: "Sudah check-in sebelumnya", data: res.data });
      } else {
        setScanResult({ type: "success", message: "Berhasil check-in", data: res.data });
      }
      loadKehadiran(produkId);
    } catch (err) {
      setScanResult({ type: "error", message: err.message || "QR tidak valid" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <Layout title="Kehadiran">
      <div className="dashboard-shell customers-shell table-shell">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section className="panel users-panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Event</p>
                <h3 className="panel__title">Scan Kehadiran</h3>
              </div>
            </div>

            <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: "1 1 220px", minWidth: 200 }}>
                  <label>Produk</label>
                  <select value={produkId} onChange={(e) => setProdukId(e.target.value)}>
                    <option value="">-- Pilih Produk --</option>
                    {produkList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                </div>

                {produkId && (
                  <div className="form-group" style={{ flex: "1 1 260px", minWidth: 240 }}>
                    <label>Jadwal</label>
                    <select value={jadwalId} onChange={(e) => setJadwalId(e.target.value)}>
                      <option value="">-- Pilih Jadwal --</option>
                      {jadwalList.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nama_jadwal} — {j.waktu_mulai ? new Date(j.waktu_mulai).toLocaleString("id-ID") : "-"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {jadwalId && (
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flexShrink: 0 }}>
                    <QrScanner active={!!jadwalId} onScan={handleScan} />
                    <p style={{ fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 6 }}>
                      Arahkan kamera ke QR tiket kehadiran peserta
                    </p>
                  </div>

                  <div style={{ flex: "1 1 200px", minWidth: 200 }}>
                    {scanning && (
                      <div style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "#f3f4f6", color: "#374151", fontSize: 13 }}>
                        Memproses scan...
                      </div>
                    )}
                    {scanResult && (
                      <div
                        style={{
                          padding: "0.75rem 1rem",
                          borderRadius: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          background:
                            scanResult.type === "success" ? "#ecfdf5" : scanResult.type === "warning" ? "#fffbeb" : "#fef2f2",
                          border: `1px solid ${scanResult.type === "success" ? "#a7f3d0" : scanResult.type === "warning" ? "#fde68a" : "#fecaca"}`,
                          color: scanResult.type === "success" ? "#065f46" : scanResult.type === "warning" ? "#92400e" : "#991b1b",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
                          {scanResult.type === "success" && <CheckCircle2 size={18} />}
                          {scanResult.type === "warning" && <AlertTriangle size={18} />}
                          {scanResult.type === "error" && <XCircle size={18} />}
                          {scanResult.message}
                        </div>
                        {scanResult.data && (
                          <div style={{ fontSize: 13 }}>
                            <div>{scanResult.data.nama}</div>
                            <div style={{ opacity: 0.8 }}>{scanResult.data.produk} — {scanResult.data.kode_order}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {jadwalId && (
            <section className="panel users-panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Directory</p>
                  <h3 className="panel__title">
                    <Users size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    Sudah Hadir ({hadirSesiIni.length})
                  </h3>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Sumber</th>
                      <th>Waktu Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={3} className="table-empty">Memuat data...</td></tr>
                    ) : hadirSesiIni.length > 0 ? (
                      hadirSesiIni.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{row.customer_rel?.nama || "-"}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{row.customer_rel?.wa || "-"}</div>
                          </td>
                          <td>{row.source_type === "order" ? "Order" : row.source_type === "invitation" ? "Invitation" : "Walk-in"}</td>
                          <td>{row.waktu_checkin ? new Date(row.waktu_checkin).toLocaleString("id-ID") : "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="table-empty">Belum ada yang check-in untuk sesi ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!produkId && (
            <section className="panel users-panel">
              <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                <QrCode size={20} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Pilih produk & jadwal di atas untuk mulai scan kehadiran.
              </p>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}
