"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";

const emptyForm = {
  nama: "",
  ad_account_id: "",
  access_token: "",
  app_id: "",
  app_secret: "",
  business_id: "",
  currency: "",
  is_active: true,
};

export default function MetaAdsAccountsSettingPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("sales/meta-ads/accounts"), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) setAccounts(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching meta ads accounts:", error);
      toast.error("Gagal memuat data akun Meta Ads");
    } finally {
      setLoading(false);
    }
  };

  const openModalForCreate = () => {
    setFormData(emptyForm);
    setIsEditMode(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const openModalForEdit = (account) => {
    setFormData({
      nama: account.nama || "",
      ad_account_id: account.ad_account_id || "",
      access_token: "", // Sengaja dikosongkan - token gak dikirim balik dari backend. Isi cuma kalau mau ganti.
      app_id: account.app_id || "",
      app_secret: "",
      business_id: account.business_id || "",
      currency: account.currency || "",
      is_active: account.is_active ?? true,
    });
    setIsEditMode(true);
    setCurrentId(account.id);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nama) {
      toast.error("Nama akun wajib diisi!");
      return;
    }

    try {
      setSubmitLoading(true);
      const token = localStorage.getItem("token");

      const endpoint = isEditMode
        ? getApiUrl(`sales/meta-ads/accounts/${currentId}`)
        : getApiUrl("sales/meta-ads/accounts");
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Akun berhasil disimpan");
        closeModal();
        fetchAccounts();
      } else {
        toast.error(result.message || "Gagal menyimpan akun");
      }
    } catch (error) {
      console.error("Error saving meta ads account:", error);
      toast.error("Terjadi kesalahan saat menyimpan akun");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin mau hapus akun Meta Ads ini?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`sales/meta-ads/accounts/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Akun berhasil dihapus");
        fetchAccounts();
      } else {
        toast.error(result.message || "Gagal menghapus akun");
      }
    } catch (error) {
      console.error("Error deleting meta ads account:", error);
      toast.error("Terjadi kesalahan saat menghapus akun");
    }
  };

  if (loading) {
    return (
      <Layout title="Setting Akun Meta Ads">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memuat data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Setting Akun Meta Ads">
      <div className="meta-ads-account-page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Akun Meta Ads</h2>
            <p className="page-description">
              Sambungkan akun/ad account Meta Ads di sini. Sekali kredensial (System User token) tersedia dari Business Manager, tinggal diisi di sini - dashboard akan otomatis mulai sync.
            </p>
          </div>
          <button onClick={openModalForCreate} className="btn btn-primary add-btn">
            <Plus size={18} /> Tambah Akun
          </button>
        </div>

        <div className="setting-card">
          {accounts.length === 0 ? (
            <div className="empty-state">
              <p>Belum ada akun Meta Ads yang ditambahkan.</p>
              <button onClick={openModalForCreate} className="btn btn-outline">
                Tambah Sekarang
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="pixel-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Ad Account ID</th>
                    <th>Token</th>
                    <th>Status</th>
                    <th>Terakhir Sync</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td><span className="font-medium text-gray-900">{item.nama || "-"}</span></td>
                      <td><span className="badge badge-gray">{item.ad_account_id || "-"}</span></td>
                      <td>
                        {item.has_token ? (
                          <span className="badge badge-blue">Terhubung</span>
                        ) : (
                          <span className="badge badge-gray">Belum ada token</span>
                        )}
                      </td>
                      <td>
                        {item.is_active ? (
                          <span className="badge badge-blue">Aktif</span>
                        ) : (
                          <span className="badge badge-gray">Nonaktif</span>
                        )}
                      </td>
                      <td>{item.last_synced_at ? new Date(item.last_synced_at).toLocaleString("id-ID") : "Belum pernah"}</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => openModalForEdit(item)} className="btn-text text-blue" style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 500, marginRight: 10 }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="btn-text text-red" style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
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
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? "Edit Akun Meta Ads" : "Tambah Akun Meta Ads"}</h3>
              <button onClick={closeModal} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Nama <span className="text-red-500">*</span></label>
                <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Contoh: Ternak Properti - Main" className="input-field" required />
              </div>

              <div className="form-group">
                <label>Ad Account ID</label>
                <input type="text" name="ad_account_id" value={formData.ad_account_id} onChange={handleInputChange} placeholder="act_123456789" className="input-field" />
              </div>

              <div className="form-group">
                <label>Access Token (System User)</label>
                <textarea name="access_token" value={formData.access_token} onChange={handleInputChange} placeholder={isEditMode ? "Kosongkan kalau tidak mau ganti token" : "Token dari Business Manager System User"} className="input-field textarea-field" rows="3"></textarea>
              </div>

              <div className="form-group">
                <label>App ID</label>
                <input type="text" name="app_id" value={formData.app_id} onChange={handleInputChange} className="input-field" />
              </div>

              <div className="form-group">
                <label>App Secret</label>
                <input type="password" name="app_secret" value={formData.app_secret} onChange={handleInputChange} placeholder={isEditMode ? "Kosongkan kalau tidak mau ganti" : ""} className="input-field" />
              </div>

              <div className="form-group">
                <label>Business Manager ID</label>
                <input type="text" name="business_id" value={formData.business_id} onChange={handleInputChange} className="input-field" />
              </div>

              <div className="form-group">
                <label>Currency</label>
                <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} placeholder="IDR" className="input-field" />
              </div>

              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} id="is_active" />
                <label htmlFor="is_active" style={{ margin: 0 }}>Aktif (ikut disync)</label>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitLoading} className="btn btn-primary">
                  {submitLoading ? "Menyimpan..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .meta-ads-account-page { padding: 2rem; max-width: 1100px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
        .page-title { margin: 0 0 0.5rem 0; color: #111827; font-size: 1.5rem; font-weight: 600; }
        .page-description { color: #6b7280; margin: 0; font-size: 0.95rem; max-width: 640px; }
        .setting-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .table-responsive { overflow-x: auto; }
        .pixel-table { width: 100%; border-collapse: collapse; }
        .pixel-table th { text-align: left; padding: 1rem; border-bottom: 1px solid #e5e7eb; background: #f9fafb; color: #374151; font-weight: 600; font-size: 0.875rem; }
        .pixel-table td { padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 0.9rem; vertical-align: middle; }
        .pixel-table tr:last-child td { border-bottom: none; }
        .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-gray { background-color: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .badge-blue { background-color: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .action-buttons { display: flex; gap: 0.75rem; justify-content: center; }
        .text-blue { color: #3b82f6; }
        .text-red { color: #ef4444; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 500; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-primary { background-color: #F1A124; color: white; }
        .btn-primary:hover:not(:disabled) { background-color: #d68f20; }
        .btn-outline { background-color: white; border-color: #F1A124; color: #F1A124; }
        .btn-outline:hover:not(:disabled) { background-color: #fff9f0; border-color: #d68f20; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: #6b7280; }
        .empty-state p { margin-bottom: 1rem; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
        .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); max-height: 90vh; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
        .modal-header h3 { margin: 0; font-size: 1.125rem; color: #111827; }
        .close-btn { background: none; border: none; font-size: 1.5rem; line-height: 1; color: #9ca3af; cursor: pointer; padding: 0; }
        .modal-body { padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.25rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group label { font-weight: 500; font-size: 0.9rem; color: #374151; }
        .input-field { width: 100%; padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.95rem; outline: none; transition: all 0.2s; background: white; }
        .input-field:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }
        .textarea-field { resize: vertical; font-family: inherit; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem; }
        .font-medium { font-weight: 500; }
        .text-gray-900 { color: #111827; }
        .text-red-500 { color: #ef4444; }
      `}</style>
    </Layout>
  );
}
