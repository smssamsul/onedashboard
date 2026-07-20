"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

const FOLLOWUP_TABS = [
  { type: "unlimited", label: "Followup Reminder" },
  { type: 5, label: "Welcome" },
  { type: 6, label: "Processing" },
  { type: 7, label: "Complete" },
  { type: "upselling", label: "Upselling" },
  { type: 9, label: "Redirect" },
  { type: 10, label: "Cancel" },
];

const INSTANT_SEND_TYPES = [5, 6, 7, 9, 10];

const AUTOTEXT_OPTIONS = [
  { label: "Pilih Autotext", value: "" },
  { label: "Nama Customer", value: "{{customer_name}}" },
  { label: "Nama Produk", value: "{{product_name}}" },
  { label: "Tanggal Order", value: "{{order_date}}" },
  { label: "Total Order", value: "{{order_total}}" },
  { label: "Metode Pembayaran", value: "{{payment_method}}" },
  { label: "Waktu Pembayaran", value: "{{payment_time}}" },
  { label: "Pembayaran Ke", value: "{{payment_ke}}" },
  { label: "Jumlah Bayar", value: "{{amount}}" },
  { label: "Total Tagihan", value: "{{amount_total}}" },
  { label: "Sisa Tagihan", value: "{{amount_remaining}}" },
  { label: "Sisa Tagihan (Formatted)", value: "{{amount_remaining_formatted}}" },
];

// Mapping nama ke type untuk instant types
// (nama lama "Register"/"Selesai" dipertahankan untuk kompatibilitas data lama)
const NAMA_TO_TYPE = {
  "Register": "5",
  "Welcome": "5",
  "Processing": "6",
  "Selesai": "7",
  "Complete": "7",
  "Redirect": "9",
  "Cancel": "10",
};

