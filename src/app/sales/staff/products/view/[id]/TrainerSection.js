"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { getUsers } from "@/lib/users";

const BASE_URL = "/api";

export default function TrainerSection({ productId, product, onProductUpdate }) {
  const params = useParams();
  const id = productId || params?.id;

  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTrainer, setCurrentTrainer] = useState(null);
  const [feeTrainerPct, setFeeTrainerPct] = useState("");

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
      `}</style>
    </div>
  );
}

