"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { getUsers } from "@/lib/users";
import dynamic from "next/dynamic";

const BASE_URL = "/api";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

const AUTOTEXT_OPTIONS = [
  { label: "Pilih Autotext", value: "" },
  { label: "{{customer_name}}", value: "{{customer_name}}" },
  { label: "{{product_name}}", value: "{{product_name}}" },
  { label: "{{order_date}}", value: "{{order_date}}" },
  { label: "{{order_total}}", value: "{{order_total}}" },
];

export default function TrainerSection({ productId, product, onProductUpdate }) {
  const params = useParams();
  const id = productId || params?.id;

  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTrainer, setCurrentTrainer] = useState(null);
  const [feeTrainerPct, setFeeTrainerPct] = useState("");

  // Followup state for Trainer (type 11)
  const [followupText, setFollowupText] = useState("");
  const [followupEvent, setFollowupEvent] = useState("1d-09:00");
  const [scheduleDay, setScheduleDay] = useState(1);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [autoSend, setAutoSend] = useState(false);
  const [loadingFollowup, setLoadingFollowup] = useState(false);
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [selectedAutotext, setSelectedAutotext] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);

  // Fetch trainers (users with division 11)
  useEffect(() => {
    async function fetchTrainers() {
      try {
        setLoading(true);
        const users = await getUsers();
        
        // Filter users with division 11 (Trainer)
        const trainerUsers = users.filter(
          (user) => user.divisi === 11 || user.divisi === "11"
        );
        
        setTrainers(trainerUsers);
        console.log("✅ [TRAINER] Trainers loaded:", trainerUsers);
      } catch (err) {
        console.error("❌ [TRAINER] Error fetching trainers:", err);
        toast.error("Gagal memuat daftar trainer");
      } finally {
        setLoading(false);
      }
    }

    fetchTrainers();
  }, []);

  // Fetch followup template for Trainer (type 11)
  useEffect(() => {
    if (!id) return;
    
    setLoadingFollowup(true);
    const token = localStorage.getItem("token");
    
    fetch(`${BASE_URL}/sales/template-follup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ produk_id: id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Find template with type 11 or nama "Reminder Trainer"
          const trainerTemplate = (data.data || []).find(
            (tpl) => tpl.type === "11" || tpl.nama === "Reminder Trainer"
          );
          
          if (trainerTemplate) {
            setFollowupText(trainerTemplate.text || "");
            const eventVal = trainerTemplate.event || "1d-09:00";
            setFollowupEvent(eventVal);
            const [dayPart = "1d", timePart = "09:00"] = eventVal.split("-");
            const dayNumber = Number(dayPart.replace(/[^0-9]/g, "")) || 0;
            setScheduleDay(dayNumber);
            setScheduleTime(timePart?.trim() ? timePart : "09:00");
            setAutoSend(trainerTemplate.status === "1");
          }
        }
      })
      .catch((err) => {
        console.error("❌ [TRAINER FOLLOWUP] Error fetching template:", err);
      })
      .finally(() => {
        setLoadingFollowup(false);
      });
  }, [id]);

  // Helper functions for followup
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

  const insertAtCursor = (value) => {
    if (!value) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setFollowupText((prev) => (prev || "") + value);
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = followupText.slice(0, start);
    const after = followupText.slice(end);
    const newValue = `${before}${value}${after}`;
    setFollowupText(newValue);
    requestAnimationFrame(() => {
      const newPos = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleInsertAutotext = () => {
    if (!selectedAutotext) {
      toast.error("Pilih autotext terlebih dahulu");
      return;
    }
    insertAtCursor(selectedAutotext);
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData?.emoji;
    if (emoji) {
      insertAtCursor(emoji);
    }
  };

  // Auto-save followup (no button, auto-save on change)
  useEffect(() => {
    if (!id || loadingFollowup) return;
    
    const timeoutId = setTimeout(() => {
      if (followupText.trim()) {
        handleSaveFollowup();
      }
    }, 2000); // Auto-save after 2 seconds of no typing
    
    return () => clearTimeout(timeoutId);
  }, [followupText, followupEvent, autoSend]);

  const handleSaveFollowup = async () => {
    if (!id || !followupText.trim()) return;
    
    setSavingFollowup(true);
    const token = localStorage.getItem("token");
    
    const payload = {
      nama: "Reminder Trainer",
      produk: id,
      text: followupText.trim(),
      type: "11",
      event: followupEvent,
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
        console.log("✅ [TRAINER FOLLOWUP] Auto-saved");
      }
    } catch (err) {
      console.error("❌ [TRAINER FOLLOWUP] Error saving:", err);
    } finally {
      setSavingFollowup(false);
    }
  };

  // Set current trainer from product data
  useEffect(() => {
    if (product) {
      // Check if product has trainer field or trainer_id
      // Note: trainer_rel mungkin tidak ada jika relationship tidak didefinisikan di backend
      const trainerId = product.trainer || product.trainer_id;
      const trainerRel = product.trainer_rel; // Mungkin undefined jika backend error
      
      if (trainerId) {
        setSelectedTrainer(String(trainerId));
        // Jika trainer_rel tidak ada, cari dari trainers list
        if (trainerRel) {
          setCurrentTrainer(trainerRel);
        } else {
          // Fallback: cari dari trainers list
          const trainerData = trainers.find(t => String(t.id) === String(trainerId));
          setCurrentTrainer(trainerData || { id: trainerId, nama: "Trainer" });
        }
      } else {
        setSelectedTrainer("");
        setCurrentTrainer(null);
      }
      const fee = product.fee_trainer;
      if (fee !== undefined && fee !== null && fee !== "") {
        setFeeTrainerPct(String(fee));
      } else {
        setFeeTrainerPct("");
      }
    }
  }, [product, trainers]);

  const handleSave = async () => {
    if (!id) {
      toast.error("ID produk tidak ditemukan");
      return;
    }

    if (!selectedTrainer) {
      toast.error("Pilih trainer terlebih dahulu");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${BASE_URL}/sales/produk/${id}/trainer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trainer: Number(selectedTrainer),
          fee_trainer: (() => {
            if (feeTrainerPct === "" || feeTrainerPct === null) return null;
            const n = Number(feeTrainerPct);
            if (!Number.isFinite(n)) return null;
            return Math.min(100, Math.max(0, n));
          })(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMessage = data.message || data.error || "Gagal mengupdate trainer";
        if (errorMessage.includes("trainer_rel") || errorMessage.includes("undefined relationship")) {
          // Error dari backend - relationship tidak didefinisikan
          // Tapi kita tetap bisa update trainer, hanya saja response tidak include trainer_rel
          console.warn("⚠️ [TRAINER] Backend error: trainer_rel tidak didefinisikan, tapi trainer mungkin sudah terupdate");
          
          // Coba tetap update UI meskipun ada error
          const selectedTrainerData = trainers.find(
            (t) => String(t.id) === String(selectedTrainer)
          );
          if (selectedTrainerData) {
            setCurrentTrainer(selectedTrainerData);
          }
          
          // Tampilkan warning tapi tetap success jika data ada
          if (data.data) {
            toast.success("Trainer berhasil diupdate (dengan warning: backend perlu memperbaiki relationship trainer_rel)");
            if (onProductUpdate && data.data) {
              onProductUpdate(data.data);
            }
            return; // Exit early, trainer sudah terupdate
          }
          
          throw new Error("Error backend: Relationship trainer_rel tidak didefinisikan di model Produk. Trainer mungkin sudah terupdate, silakan refresh halaman.");
        }
        throw new Error(errorMessage);
      }

      toast.success(data.message || "Trainer berhasil diupdate");

      // Update product data if callback provided
      if (onProductUpdate && data.data) {
        onProductUpdate(data.data);
      }
      
      // Update current trainer display
      // Note: trainer_rel mungkin tidak ada jika relationship tidak didefinisikan di backend
      // Jadi kita selalu fallback ke trainers list (users dengan divisi 11)
      const updatedProduct = data.data;
      if (updatedProduct && updatedProduct.trainer_rel) {
        // Jika trainer_rel ada dari response, gunakan itu
        setCurrentTrainer(updatedProduct.trainer_rel);
      } else {
        // Fallback: cari dari trainers list (users dengan divisi 11)
        const selectedTrainerData = trainers.find(
          (t) => String(t.id) === String(selectedTrainer)
        );
        if (selectedTrainerData) {
          setCurrentTrainer(selectedTrainerData);
        } else if (updatedProduct && (updatedProduct.trainer || updatedProduct.trainer_id)) {
          // Jika ada trainer ID tapi tidak ada di trainers list, buat object sederhana
          const trainerId = updatedProduct.trainer || updatedProduct.trainer_id;
          setCurrentTrainer({ id: trainerId, nama: "Trainer", divisi: 11 });
        }
      }
    } catch (error) {
      console.error("❌ [TRAINER] Error saving trainer:", error);
      toast.error(error.message || "Gagal mengupdate trainer");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!id) {
      toast.error("ID produk tidak ditemukan");
      return;
    }

    if (!confirm("Yakin ingin menghapus trainer dari produk ini?")) {
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      // Set trainer to null or 0 to remove
      const res = await fetch(`${BASE_URL}/sales/produk/${id}/trainer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trainer: null,
          fee_trainer: null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus trainer");
      }

      toast.success(data.message || "Trainer berhasil dihapus");

      // Update product data if callback provided
      if (onProductUpdate && data.data) {
        onProductUpdate(data.data);
      }

      // Clear selection
      setSelectedTrainer("");
      setCurrentTrainer(null);
      setFeeTrainerPct("");
    } catch (error) {
      console.error("❌ [TRAINER] Error removing trainer:", error);
      toast.error(error.message || "Gagal menghapus trainer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="trainer-card">
      <div className="trainer-header">
        <h2>Assign Trainer</h2>
        <p className="trainer-subtitle">
          Pilih trainer yang akan mengajar atau mengupload materi untuk peserta produk ini.
        </p>
      </div>

      {loading ? (
        <div className="trainer-loading">
          <p>Memuat daftar trainer...</p>
        </div>
      ) : (
        <>
          {/* Current Trainer Display */}
          {currentTrainer && (
            <div className="current-trainer">
              <div className="current-trainer-label">Trainer Saat Ini:</div>
              <div className="current-trainer-info">
                <span className="trainer-name">{currentTrainer.nama || "Trainer"}</span>
                {currentTrainer.email && (
                  <span className="trainer-email">{currentTrainer.email}</span>
                )}
                {product?.fee_trainer != null &&
                  product.fee_trainer !== "" &&
                  Number(product.fee_trainer) > 0 && (
                    <span className="trainer-fee-badge">
                      Fee trainer: {Number(product.fee_trainer)}%
                    </span>
                  )}
              </div>
            </div>
          )}

          {/* Trainer Selection */}
          <div className="trainer-form">
            <label>
              Pilih Trainer
              <select
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="trainer-select"
              >
                <option value="">-- Pilih Trainer --</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.nama} {trainer.email ? `(${trainer.email})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fee trainer (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="0"
                value={feeTrainerPct}
                onChange={(e) => setFeeTrainerPct(e.target.value)}
                className="trainer-fee-input"
              />
              <span className="trainer-fee-hint">Persentase dari revenue order (total harga).</span>
            </label>

            {trainers.length === 0 && (
              <p className="trainer-empty">
                Tidak ada trainer tersedia. Pastikan ada user dengan divisi Trainer (11).
              </p>
            )}

            <div className="trainer-actions">
              <button
                type="button"
                className="trainer-save-btn"
                onClick={handleSave}
                disabled={saving || !selectedTrainer || loading}
              >
                {saving ? "Menyimpan..." : selectedTrainer === String(product?.trainer || product?.trainer_id) ? "Update Trainer" : "Assign Trainer"}
              </button>

              {currentTrainer && (
                <button
                  type="button"
                  className="trainer-remove-btn"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  Hapus Trainer
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Followup Section for Trainer */}
      <div className="trainer-followup-section">
        <div className="trainer-followup-header">
          <h3>Followup Text untuk Trainer</h3>
          <p className="trainer-followup-subtitle">
            Template pesan yang akan dikirim otomatis ke trainer
          </p>
          <p className="trainer-followup-subtitle" style={{ marginTop: 6 }}>
            Reminder akan dikirim kepada trainer <strong>setiap hari</strong> selama <strong>H-{scheduleDay}</strong> sesuai event yang di setting.
          </p>
        </div>

        {loadingFollowup ? (
          <div className="trainer-followup-loading">
            <p>Memuat template followup...</p>
          </div>
        ) : (
          <>
            <label className="followup-label">Pengaturan Text</label>
            <textarea
              ref={textareaRef}
              className="followup-textarea"
              rows={10}
              value={followupText}
              onChange={(e) => setFollowupText(e.target.value)}
              placeholder="Tulis template followup disini..."
            />

            <div className="control-row">
              <div className="autotext-group">
                <select
                  className="select-auto"
                  value={selectedAutotext}
                  onChange={(e) => setSelectedAutotext(e.target.value)}
                >
                  {AUTOTEXT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="insert-btn"
                  onClick={handleInsertAutotext}
                  disabled={!selectedAutotext}
                >
                  Insert
                </button>
              </div>

              <div className="emoji-wrapper">
                <button
                  type="button"
                  className={`btn-emoji ${showEmojiPicker ? "active" : ""}`}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  😊
                  <span>Emoticon</span>
                </button>
                {showEmojiPicker && (
                  <div className="emoji-popover">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      height={320}
                      width={280}
                      searchDisabled={false}
                      previewConfig={{ showPreview: false }}
                      skinTonesDisabled
                    />
                  </div>
                )}
              </div>

              <button 
                className="reset-text" 
                onClick={() => {
                  setFollowupText("");
                  setFollowupEvent("1d-09:00");
                  setScheduleDay(1);
                  setScheduleTime("09:00");
                }}
              >
                Reset Text
              </button>
            </div>

            <div className="schedule-box">
              <label className="schedule-row">
                <input
                  type="checkbox"
                  checked={autoSend}
                  onChange={() => setAutoSend(!autoSend)}
                />
                Enable Auto Send
              </label>
              
              <div className="schedule-grid">
                <div className="schedule-card">
                  <label>Delay (Hari)</label>
                  <div className="schedule-input">
                    <input
                      type="number"
                      min="0"
                      value={scheduleDay}
                      onChange={(e) => {
                        const newDay = Math.max(0, Number(e.target.value) || 0);
                        setScheduleDay(newDay);
                        setFollowupEvent(formatEventValue(newDay, scheduleTime));
                      }}
                    />
                    <span>hari</span>
                  </div>
                </div>
                <div className="schedule-card">
                  <label>Jam Kirim</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => {
                      const newTime = e.target.value || "09:00";
                      setScheduleTime(newTime);
                      setFollowupEvent(formatEventValue(scheduleDay, newTime));
                    }}
                  />
                </div>
              </div>
              <p className="schedule-hint">
                Format terkirim ke backend: <strong>{followupEvent}</strong>
              </p>
            </div>

            <button 
              className="save-btn" 
              onClick={handleSaveFollowup}
              disabled={savingFollowup || !followupText.trim()}
            >
              {savingFollowup ? "Menyimpan..." : "Simpan Followup"}
            </button>
          </>
        )}
      </div>

      <style>{`
        .trainer-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.07);
          margin-top: 20px;
        }

        .trainer-header h2 {
          margin: 0;
          font-size: 20px;
          color: #111827;
        }

        .trainer-subtitle {
          color: #6b7280;
          margin-top: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .trainer-loading {
          padding: 20px;
          text-align: center;
          color: #6b7280;
        }

        .current-trainer {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .current-trainer-label {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .current-trainer-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .trainer-name {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .trainer-email {
          font-size: 14px;
          color: #6b7280;
        }

        .trainer-fee-badge {
          font-size: 13px;
          font-weight: 600;
          color: #0369a1;
          margin-top: 4px;
        }

        .trainer-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .trainer-form label {
          display: flex;
          flex-direction: column;
          font-weight: 600;
          color: #111827;
          gap: 8px;
        }

        .trainer-select {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .trainer-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .trainer-fee-input {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          max-width: 160px;
        }

        .trainer-fee-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .trainer-fee-hint {
          font-weight: 400;
          font-size: 12px;
          color: #6b7280;
        }

        .trainer-empty {
          padding: 12px;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 8px;
          color: #92400e;
          font-size: 14px;
          margin: 0;
        }

        .trainer-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .trainer-save-btn,
        .trainer-remove-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .trainer-save-btn {
          background: #2563eb;
          color: white;
        }

        .trainer-save-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .trainer-save-btn:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }

        .trainer-remove-btn {
          background: #ef4444;
          color: white;
        }

        .trainer-remove-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        .trainer-remove-btn:disabled {
          background: #fca5a5;
          cursor: not-allowed;
        }

        .trainer-followup-section {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 2px solid #e5e7eb;
        }

        .trainer-followup-header h3 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .trainer-followup-subtitle {
          color: #6b7280;
          margin-top: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .trainer-followup-loading {
          padding: 20px;
          text-align: center;
          color: #6b7280;
        }

        .followup-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #111827;
        }

        .followup-textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #ddd;
          padding: 10px;
          font-size: 14px;
          font-family: inherit;
        }

        .control-row {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          flex-wrap: wrap;
          align-items: flex-start;
          position: relative;
        }

        .autotext-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .select-auto {
          border: 1px solid #ddd;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 14px;
        }

        .btn-emoji,
        .insert-btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .btn-emoji.active {
          border-color: #2563EB;
          background: #EEF4FF;
          color: #2563EB;
        }

        .emoji-wrapper {
          position: relative;
        }

        .emoji-popover {
          position: absolute;
          top: 50px;
          right: 0;
          z-index: 30;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.15);
          padding: 6px;
        }

        .reset-text {
          margin-left: auto;
          background: none;
          color: #2563EB;
          cursor: pointer;
          border: none;
          font-weight: 600;
          font-size: 14px;
        }

        .schedule-box {
          margin-top: 24px;
          border-top: 1px solid #eef2ff;
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .schedule-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .schedule-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }

        .schedule-card label {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .schedule-card input {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 14px;
          width: 100%;
        }

        .schedule-input {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .schedule-input span {
          font-size: 13px;
          color: #6b7280;
        }

        .schedule-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #111827;
        }

        .schedule-hint {
          font-size: 13px;
          color: #6b7280;
        }

        .schedule-hint strong {
          color: #111827;
        }

        .save-btn {
          margin-top: 20px;
          background: #2563EB;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          width: 100%;
        }

        .save-btn:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }

        .save-btn:disabled {
          background: #93c5fd;
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

