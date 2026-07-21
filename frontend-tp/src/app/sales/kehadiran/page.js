"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { QRCodeCanvas } from "qrcode.react";
import { CheckSquare, Trash2, QrCode, Copy, Download, Monitor } from "lucide-react";
import { getKehadiran, manualCheckin, deleteKehadiran } from "@/lib/sales/kehadiran";
import { getQuickOrderProducts, getProductById } from "@/lib/sales/products";
import { getCustomers } from "@/lib/sales/customer";
import { toastSuccess, toastError } from "@/lib/toast";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function KehadiranPage() {
  const [produkList, setProdukList] = useState([]);
  const [produkId, setProdukId] = useState("");
  const [jadwalList, setJadwalList] = useState([]);
  const [jadwalId, setJadwalId] = useState("");
  const [kehadiran, setKehadiran] = useState([]);
  const [loading, setLoading] = useState(false);

  // Manual check-in state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [searchResults, setSearchResults] = useState([]);
  const qrCanvasRef = useRef(null);

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

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    getCustomers(1, 5, { search: debouncedSearch.trim() })
      .then((res) => setSearchResults(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSearchResults([]));
  }, [debouncedSearch]);

  const selectedProduk = produkList.find((p) => String(p.id) === String(produkId));
  const checkinLink = jadwalId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/kehadiran/${jadwalId}`
    : "";

  const handleCopyLink = () => {
    if (!checkinLink) return;
    navigator.clipboard.writeText(checkinLink);
    toastSuccess("Link check-in disalin ke clipboard");
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-kehadiran-${selectedProduk?.nama || produkId}.png`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    toastSuccess("QR code diunduh");
  };

  const handleManualCheckin = async (customer) => {
    if (!jadwalId) {
      toastError("Pilih jadwal aktif dulu sebelum tandai hadir manual");
      return;
    }
    try {
      await manualCheckin(jadwalId, customer.id);
      toastSuccess(`${customer.nama} ditandai hadir`);
      setSearch("");
      setSearchResults([]);
      loadKehadiran(produkId);
    } catch (err) {
      toastError(err.message || "Gagal mencatat kehadiran");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Batalkan kehadiran ${row.customer_rel?.nama || "peserta ini"}?`)) return;
    try {
      await deleteKehadiran(row.id);
      toastSuccess("Kehadiran dibatalkan");
      loadKehadiran(produkId);
    } catch (err) {
      toastError(err.message || "Gagal membatalkan kehadiran");
    }
  };

  return (
    <Layout title="Kehadiran">
      <div className="dashboard-shell customers-shell table-shell">
        <section className="dashboard-summary kategori-summary">
          <article className="summary-card summary-card--combined summary-card--two-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <CheckSquare size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total hadir (semua sesi produk ini)</p>
                <p className="summary-card__value">{kehadiran.length}</p>
              </div>
            </div>
          </article>
        </section>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* KIRI: satu card - pilih produk (dropdown), pilih jadwal, dan QR check-in */}
          <div style={{ width: 340, flexShrink: 0 }}>
            <section className="panel users-panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Event</p>
                  <h3 className="panel__title">Produk &amp; QR Check-in</h3>
                </div>
              </div>
              <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group full-width">
                  <label>Produk</label>
                  <select value={produkId} onChange={(e) => setProdukId(e.target.value)}>
                    <option value="">-- Pilih Produk --</option>
                    {produkList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                </div>

                {produkId && (
                  <div className="form-group full-width">
                    <label>Jadwal untuk QR check-in</label>
                    <select value={jadwalId} onChange={(e) => setJadwalId(e.target.value)}>
                      <option value="">-- Pilih Jadwal --</option>
                      {jadwalList.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nama_jadwal} — {j.waktu_mulai ? new Date(j.waktu_mulai).toLocaleString("id-ID") : "-"}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                      Produk ini dipakai berulang cukup dengan edit tanggal jadwal — riwayat kehadiran sesi lama tetap aman tersimpan dengan tanggalnya sendiri.
                    </p>
                  </div>
                )}

                  {jadwalId && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={{ fontSize: 14, fontWeight: 600 }}>
                        <QrCode size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />QR Check-in
                      </label>
                      <div style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, alignSelf: "center" }}>
                        <QRCodeCanvas ref={qrCanvasRef} value={checkinLink} size={220} level="M" includeMargin={false} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="text" readOnly value={checkinLink} style={{ flex: 1, minWidth: 0 }} />
                        <button type="button" className="customers-button customers-button--primary" onClick={handleCopyLink}>
                          <Copy size={16} />
                        </button>
                      </div>
                      <button type="button" className="customers-button customers-button--primary" onClick={handleDownloadQr}>
                        <Download size={16} /> Download QR
                      </button>
                      <a
                        href={`/kehadiran/${jadwalId}/display`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="customers-button"
                        style={{ textAlign: "center" }}
                      >
                        <Monitor size={16} /> Buka Halaman Display
                      </a>
                    </div>
                  )}

                  {jadwalId && (
                    <div style={{ position: "relative" }}>
                      <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>
                        Tandai Hadir Manual
                      </label>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ketik nama atau nomor WA..."
                        style={{ width: "100%" }}
                      />
                      {searchResults.length > 0 && (
                        <div style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%", maxHeight: 200, overflowY: "auto" }}>
                          {searchResults.map((c) => (
                            <div
                              key={c.id}
                              style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 13 }}
                              onClick={() => handleManualCheckin(c)}
                            >
                              <span>{c.nama} — {c.wa}</span>
                              <span style={{ color: "#16a34a" }}>Tandai hadir</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
          </div>

          {/* KANAN: hanya data - daftar hadir semua sesi produk terpilih */}
          <div style={{ flex: 1, minWidth: 320 }}>
            {!produkId ? (
              <section className="panel users-panel">
                <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                  Pilih produk di sebelah kiri untuk melihat daftar hadir.
                </p>
              </section>
            ) : (
              <section className="panel users-panel">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Directory</p>
                    <h3 className="panel__title">Daftar Hadir — semua sesi</h3>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sesi</th>
                        <th>Customer</th>
                        <th>Sumber</th>
                        <th>Dicatat Oleh</th>
                        <th style={{ textAlign: "right" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="table-empty">Memuat data...</td></tr>
                      ) : kehadiran.length > 0 ? (
                        kehadiran.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{row.nama_jadwal_snapshot || "-"}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {row.tanggal_jadwal ? new Date(row.tanggal_jadwal).toLocaleString("id-ID") : "-"}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{row.customer_rel?.nama || "-"}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{row.customer_rel?.wa || "-"}</div>
                            </td>
                            <td>{row.source_type === "order" ? "Order" : row.source_type === "invitation" ? "Invitation" : "Walk-in"}</td>
                            <td>{row.checked_by_rel?.nama || "Self check-in"}</td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className="action-btn action-btn--danger"
                                title="Batalkan kehadiran"
                                onClick={() => handleDelete(row)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="table-empty">Belum ada yang check-in untuk produk ini.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