export default function FollowupSection() {
  const params = useParams();
  const produkId = params.id;

  const [activeType, setActiveType] = useState("unlimited");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // INLINE FORM STATE (for non-unlimited, non-upselling types)
  const [text, setText] = useState("");
  const [eventValue, setEventValue] = useState("0d-00:00");
  const [scheduleDay, setScheduleDay] = useState(0);
  const [scheduleTime, setScheduleTime] = useState("00:00");
  const [autoSend, setAutoSend] = useState(false);
  const [selectedAutotextInline, setSelectedAutotextInline] = useState("");
  const [showEmojiPickerInline, setShowEmojiPickerInline] = useState(false);
  const textareaRefInline = useRef(null);

  // MODAL STATE (for unlimited type & upselling type)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState({
    id: null,
    nama: "",
    text: "",
    event: "1d-09:00",
    status: "1",
    scheduleDay: 1,
    scheduleTime: "09:00",
  });
  const [selectedAutotextModal, setSelectedAutotextModal] = useState("");
  const [showEmojiPickerModal, setShowEmojiPickerModal] = useState(false);
  const textareaRefModal = useRef(null);

  const parseEventValue = (value = "1d-09:00") => {
    const [dayPart = "1d", timePart = "09:00"] = value.split("-");
    const dayNumber = Number(dayPart.replace(/[^0-9]/g, "")) || 0;
    const time = timePart?.trim() ? timePart : "09:00";
    return { days: dayNumber, time };
  };

  const formatEventValue = (days, time) => {
    const safeDay = Math.max(0, Number.isNaN(days) ? 0 : days);
    const safeTime = time || "09:00";
    return `${safeDay}d-${safeTime}`;
  };

  const insertAtCursor = (value, ref, textState, setTextState) => {
    if (!value) return;
    const textarea = ref.current;
    if (!textarea) {
      setTextState((prev) => (prev || "") + value);
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textState.slice(0, start);
    const after = textState.slice(end);
    const newValue = `${before}${value}${after}`;
    setTextState(newValue);
    requestAnimationFrame(() => {
      const newPos = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  // Fetch template follow-up per produk
  useEffect(() => {
    if (!produkId) return;

    setLoading(true);
    const token = localStorage.getItem("token");

    fetch(`${BASE_URL}/sales/template-follup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ produk_id: produkId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const mappedTemplates = (data.data || []).map((tpl) => {
            let mappedType;
            if (String(tpl.type) === "8") {
              mappedType = "upselling";
            } else if (String(tpl.type) === "1" || String(tpl.nama).includes("Follow Up")) {
              mappedType = "unlimited";
            } else {
              mappedType = NAMA_TO_TYPE[tpl.nama] || String(tpl.type);
            }
            return { ...tpl, type: mappedType };
          });
          setTemplates(mappedTemplates);
        } else {
          toast.error(data.message || "Gagal memuat template");
        }
      })
      .catch((err) => {
        toast.error("Gagal memuat template followup");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [produkId]);

  // Update INLINE form state if activeType is instant
  useEffect(() => {
    if (activeType !== "unlimited" && activeType !== "upselling") {
      const tpl = templates.find((t) => String(t.type) === String(activeType) || t.nama === FOLLOWUP_TABS.find(tab => tab.type === activeType)?.label);
      if (tpl) {
        setText(tpl.text || "");
        setEventValue(tpl.event || "0d-00:00");
        const parsed = parseEventValue(tpl.event || "0d-00:00");
        setScheduleDay(parsed.days);
        setScheduleTime(parsed.time);
        setAutoSend(tpl.status === "1");
      } else {
        setText("");
        setEventValue("0d-00:00");
        setScheduleDay(0);
        setScheduleTime("00:00");
        setAutoSend(false);
      }
    }
  }, [activeType, templates]);

  // Save Inline Template
  const handleSaveInline = async () => {
    if (!text.trim()) {
      toast.error("Text tidak boleh kosong");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    const payload = {
      nama: FOLLOWUP_TABS.find((t) => t.type === activeType)?.label || "",
      produk: produkId,
      text: text.trim(),
      type: String(activeType),
      event: eventValue,
      status: autoSend ? "1" : "2",
    };

    try {
      const res = await fetch(`${BASE_URL}/sales/template-follup/store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        const savedTemplate = {
          ...data.data,
          type: activeType,
          text: text.trim(),
          event: eventValue,
          status: autoSend ? "1" : "2",
        };

        setTemplates((prev) => {
          const exists = prev.find((tpl) => String(tpl.type) === String(activeType));
          if (exists) {
            return prev.map((tpl) => (String(tpl.type) === String(activeType) ? savedTemplate : tpl));
          } else {
            return [...prev, savedTemplate];
          }
        });
        toast.success(data.message || "Template berhasil disimpan!");
      } else {
        toast.error(data.message || "Gagal menyimpan template");
      }
    } catch (err) {
      toast.error("Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  // Open Modal for Create
  const handleOpenModal = () => {
    const isUpselling = activeType === "upselling";
    setModalTitle(isUpselling ? "Tambah Upselling Baru" : "Tambah Reminder Baru");

    // Hitung index untuk nama default
    const existingList = templates.filter(t => t.type === activeType);
    const newIdx = existingList.length + 1;
    const defaultName = isUpselling ? `Upselling ${newIdx}` : `Follow Up ${newIdx}`;

    setModalData({
      id: null,
      nama: defaultName,
      text: "",
      event: "1d-09:00",
      status: "1",
      scheduleDay: 1,
      scheduleTime: "09:00",
    });
    setSelectedAutotextModal("");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleEditModal = (tpl) => {
    const parsed = parseEventValue(tpl.event);
    setModalTitle(activeType === "upselling" ? "Edit Upselling" : "Edit Reminder");
    setModalData({
      id: tpl.id,
      nama: tpl.nama || "",
      text: tpl.text || "",
      event: tpl.event || "1d-09:00",
      status: tpl.status || "1",
      scheduleDay: parsed.days,
      scheduleTime: parsed.time,
    });
    setSelectedAutotextModal("");
    setIsModalOpen(true);
  };

  // Save Modal Template
  const handleSaveModal = async () => {
    if (!modalData.text.trim()) {
      toast.error("Text harus diisi");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    const mappedType = activeType === "upselling" ? "8" : "1";
    // Jika tidak ada input nama di modal, kita gunakan nama yang di set state (otomatis)
    const payload = {
      nama: modalData.nama.trim() || (activeType === "upselling" ? "Upselling" : "Follow Up"),
      produk: produkId,
      text: modalData.text.trim(),
      type: mappedType,
      event: modalData.event,
      status: modalData.status,
    };

    if (modalData.id) {
      payload.id = modalData.id;
    }

    const endpoint = modalData.id
      ? `${BASE_URL}/sales/template-follup/update/${modalData.id}`
      : `${BASE_URL}/sales/template-follup/store`;

    try {
      const res = await fetch(endpoint, {
        method: "POST", // assume update also uses POST or adapt if PUT is needed
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        const savedTemplate = {
          ...data.data,
          id: modalData.id || data.data.id,
          type: activeType,
          nama: payload.nama,
          text: modalData.text.trim(),
          event: modalData.event,
          status: modalData.status,
        };

        setTemplates((prev) => {
          if (modalData.id) {
            return prev.map((tpl) => tpl.id === modalData.id ? savedTemplate : tpl);
          } else {
            return [...prev, savedTemplate];
          }
        });

        toast.success(data.message || "Template berhasil disimpan!");
        setIsModalOpen(false);
      } else {
        toast.error(data.message || "Gagal menyimpan template");
      }
    } catch (err) {
      toast.error("Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/sales/template-follup/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
        toast.success("Template berhasil dihapus");
      } else {
        toast.error("Gagal menghapus template");
      }
    } catch (err) {
      toast.error("Gagal menghapus template");
    }
  };

  const renderActiveTabContent = () => {
    if (activeType === "unlimited" || activeType === "upselling") {
      const list = templates.filter(t => t.type === activeType);
      const isUpselling = activeType === "upselling";
      const title = isUpselling ? "Upselling (Unlimited)" : "Follow Up / Reminder (Unlimited)";
      const subtitle = isUpselling ? "Tambahkan pesan upselling secara berurutan." : "Tambahkan pesan followup secara berurutan.";
      const btnText = isUpselling ? "+ Tambah upselling" : "+ Tambah reminder";
      const emptyText = isUpselling ? "Belum ada upselling. Silakan klik Tambah upselling." : "Belum ada reminder. Silakan klik Tambah reminder.";

      return (
        <div className="unlimited-wrapper">
          <div className="unlimited-header-area">
            <h3 className="unlimited-title">{title}</h3>
            <p className="unlimited-subtitle">{subtitle}</p>
            <button className="btn-add-green" onClick={handleOpenModal}>
              {btnText}
            </button>
          </div>

          <div className="unlimited-list">
            {list.length === 0 ? (
              <div className="empty-dashed-box">
                <i>{emptyText}</i>
              </div>
            ) : (
              list.map((tpl) => {
                const parsed = parseEventValue(tpl.event);
                return (
                  <div key={tpl.id} className="fu-item-card">
                    <div className="fu-item-header">
                      <div className="fu-item-title">
                        <span className="status-indicator" style={{ background: tpl.status === "1" ? "#10B981" : "#EF4444" }}></span>
                        {tpl.nama}
                      </div>
                      <div className="fu-item-actions">
                        <button className="edit-btn" onClick={() => handleEditModal(tpl)}><i className="pi pi-pencil" /></button>
                        <button className="delete-btn" onClick={() => handleDelete(tpl.id)}><i className="pi pi-trash" /></button>
                      </div>
                    </div>
                    <div className="fu-item-meta">
                      {isUpselling ? (
                        <span className="meta-schedule"><i className="pi pi-calendar-plus" /> H+{parsed.days} dari Event ({parsed.time})</span>
                      ) : (
                        <span className="meta-schedule"><i className="pi pi-clock" /> H+{parsed.days} ({parsed.time})</span>
                      )}
                    </div>
                    <div className="fu-item-preview">{tpl.text?.substring(0, 80)}...</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // Inline form for Instant Sends
    return (
      <div className="inline-form-section">
        <label className="label">Pengaturan Text</label>
        <textarea
          ref={textareaRefInline}
          className="followup-textarea"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis template followup disini..."
        />

        <div className="control-row">
          <div className="autotext-group">
            <select
              className="select-auto"
              value={selectedAutotextInline}
              onChange={(e) => setSelectedAutotextInline(e.target.value)}
            >
              {AUTOTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                if (!selectedAutotextInline) return toast.error("Pilih autotext");
                insertAtCursor(selectedAutotextInline, textareaRefInline, text, setText);
              }}
            >Insert</button>
          </div>

          <div className="emoji-wrapper">
            <button
              type="button"
              className={`btn-outline ${showEmojiPickerInline ? "active" : ""}`}
              onClick={() => setShowEmojiPickerInline((prev) => !prev)}
            >😊 Emoji</button>
            {showEmojiPickerInline && (
              <div className="emoji-popover">
                <EmojiPicker
                  onEmojiClick={(e) => insertAtCursor(e.emoji, textareaRefInline, text, setText)}
                  height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} skinTonesDisabled
                />
              </div>
            )}
          </div>
        </div>

        <div className="schedule-box">
          <label className="schedule-row">
            <input type="checkbox" checked={autoSend} onChange={() => setAutoSend(!autoSend)} />
            Enable Auto Send
          </label>
        </div>

        <button className="save-btn" onClick={handleSaveInline} disabled={saving || loading}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    );
  };

  return (
    <div className="followup-container">
      <div className="followup-tabs-container">
        {FOLLOWUP_TABS.map((t) => (
          <button
            key={t.type}
            className={`tab-btn ${activeType === t.type ? "active" : ""}`}
            onClick={() => setActiveType(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ padding: '20px', color: "#666" }}>Memuat template...</p>}

      {!loading && renderActiveTabContent()}

      {/* MODAL UNLIMITED/UPSELLING */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">{modalTitle}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="font-semibold text-gray-700">Pengaturan Text</label>
                <textarea
                  ref={textareaRefModal}
                  className="modal-textarea"
                  rows={8}
                  value={modalData.text}
                  onChange={(e) => setModalData({ ...modalData, text: e.target.value })}
                />
              </div>

              <div className="control-row">
                <div className="autotext-group">
                  <select
                    className="select-auto"
                    value={selectedAutotextModal}
                    onChange={(e) => setSelectedAutotextModal(e.target.value)}
                  >
                    {AUTOTEXT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      if (!selectedAutotextModal) return toast.error("Pilih autotext");
                      insertAtCursor(selectedAutotextModal, textareaRefModal, modalData.text, (v) => setModalData({ ...modalData, text: v(modalData.text) }));
                    }}
                  >Insert</button>
                </div>

                <div className="emoji-wrapper">
                  <button
                    type="button"
                    className={`btn-outline ${showEmojiPickerModal ? "active" : ""}`}
                    onClick={() => setShowEmojiPickerModal(!showEmojiPickerModal)}
                  >😊 Emoji</button>
                  {showEmojiPickerModal && (
                    <div className="emoji-popover">
                      <EmojiPicker
                        onEmojiClick={(e) => insertAtCursor(e.emoji, textareaRefModal, modalData.text, (v) => setModalData({ ...modalData, text: v(modalData.text) }))}
                        height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} skinTonesDisabled
                      />
                    </div>
                  )}
                </div>
              </div>

              <hr className="dashed-hr" />

              <label className="checkbox-row font-semibold">
                <input
                  type="checkbox"
                  checked={modalData.status === "1"}
                  onChange={(e) => setModalData({ ...modalData, status: e.target.checked ? "1" : "2" })}
                />
                Aktifkan auto send
              </label>

              <div className="schedule-grid">
                <div className="form-group">
                  <label className="text-gray-500">{activeType === "upselling" ? "After Jadwal Event (hari)" : "Delay (hari)"}</label>
                  <input
                    type="number"
                    className="modal-input"
                    min="0"
                    value={modalData.scheduleDay}
                    onChange={(e) => {
                      const newDay = Math.max(0, Number(e.target.value) || 0);
                      const newEvent = formatEventValue(newDay, modalData.scheduleTime);
                      setModalData({ ...modalData, scheduleDay: newDay, event: newEvent });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="text-gray-500">Jam kirim</label>
                  <div className="time-input-wrapper">
                    <input
                      type="time"
                      className="modal-input"
                      value={modalData.scheduleTime}
                      onChange={(e) => {
                        const newTime = e.target.value || "09:00";
                        const newEvent = formatEventValue(modalData.scheduleDay, newTime);
                        setModalData({ ...modalData, scheduleTime: newTime, event: newEvent });
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Batal</button>
              <button className="btn-save-dark" onClick={handleSaveModal} disabled={saving}>
                {saving ? "..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .followup-container {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-top: 20px;
          overflow: hidden;
        }

        .followup-tabs-container {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          overflow-x: auto;
          padding: 0 16px;
        }

        .tab-btn {
          padding: 16px 20px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #334155;
        }

        .tab-btn.active {
          color: #f59e0b;
          border-bottom-color: #f59e0b;
        }

        .unlimited-wrapper {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin: 20px;
          padding: 24px;
        }

        .unlimited-header-area {
          margin-bottom: 24px;
        }

        .unlimited-title {
          font-size: 16px;
          font-weight: 600;
          color: #334155;
          margin: 0 0 4px 0;
        }

        .unlimited-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 16px 0;
        }

        .btn-add-green {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
        }

        .btn-add-green:hover {
          background: #059669;
        }

        .empty-dashed-box {
          border: 1px dashed #cbd5e1;
          background: #ffffff;
          border-radius: 8px;
          padding: 32px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        .unlimited-list { display: flex; flex-direction: column; gap: 12px; }
        .fu-item-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #ffffff; border-left: 4px solid #f59e0b; }
        .fu-item-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .fu-item-title { font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; }
        .status-indicator { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .fu-item-actions { display: flex; gap: 8px; }
        .edit-btn, .delete-btn { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; cursor: pointer; color: #64748b; }
        .edit-btn:hover { color: #2563eb; border-color: #2563eb; }
        .delete-btn:hover { color: #ef4444; border-color: #ef4444; }
        .fu-item-meta { margin-bottom: 10px; }
        .meta-schedule { display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .fu-item-preview { font-size: 13px; color: #475569; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px dashed #e2e8f0; }

        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .modal-dialog {
          background: #ffffff;
          width: 90%;
          max-width: 550px;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          color: #0f172a;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #64748b;
          cursor: pointer;
          line-height: 1;
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .font-semibold {
          font-weight: 600;
        }

        .text-gray-700 {
          color: #334155;
        }
        
        .text-gray-500 {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 6px;
          display: block;
        }

        .modal-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 12px;
          font-size: 14px;
          margin-top: 8px;
          resize: vertical;
        }

        .modal-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }

        .control-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .autotext-group { display: flex; gap: 8px; }
        .select-auto { border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 14px; background: #fff; }
        
        .btn-outline {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          color: #334155;
          cursor: pointer;
          font-weight: 500;
        }
        
        .btn-outline:hover {
          background: #f8fafc;
        }

        .emoji-wrapper { position: relative; }
        .emoji-popover { position: absolute; top: 100%; left: 0; z-index: 30; margin-top: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }

        .dashed-hr {
          border: none;
          border-top: 1px dashed #cbd5e1;
          margin: 24px 0;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          color: #1e293b;
        }

        .schedule-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .modal-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
        }

        .modal-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          color: #475569;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-save-dark {
          background: #0f172a;
          color: white;
          border: none;
          padding: 8px 24px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-save-dark:hover {
          background: #1e293b;
        }

        /* INLINE FORM OVERRIDES */
        .inline-form-section { padding: 24px; }
        .label { font-weight: 600; color: #334155; margin-bottom: 8px; display: block; }
        .followup-textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }
        .save-btn { background: #0f172a; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; margin-top: 24px; }
      `}</style>
    </div>
  );
}
