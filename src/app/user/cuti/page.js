"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Calendar, FileText, PlusCircle } from "lucide-react";

export default function UserCutiPage() {
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    type_cuti: "",
    alasan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [types, setTypes] = useState([]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      start_date: "",
      end_date: "",
      type_cuti: "",
      alasan: "",
    });
  };

  const loadTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("hr/type-cuti?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setTypes(result.data || []);
      }
    } catch (error) {
      console.error("Error loading type cuti:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(getApiUrl("user/cuti?all=true"), {
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
      console.error("Error loading cuti:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      alert("Tanggal mulai dan tanggal selesai wajib diisi.");
      return;
    }

    if (!form.type_cuti) {
      alert("Silakan pilih jenis cuti.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(getApiUrl("user/cuti"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Gagal mengajukan cuti.");
        return;
      }

      alert("Pengajuan cuti berhasil dikirim.");
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error submit cuti:", error);
      alert("Terjadi kesalahan saat mengajukan cuti.");
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

  const getStatusBadgeClass = (status) => {
    if (status === "disetujui") return "status-approve";
    if (status === "ditolak") return "status-reject";
    return "status-pending";
  };

  return (
    <Layout title="Pengajuan Cuti">
      <div className="cuti-user-page">
        <div className="page-header">
          <div>
            <h1>Pengajuan Cuti</h1>
            <p>Ajukan cuti dan lihat riwayat pengajuan Anda</p>
          </div>
        </div>

        <div className="grid">
          <div className="card form-card">
            <h2>
              <PlusCircle size={18} /> Form Pengajuan Cuti
            </h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>
                  <Calendar size={14} /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    handleChange("end_date", e.target.value)
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Jenis Cuti</label>
                <select
                  value={form.type_cuti}
                  onChange={(e) => handleChange("type_cuti", e.target.value)}
                  required
                >
                  <option value="">Pilih jenis cuti</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.nama}{" "}
                      {type.kuota != null ? `(Kuota: ${type.kuota} hari)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group form-group-full">
                <label>Alasan</label>
                <textarea
                  rows={3}
                  value={form.alasan}
                  onChange={(e) => handleChange("alasan", e.target.value)}
                  placeholder="Tulis alasan pengajuan cuti"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Mengirim..." : "Ajukan Cuti"}
                </button>
              </div>
            </form>
          </div>

          <div className="card history-card">
            <h2>
              <FileText size={18} /> Riwayat Pengajuan Cuti
            </h2>

            {loading ? (
              <div className="loading-state">Memuat data...</div>
            ) : data.length === 0 ? (
              <div className="empty-state">
                <FileText size={40} />
                <p>Belum ada pengajuan cuti.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Periode</th>
                      <th>Jenis Cuti</th>
                      <th>Status Direksi</th>
                      <th>Status</th>
                      <th>Alasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          {formatDate(item.start_date)} -{" "}
                          {formatDate(item.end_date)}
                        </td>
                        <td>{item.type_rel?.nama || "-"}</td>
                        <td>
                          {item.approval_direksi ? (
                            <span
                              className={`status-badge ${
                                item.status_approval_direksi === "approved"
                                  ? "status-approve"
                                  : item.status_approval_direksi === "rejected"
                                  ? "status-reject"
                                  : "status-pending"
                              }`}
                            >
                              {item.status_approval_direksi === "approved"
                                ? "Disetujui"
                                : item.status_approval_direksi === "rejected"
                                ? "Ditolak"
                                : "Menunggu"}
                            </span>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: "12px" }}>-</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${getStatusBadgeClass(
                              item.status_cuti
                            )}`}
                          >
                            {item.status_cuti || "pending"}
                          </span>
                        </td>
                        <td>{item.alasan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .cuti-user-page {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .page-header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
          }

          .page-header p {
            margin: 0;
            color: #6b7280;
            font-size: 0.9rem;
          }

          .grid {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
            gap: 1.5rem;
            margin-top: 1.75rem;
          }

          .card {
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            padding: 1.5rem;
          }

          .card h2 {
            margin: 0 0 1.25rem 0;
            font-size: 1rem;
            font-weight: 600;
            color: #111827;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem 1.5rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-group-full {
            grid-column: 1 / -1;
          }

          .form-group label {
            font-size: 0.85rem;
            font-weight: 500;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 0.4rem;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 0.6rem 0.75rem;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            font-size: 0.9rem;
            transition: border-color 0.15s, box-shadow 0.15s;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2);
          }

          .form-actions {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 0.5rem;
          }

          .btn {
            padding: 0.55rem 1.25rem;
            border-radius: 999px;
            border: none;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-primary {
            background: #6366f1;
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: #4f46e5;
          }

          .btn-secondary {
            background: #f9fafb;
            color: #111827;
            border: 1px solid #e5e7eb;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #e5e7eb;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .loading-state,
          .empty-state {
            padding: 1.5rem 0.5rem;
            text-align: center;
            color: #6b7280;
            font-size: 0.9rem;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }

          .table-wrapper {
            margin-top: 0.5rem;
            overflow-x: auto;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.87rem;
          }

          .data-table thead {
            background: #f9fafb;
          }

          .data-table th,
          .data-table td {
            padding: 0.65rem 0.75rem;
            border-bottom: 1px solid #f3f4f6;
            text-align: left;
          }

          .data-table th {
            font-weight: 600;
            color: #4b5563;
          }

          .data-table tbody tr:hover {
            background: #f9fafb;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.15rem 0.7rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .status-approve {
            background: #dcfce7;
            color: #15803d;
          }

          .status-reject {
            background: #fee2e2;
            color: #b91c1c;
          }

          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }

          @media (max-width: 900px) {
            .cuti-user-page {
              padding: 1.25rem;
            }

            .grid {
              grid-template-columns: 1fr;
            }

            .form-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}

