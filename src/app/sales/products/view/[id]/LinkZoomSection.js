"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const defaultDuration = 60;

// Format tanggal dari backend ke dd/mm/yyyy
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

// Convert backend datetime to datetime-local format
const convertToDatetimeLocal = (backendTime) => {
  if (!backendTime) return "";
  const dateTimeStr = backendTime.replace(" ", "T");
  return dateTimeStr.substring(0, 16);
};

// Format datetime-local untuk backend
const formatStartTime = (value) => {
  if (!value) return "";
  const [datePart, timePartRaw] = value.split("T");
  if (!datePart || !timePartRaw) return "";
  const timePart =
    timePartRaw.length === 5
      ? `${timePartRaw}:00`
      : timePartRaw.includes(":")
      ? timePartRaw
      : `${timePartRaw}:00`;
  return `${datePart} ${timePart}`;
};

export default function LinkZoomSection({ productId, productName }) {
  const [webinars, setWebinars] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [selectedWebinar, setSelectedWebinar] = useState(null);
  const [saving, setSaving] = useState(false);

  // Record modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordLink, setRecordLink] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    topic: "",
    start_time: "",
    duration: defaultDuration,
    waiting_room: true,
    host_video: true,
    participant_video: true,
    mute_upon_entry: true,
    join_before_host: true,
  });

  // Fetch webinars list
  useEffect(() => {
    fetchWebinars();
    fetchRecords();
  }, [productId]);

  const fetchWebinars = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      
      const res = await fetch(`/api/sales/webinar/${productId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success && Array.isArray(data.data)) {
        setWebinars(data.data);
        console.log("✅ [LINK ZOOM] Webinars loaded:", data.data);
      } else {
        setWebinars([]);
      }
    } catch (error) {
      console.error("❌ [LINK ZOOM] Error fetching webinars:", error);
      toast.error("Gagal memuat data webinar");
      setWebinars([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    if (!productId) {
      setLoadingRecords(false);
      return;
    }

    try {
      setLoadingRecords(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(`/api/sales/zoom-record/${productId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success && Array.isArray(data.data)) {
        setRecords(data.data);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("❌ [ZOOM RECORD] Error fetching records:", error);
      toast.error("Gagal memuat link record zoom");
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      topic: productName ? `Webinar ${productName}` : "",
      start_time: "",
      duration: defaultDuration,
      waiting_room: true,
      host_video: true,
      participant_video: true,
      mute_upon_entry: true,
      join_before_host: true,
    });
    setModalMode("create");
    setSelectedWebinar(null);
    setShowModal(true);
  };

  const openEditModal = (webinar) => {
    setFormData({
      topic: webinar.topic || "",
      start_time: convertToDatetimeLocal(webinar.start_time),
      duration: webinar.duration || defaultDuration,
      waiting_room: webinar.waiting_room !== undefined ? webinar.waiting_room : true,
      host_video: webinar.host_video !== undefined ? webinar.host_video : true,
      participant_video: webinar.participant_video !== undefined ? webinar.participant_video : true,
      mute_upon_entry: webinar.mute_upon_entry !== undefined ? webinar.mute_upon_entry : true,
      join_before_host: webinar.join_before_host !== undefined ? webinar.join_before_host : true,
    });
    setModalMode("edit");
    setSelectedWebinar(webinar);
    setShowModal(true);
  };

  const openViewModal = (webinar) => {
    setSelectedWebinar(webinar);
    setShowViewModal(true);
  };

  const handleJoinAsHost = (webinar) => {
    const startUrl = webinar?.start_url;
    if (!startUrl) {
      toast.error("Start URL (host) belum tersedia. Silakan buat/refresh link Zoom terlebih dahulu.");
      return;
    }
    window.open(startUrl, "_blank", "noopener,noreferrer");
  };

  const openRecordModal = () => {
    setRecordLink("");
    setShowRecordModal(true);
  };

  const handleSaveRecord = async (e) => {
    e?.preventDefault?.();
    if (!productId) return;

    const link = (recordLink || "").trim();
    if (!link) {
      toast.error("Link wajib diisi");
      return;
    }

    setSavingRecord(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      const res = await fetch(`/api/sales/zoom-record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id_produk: Number(productId),
          link,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Gagal menyimpan link record");
      }

      toast.success(data?.message || "Link record berhasil ditambahkan");
      setShowRecordModal(false);
      fetchRecords();
    } catch (err) {
      console.error("❌ [ZOOM RECORD] Save error:", err);
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!recordId) return;
    const ok = window.confirm("Hapus link record ini?");
    if (!ok) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const res = await fetch(`/api/sales/zoom-record/delete/${recordId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Gagal menghapus record");
      }
      toast.success(data?.message || "Record berhasil dihapus");
      fetchRecords();
    } catch (err) {
      console.error("❌ [ZOOM RECORD] Delete error:", err);
      toast.error(err.message || "Terjadi kesalahan");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      toast.error("Topic wajib diisi");
      return;
    }
    
    if (!formData.start_time) {
      toast.error("Jadwal mulai wajib diisi");
      return;
    }

    const formattedStart = formatStartTime(formData.start_time);
    if (!formattedStart) {
      toast.error("Format jadwal tidak valid");
      return;
    }

    setSaving(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      const payload = {
        topic: formData.topic.trim(),
        start_time: formattedStart,
        duration: Number(formData.duration) || defaultDuration,
        waiting_room: Boolean(formData.waiting_room),
        host_video: Boolean(formData.host_video),
        participant_video: Boolean(formData.participant_video),
        mute_upon_entry: Boolean(formData.mute_upon_entry),
        join_before_host: Boolean(formData.join_before_host),
      };

      let url = "/api/sales/webinar";
      let method = "POST";

      if (modalMode === "edit" && selectedWebinar?.id) {
        // Menggunakan PUT untuk update
        url = `/api/sales/webinar/${selectedWebinar.id}`;
        method = "PUT";
      } else {
        payload.produk = Number(productId);
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        const errorMessage = data?.message || data?.error || "Gagal menyimpan webinar";
        
        // Error handling untuk berbagai jenis error
        console.error("❌ [LINK ZOOM] Backend error:", errorMessage);
        
        throw new Error(errorMessage);
      }

      toast.success(data.message || "Webinar berhasil disimpan");
      setShowModal(false);
      fetchWebinars(); // Refresh list
    } catch (error) {
      console.error("❌ [LINK ZOOM] Error saving webinar:", error);
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="linkzoom-card">
      <div className="linkzoom-header">
        <h2>Link Zoom</h2>
        <button className="btn-add" onClick={openCreateModal}>
          Tambah Link
        </button>
      </div>

      {loading ? (
        <div className="linkzoom-loading">
          <p>Memuat data webinar...</p>
        </div>
      ) : webinars.length === 0 ? (
        <div className="linkzoom-empty">
          <p>Belum ada data link zoom</p>
          <button className="btn-add-empty" onClick={openCreateModal}>
            Tambah Link
          </button>
        </div>
      ) : (
        <div className="linkzoom-table-wrapper">
          <table className="linkzoom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Topic Webinar</th>
                <th>Jadwal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {webinars.map((webinar, index) => (
                <tr key={webinar.id}>
                  <td>{index + 1}</td>
                  <td>{webinar.topic || "-"}</td>
                  <td>{formatDate(webinar.start_time)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={() => openViewModal(webinar)}
                      >
                        View
                      </button>
                      <button
                        className="btn-host"
                        onClick={() => handleJoinAsHost(webinar)}
                        title="Masuk sebagai host (Start URL)"
                      >
                        Masuk Zoom
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => openEditModal(webinar)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === "create" ? "Tambah Link Zoom" : "Edit Link Zoom"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="linkzoom-form">
              <label>
                Topic Webinar *
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Masukkan judul sesi webinar"
                  required
                />
              </label>

              <label>
                Jadwal Mulai *
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </label>

              <label>
                Durasi (menit) *
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </label>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.waiting_room}
                    onChange={(e) => setFormData({ ...formData, waiting_room: e.target.checked })}
                  />
                  <span>Waiting Room</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.host_video}
                    onChange={(e) => setFormData({ ...formData, host_video: e.target.checked })}
                  />
                  <span>Host Video</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.participant_video}
                    onChange={(e) => setFormData({ ...formData, participant_video: e.target.checked })}
                  />
                  <span>Participant Video</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.mute_upon_entry}
                    onChange={(e) => setFormData({ ...formData, mute_upon_entry: e.target.checked })}
                  />
                  <span>Mute Upon Entry</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.join_before_host}
                    onChange={(e) => setFormData({ ...formData, join_before_host: e.target.checked })}
                  />
                  <span>Join Before Host</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedWebinar && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Link Zoom</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>

            <div className="view-content">
              {selectedWebinar.meeting_id && (
                <div className="view-item">
                  <span>Meeting ID</span>
                  <p>{selectedWebinar.meeting_id}</p>
                </div>
              )}

              {selectedWebinar.password && (
                <div className="view-item">
                  <span>Password</span>
                  <p>{selectedWebinar.password}</p>
                </div>
              )}

              {selectedWebinar.topic && (
                <div className="view-item">
                  <span>Topic</span>
                  <p>{selectedWebinar.topic}</p>
                </div>
              )}

              {selectedWebinar.start_time && (
                <div className="view-item">
                  <span>Jadwal</span>
                  <p>{formatDate(selectedWebinar.start_time)}</p>
                </div>
              )}

              {selectedWebinar.duration && (
                <div className="view-item">
                  <span>Durasi</span>
                  <p>{selectedWebinar.duration} menit</p>
                </div>
              )}

              {selectedWebinar.join_url && (
                <div className="view-item span-full">
                  <span>Join URL</span>
                  <div className="url-row">
                    <p>{selectedWebinar.join_url}</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedWebinar.join_url);
                        toast.success("Link berhasil disalin");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {selectedWebinar.start_url && (
                <div className="view-item span-full">
                  <span>Start URL</span>
                  <div className="url-row">
                    <p>{selectedWebinar.start_url}</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedWebinar.start_url);
                        toast.success("Link berhasil disalin");
                      }}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJoinAsHost(selectedWebinar)}
                      title="Masuk sebagai host (Start URL)"
                    >
                      Masuk Zoom
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowViewModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === RECORDING TABLE === */}
      <div className="linkzoom-header" style={{ marginTop: 28 }}>
        <h2>Record Zoom</h2>
        <button className="btn-add" onClick={openRecordModal}>
          Tambah Link Record
        </button>
      </div>

      {loadingRecords ? (
        <div className="linkzoom-loading">
          <p>Memuat link record...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="linkzoom-empty">
          <p>Belum ada link record zoom</p>
          <button className="btn-add-empty" onClick={openRecordModal}>
            Tambah Link Record
          </button>
        </div>
      ) : (
        <div className="linkzoom-table-wrapper">
          <table className="linkzoom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Link</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, index) => (
                <tr key={rec.id}>
                  <td>{index + 1}</td>
                  <td style={{ wordBreak: "break-all" }}>{rec.link || "-"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        type="button"
                        onClick={() => window.open(rec.link, "_blank", "noopener,noreferrer")}
                      >
                        Open
                      </button>
                      <button
                        className="btn-host"
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(rec.link);
                          toast.success("Link berhasil disalin");
                        }}
                      >
                        Copy
                      </button>
                      <button
                        className="btn-edit"
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Modal */}
      {showRecordModal && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Link Record Zoom</h3>
              <button className="modal-close" onClick={() => setShowRecordModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="linkzoom-form">
              <label>
                Link Record *
                <input
                  type="url"
                  value={recordLink}
                  onChange={(e) => setRecordLink(e.target.value)}
                  placeholder="https://..."
                  required
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRecordModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-submit" disabled={savingRecord}>
                  {savingRecord ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .linkzoom-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.07);
          margin-top: 20px;
        }

        .linkzoom-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .linkzoom-header h2 {
          margin: 0;
          font-size: 20px;
          color: #111827;
        }

        .btn-add,
        .btn-add-empty {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .btn-add:hover,
        .btn-add-empty:hover {
          background: #1d4ed8;
        }

        .linkzoom-loading,
        .linkzoom-empty {
          padding: 40px;
          text-align: center;
          color: #6b7280;
        }

        .linkzoom-empty {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }

        .linkzoom-table-wrapper {
          overflow-x: auto;
        }

        .linkzoom-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .linkzoom-table thead {
          background: #f9fafb;
        }

        .linkzoom-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          font-size: 14px;
        }

        .linkzoom-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          color: #111827;
          font-size: 14px;
        }

        .linkzoom-table tbody tr:hover {
          background: #f9fafb;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-view,
        .btn-edit,
        .btn-host {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view {
          background: #10b981;
          color: white;
        }

        .btn-view:hover {
          background: #059669;
        }

        .btn-edit {
          background: #f59e0b;
          color: white;
        }

        .btn-edit:hover {
          background: #d97706;
        }

        .btn-host {
          background: #2563eb;
          color: white;
        }

        .btn-host:hover {
          background: #1d4ed8;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          color: #6b7280;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .modal-close:hover {
          background: #f3f4f6;
        }

        .linkzoom-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .linkzoom-form label {
          display: flex;
          flex-direction: column;
          font-weight: 600;
          color: #111827;
          gap: 8px;
          font-size: 14px;
        }

        .linkzoom-form input[type="text"],
        .linkzoom-form input[type="datetime-local"],
        .linkzoom-form input[type="number"] {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
        }

        .linkzoom-form input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-checkboxes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn-cancel,
        .btn-submit,
        .btn-close {
          padding: 10px 20px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-submit {
          background: #2563eb;
          color: white;
        }

        .btn-submit:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-submit:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }

        .btn-close {
          background: #2563eb;
          color: white;
        }

        .btn-close:hover {
          background: #1d4ed8;
        }

        /* View Modal */
        .view-modal .view-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .view-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .view-item.span-full {
          grid-column: 1 / -1;
        }

        .view-item span {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        .view-item p {
          margin: 0;
          font-size: 14px;
          color: #111827;
          word-break: break-all;
        }

        .view-item .url-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .view-item .url-row p {
          flex: 1;
          margin: 0;
        }

        .view-item .url-row button {
          padding: 6px 12px;
          border: none;
          border-radius: 8px;
          background: #2563eb;
          color: white;
          cursor: pointer;
          font-size: 13px;
          white-space: nowrap;
        }

        .view-item .url-row button:hover {
          background: #1d4ed8;
        }

        .view-modal .modal-actions {
          padding: 0 24px 24px;
        }

        @media (max-width: 768px) {
          .form-checkboxes {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
