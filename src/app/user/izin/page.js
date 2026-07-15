"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Calendar, FileText, PlusCircle, Clock, X as XIcon } from "lucide-react";

export default function UserIzinPage() {
  const [form, setForm] = useState({
    jenis_izin: "",
    tanggal: "",
    tanggal_mulai: "",
    tanggal_akhir: "",
    jam_mulai: "",
    alasan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [karyawanId, setKaryawanId] = useState(null);

  useEffect(() => {
    loadKaryawanId();
    loadData();
  }, []);

  const loadKaryawanId = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("hr/karyawan?all=true&status=1"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          const karyawan = result.data.find(
            (k) => k.user_id === user.id || k.user_id === user.user
          );
          if (karyawan) {
            setKaryawanId(karyawan.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading karyawan:", error);
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      jenis_izin: "",
      tanggal: "",
      tanggal_mulai: "",
      tanggal_akhir: "",
      jam_mulai: "",
      alasan: "",
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(getApiUrl("hr/izin/by-current-user"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      }
    } catch (error) {
      console.error("Error loading izin:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.jenis_izin) {
      alert("Silakan pilih jenis izin.");
      return;
    }

    if (form.jenis_izin === "WFH") {
      if (!form.tanggal_mulai || !form.tanggal_akhir) {
        alert("Tanggal mulai dan tanggal akhir wajib diisi untuk WFH.");
        return;
      }
    } else {
      if (!form.tanggal) {
        alert("Tanggal wajib diisi.");
        return;
      }
      if (form.jenis_izin === "izin_telat" && !form.jam_mulai) {
        alert("Jam mulai wajib diisi untuk izin telat.");
        return;
      }
    }

    if (!form.alasan || form.alasan.length < 10) {
      alert("Alasan wajib diisi minimal 10 karakter.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const payload = {
        jenis_izin: form.jenis_izin,
        alasan: form.alasan,
      };

      if (form.jenis_izin === "WFH") {
        payload.tanggal_mulai = form.tanggal_mulai;
        payload.tanggal_akhir = form.tanggal_akhir;
      } else {
        payload.tanggal = form.tanggal;
        if (form.jenis_izin === "izin_telat") {
          payload.jam_mulai = form.jam_mulai;
        }
      }

      const response = await fetch(getApiUrl("hr/izin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Gagal mengajukan izin.");
        return;
      }

      alert("Pengajuan izin berhasil dikirim.");
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error submit izin:", error);
      alert("Terjadi kesalahan saat mengajukan izin.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      return timeString.substring(0, 5);
    } catch {
      return timeString;
    }
  };

  const getJenisIzinLabel = (jenis) => {
    const labels = {
      WFH: "Work From Home",
      izin_telat: "Izin Telat",
      izin_sakit: "Izin Sakit",
    };
    return labels[jenis] || jenis;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "approved") return "status-approve";
    if (status === "rejected") return "status-reject";
    return "status-pending";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      approved: "Disetujui",
      rejected: "Ditolak",
    };
    return labels[status] || status;
  };

  return (
    <Layout title="Pengajuan Izin">
      <div className="izin-user-page">
        <div className="page-header">
          <div>
            <h1>Pengajuan Izin</h1>
            <p>Ajukan izin dan lihat riwayat pengajuan Anda</p>
          </div>
        </div>

        <div className="grid">
          <div className="card form-card">
            <h2>
              <PlusCircle size={18} /> Form Pengajuan Izin
            </h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Jenis Izin *</label>
                <select
                  value={form.jenis_izin}
                  onChange={(e) => handleChange("jenis_izin", e.target.value)}
                  required
                >
                  <option value="">Pilih Jenis Izin</option>
                  <option value="WFH">Work From Home</option>
                  <option value="izin_telat">Izin Telat</option>
                  <option value="izin_sakit">Izin Sakit</option>
                </select>
              </div>

              {form.jenis_izin === "WFH" && (
                <>
                  <div className="form-group">
                    <label>
                      <Calendar size={14} /> Tanggal Mulai *
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_mulai}
                      onChange={(e) =>
                        handleChange("tanggal_mulai", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <Calendar size={14} /> Tanggal Akhir *
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_akhir}
                      onChange={(e) =>
                        handleChange("tanggal_akhir", e.target.value)
                      }
                      min={form.tanggal_mulai}
                      required
                    />
                  </div>
                </>
              )}

              {(form.jenis_izin === "izin_telat" ||
                form.jenis_izin === "izin_sakit") && (
                <>
                  <div className="form-group">
                    <label>
                      <Calendar size={14} /> Tanggal *
                    </label>
                    <input
                      type="date"
                      value={form.tanggal}
                      onChange={(e) => handleChange("tanggal", e.target.value)}
                      required
                    />
                  </div>
                  {form.jenis_izin === "izin_telat" && (
                    <div className="form-group">
                      <label>
                        <Clock size={14} /> Jam Mulai *
                      </label>
                      <input
                        type="time"
                        value={form.jam_mulai}
                        onChange={(e) =>
                          handleChange("jam_mulai", e.target.value)
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <div className="form-group full-width">
                <label>
                  <FileText size={14} /> Alasan *
                </label>
                <textarea
                  value={form.alasan}
                  onChange={(e) => handleChange("alasan", e.target.value)}
                  rows={4}
                  placeholder="Masukkan alasan izin (minimal 10 karakter)"
                  required
                  minLength={10}
                />
              </div>

              <div className="form-actions full-width">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Mengirim..." : "Ajukan Izin"}
                </button>
              </div>
            </form>
          </div>

          <div className="card history-card">
            <h2>
              <FileText size={18} /> Riwayat Pengajuan
            </h2>
            {loading ? (
              <div className="loading-state">Memuat data...</div>
            ) : data.length === 0 ? (
              <div className="empty-state">
                <p>Belum ada pengajuan izin</p>
              </div>
            ) : (
              <div className="history-list">
                {data.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <div>
                        <h3>{getJenisIzinLabel(item.jenis_izin)}</h3>
                        <p className="history-date">
                          {item.jenis_izin === "WFH"
                            ? `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_akhir)}`
                            : formatDate(item.tanggal)}
                          {item.jam_mulai && (
                            <span style={{ marginLeft: 8 }}>
                              <Clock size={12} style={{ marginRight: 4 }} />
                              {formatTime(item.jam_mulai)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                        {item.approval_direksi && (
                          <span
                            className={`status-badge ${
                              item.status_approval_direksi === "approved"
                                ? "status-approve"
                                : item.status_approval_direksi === "rejected"
                                ? "status-reject"
                                : "status-pending"
                            }`}
                            style={{ fontSize: "11px" }}
                          >
                            Direksi: {item.status_approval_direksi === "approved"
                              ? "Disetujui"
                              : item.status_approval_direksi === "rejected"
                              ? "Ditolak"
                              : "Menunggu"}
                          </span>
                        )}
                        <span
                          className={`status-badge ${getStatusBadgeClass(
                            item.status_izin
                          )}`}
                        >
                          {getStatusLabel(item.status_izin)}
                        </span>
                      </div>
                    </div>
                    <p className="history-alasan">{item.alasan}</p>
                    {item.catatan_approval_direksi && (
                      <p className="history-catatan">
                        <strong>Catatan Direksi:</strong> {item.catatan_approval_direksi}
                      </p>
                    )}
                    {item.catatan_approval && (
                      <p className="history-catatan">
                        <strong>Catatan HR:</strong> {item.catatan_approval}
                      </p>
                    )}
                    {item.approval_direksi_rel && (
                      <p className="history-approver">
                        Direksi: {item.approval_direksi_rel.nama}
                      </p>
                    )}
                    {item.approved_by_rel && (
                      <p className="history-approver">
                        Disetujui oleh HR: {item.approved_by_rel.nama}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .izin-user-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .page-header p {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }

        .card h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group select:focus,
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .history-item {
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }

        .history-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .history-date {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
          display: flex;
          align-items: center;
        }

        .history-alasan {
          font-size: 14px;
          color: #374151;
          margin: 8px 0;
        }

        .history-catatan {
          font-size: 13px;
          color: #6b7280;
          margin: 8px 0;
          padding: 8px;
          background: #f3f4f6;
          border-radius: 4px;
        }

        .history-approver {
          font-size: 12px;
          color: #6b7280;
          margin: 8px 0 0 0;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-approve {
          background: #d1fae5;
          color: #065f46;
        }

        .status-reject {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .loading-state,
        .empty-state {
          padding: 48px;
          text-align: center;
          color: #6b7280;
        }
      `}</style>
    </Layout>
  );
}
