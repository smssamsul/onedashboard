"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Plus, Search } from "lucide-react";
import { toast } from "react-hot-toast";

// Divisi yang boleh mengelola pixel iklan: Admin Super, Owner, Sales, Marketing, Super ops.
const DIVISI_DIIZINKAN = ["1", "2", "3", "6", "99"];

const FORM_KOSONG = {
  nama: "",
  pixel_id: "",
  capi_key: "",
  hapus_capi_key: false,
  semua_produk: true,
  produk_ids: [],
  aktif: true,
};

export default function PixelChatGptPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pixels, setPixels] = useState([]);
  const [produkOptions, setProdukOptions] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // pixel yang sedang diedit, null = tambah baru
  const [formData, setFormData] = useState(FORM_KOSONG);
  const [cariProduk, setCariProduk] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [testingId, setTestingId] = useState(null);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(userData);
      const divisi = String(user?.divisi || localStorage.getItem("division") || "");
      if (!DIVISI_DIIZINKAN.includes(divisi)) {
        alert("Akses ditolak. Halaman ini hanya untuk Sales, Marketing, dan Admin.");
        router.push("/sales/dashboard");
        return;
      }
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error checking access:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (isAuthorized) fetchPixels();
  }, [isAuthorized]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    Accept: "application/json",
  });

  const fetchPixels = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl("sales/openai-pixel"), { headers: authHeaders() });
      const result = await response.json();
      if (result.success) {
        setPixels(result.data || []);
        setProdukOptions(result.produk_options || []);
      } else {
        toast.error(result.message || "Gagal memuat pixel ChatGPT");
      }
    } catch (error) {
      console.error("Error fetching pixel ChatGPT:", error);
      toast.error("Gagal memuat pixel ChatGPT");
    } finally {
      setLoading(false);
    }
  };

  const namaProduk = useMemo(() => {
    const m = new Map();
    produkOptions.forEach((p) => m.set(Number(p.id), p.nama));
    return m;
  }, [produkOptions]);

  const produkTersaring = useMemo(() => {
    const q = cariProduk.trim().toLowerCase();
    const list = q ? produkOptions.filter((p) => (p.nama || "").toLowerCase().includes(q)) : produkOptions;
    // Yang sudah dipilih tampil paling atas supaya gampang dicek.
    const dipilih = new Set(formData.produk_ids.map(Number));
    return [...list].sort((a, b) => Number(dipilih.has(Number(b.id))) - Number(dipilih.has(Number(a.id))));
  }, [produkOptions, cariProduk, formData.produk_ids]);

  const openCreate = () => {
    setFormData(FORM_KOSONG);
    setEditing(null);
    setCariProduk("");
    setShowModal(true);
  };

  const openEdit = (pixel) => {
    setFormData({
      nama: pixel.nama || "",
      pixel_id: pixel.pixel_id || "",
      capi_key: "",
      hapus_capi_key: false,
      semua_produk: !!pixel.semua_produk,
      produk_ids: (pixel.produk_ids || []).map(Number),
      aktif: !!pixel.aktif,
    });
    setEditing(pixel);
    setCariProduk("");
    setShowModal(true);
  };

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const toggleProduk = (id) => {
    const n = Number(id);
    setFormData((prev) => ({
      ...prev,
      produk_ids: prev.produk_ids.includes(n) ? prev.produk_ids.filter((x) => x !== n) : [...prev.produk_ids, n],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.pixel_id.trim()) {
      toast.error("Nama dan Pixel ID wajib diisi");
      return;
    }
    if (!formData.semua_produk && formData.produk_ids.length === 0) {
      toast.error('Pilih minimal 1 produk, atau pilih "Semua produk"');
      return;
    }

    try {
      setSubmitLoading(true);
      const response = await fetch(
        editing ? getApiUrl(`sales/openai-pixel/${editing.id}`) : getApiUrl("sales/openai-pixel"),
        {
          method: editing ? "PUT" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(result.message || "Pixel ChatGPT tersimpan");
        setShowModal(false);
        fetchPixels();
      } else {
        toast.error(result.message || "Gagal menyimpan pixel ChatGPT");
      }
    } catch (error) {
      console.error("Error saving pixel ChatGPT:", error);
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (pixel) => {
    if (!window.confirm(`Hapus pixel "${pixel.nama}"? Landing page berhenti mengirim event ke pixel ini.`)) return;
    try {
      const response = await fetch(getApiUrl(`sales/openai-pixel/${pixel.id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(result.message || "Pixel dihapus");
        fetchPixels();
      } else {
        toast.error(result.message || "Gagal menghapus pixel");
      }
    } catch (error) {
      console.error("Error deleting pixel ChatGPT:", error);
      toast.error("Terjadi kesalahan saat menghapus");
    }
  };

  const handleTest = async (pixel) => {
    try {
      setTestingId(pixel.id);
      const response = await fetch(getApiUrl(`sales/openai-pixel/${pixel.id}/test`), {
        method: "POST",
        headers: authHeaders(),
      });
      const result = await response.json();
      if (result.success) toast.success(result.message, { duration: 5000 });
      else toast.error(result.message || "Tes koneksi gagal", { duration: 8000 });
    } catch (error) {
      toast.error("Tes koneksi gagal: server tidak merespons");
    } finally {
      setTestingId(null);
    }
  };

  const labelProduk = (pixel) => {
    if (pixel.semua_produk) return "Semua produk";
    const ids = pixel.produk_ids || [];
    const nama = ids.slice(0, 2).map((id) => namaProduk.get(Number(id)) || `#${id}`);
    return ids.length > 2 ? `${nama.join(", ")} +${ids.length - 2} lainnya` : nama.join(", ") || "-";
  };

  if (!isAuthorized || loading) {
    return (
      <Layout title="Pixel ChatGPT | Sales">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>{loading ? "Memuat data..." : "Memeriksa akses..."}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pixel ChatGPT | Sales">
      <div className="pixel-setting-page">
        <div className="page-header">
          <div>
            <h2 className="page-title">Pixel Iklan ChatGPT</h2>
            <p className="page-description">
              Tracking konversi iklan ChatGPT (OpenAI Ads) di landing page produk dan halaman pembayaran.
            </p>
          </div>
          <button onClick={openCreate} className="btn btn-primary">
            <Plus size={18} /> Tambah Pixel
          </button>
        </div>

        <div className="setting-card panduan">
          <h3>Cara pakai</h3>
          <ol>
            <li>
              Di <b>ads.openai.com</b> buka <b>Tools → Conversions</b>, lalu <b>Create → Data Source</b> tipe <b>Web</b>.
              Salin <b>Pixel ID</b>, dan buat <b>Conversions API key</b> di halaman yang sama.
            </li>
            <li>Klik <b>Tambah Pixel</b>, isi Pixel ID &amp; API key, lalu pilih produk yang memakai pixel ini.</li>
            <li>Klik <b>Tes</b> untuk memastikan API key diterima OpenAI (event uji tidak disimpan).</li>
          </ol>
          <p className="catatan">
            Event yang dikirim otomatis: <code>page_viewed</code> &amp; <code>contents_viewed</code> (landing dibuka),{" "}
            <code>lead_created</code> (klik tombol WhatsApp), <code>checkout_started</code> (form dikirim), dan{" "}
            <code>order_created</code> dengan nilai order (halaman pembayaran). Tiap event dikirim lewat pixel browser
            dan Conversions API dengan ID yang sama, jadi tidak terhitung dobel. Hasilnya bisa dicek di menu <b>Log Pixel</b>.
          </p>
        </div>

        <div className="setting-card">
          {pixels.length === 0 ? (
            <div className="empty-state">
              <p>Belum ada pixel ChatGPT.</p>
              <button onClick={openCreate} className="btn btn-outline">Tambah Sekarang</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="pixel-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Pixel ID</th>
                    <th>Conversions API</th>
                    <th>Produk</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pixels.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-gray-900">{item.nama}</td>
                      <td><span className="badge badge-gray">{item.pixel_id}</span></td>
                      <td>
                        {item.punya_capi_key ? (
                          <span className="badge badge-green">Key tersimpan</span>
                        ) : (
                          <span className="badge badge-amber">Belum ada key</span>
                        )}
                      </td>
                      <td className="produk-cell">{labelProduk(item)}</td>
                      <td>
                        {item.aktif ? (
                          <span className="badge badge-green">Aktif</span>
                        ) : (
                          <span className="badge badge-gray">Nonaktif</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleTest(item)}
                            disabled={!item.punya_capi_key || testingId === item.id}
                            className="btn-text text-green"
                            title={item.punya_capi_key ? "Tes Conversions API key" : "Isi API key dulu untuk tes"}
                          >
                            {testingId === item.id ? "Mengetes..." : "Tes"}
                          </button>
                          <button onClick={() => openEdit(item)} className="btn-text text-blue">Edit</button>
                          <button onClick={() => handleDelete(item)} className="btn-text text-red">Hapus</button>
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
              <h3>{editing ? "Edit Pixel ChatGPT" : "Tambah Pixel ChatGPT"}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn" aria-label="Tutup">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="op-nama">Nama <span className="text-red-500">*</span></label>
                <input id="op-nama" type="text" value={formData.nama} onChange={(e) => setField("nama", e.target.value)}
                  placeholder="Contoh: ChatGPT Ads - Ternak Properti" className="input-field" required />
              </div>

              <div className="form-group">
                <label htmlFor="op-pixel">Pixel ID <span className="text-red-500">*</span></label>
                <input id="op-pixel" type="text" value={formData.pixel_id} onChange={(e) => setField("pixel_id", e.target.value)}
                  placeholder="Dari Ads Manager → Tools → Conversions" className="input-field" required />
              </div>

              <div className="form-group">
                <label htmlFor="op-key">Conversions API key</label>
                <input id="op-key" type="password" autoComplete="new-password" value={formData.capi_key}
                  onChange={(e) => setField("capi_key", e.target.value)}
                  placeholder={editing?.punya_capi_key ? "Tersimpan - isi hanya kalau mau mengganti" : "Opsional, tapi disarankan"}
                  className="input-field" disabled={formData.hapus_capi_key} />
                <small className="hint">Disimpan terenkripsi dan tidak pernah ditampilkan lagi. Tanpa key, event hanya dikirim lewat pixel browser.</small>
                {editing?.punya_capi_key && (
                  <label className="checkbox-row">
                    <input type="checkbox" checked={formData.hapus_capi_key}
                      onChange={(e) => setField("hapus_capi_key", e.target.checked)} />
                    Hapus API key yang tersimpan
                  </label>
                )}
              </div>

              <div className="form-group">
                <span className="group-label">Dipakai di produk</span>
                <label className="checkbox-row">
                  <input type="radio" name="op-scope" checked={formData.semua_produk} onChange={() => setField("semua_produk", true)} />
                  Semua produk
                </label>
                <label className="checkbox-row">
                  <input type="radio" name="op-scope" checked={!formData.semua_produk} onChange={() => setField("semua_produk", false)} />
                  Pilih produk tertentu {formData.produk_ids.length > 0 && `(${formData.produk_ids.length} dipilih)`}
                </label>

                {!formData.semua_produk && (
                  <div className="produk-picker">
                    <div className="search-box">
                      <Search size={16} />
                      <input id="op-cari-produk" type="text" value={cariProduk} onChange={(e) => setCariProduk(e.target.value)}
                        placeholder="Cari produk..." />
                    </div>
                    <div className="produk-list">
                      {produkTersaring.length === 0 && <p className="hint">Produk tidak ditemukan.</p>}
                      {produkTersaring.map((p) => (
                        <label key={p.id} className="produk-item">
                          <input type="checkbox" checked={formData.produk_ids.includes(Number(p.id))} onChange={() => toggleProduk(p.id)} />
                          <span>{p.nama}</span>
                          {p.status !== "1" && <span className="badge badge-gray kecil">nonaktif</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <label className="checkbox-row">
                <input type="checkbox" checked={formData.aktif} onChange={(e) => setField("aktif", e.target.checked)} />
                Aktif (kirim event dari landing page)
              </label>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Batal</button>
                <button type="submit" disabled={submitLoading} className="btn btn-primary">
                  {submitLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .pixel-setting-page { padding: 2rem; max-width: 1100px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .page-title { margin: 0 0 0.5rem 0; color: #111827; font-size: 1.5rem; font-weight: 600; }
        .page-description { color: #6b7280; margin: 0; font-size: 0.95rem; }
        .setting-card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
        .panduan h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #111827; }
        .panduan ol { margin: 0 0 0.75rem; padding-left: 1.25rem; color: #374151; font-size: 0.9rem; line-height: 1.7; }
        .panduan .catatan { margin: 0; color: #6b7280; font-size: 0.85rem; line-height: 1.6; }
        .panduan code { background: #f3f4f6; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
        .table-responsive { overflow-x: auto; }
        .pixel-table { width: 100%; border-collapse: collapse; }
        .pixel-table th { text-align: left; padding: 0.85rem 1rem; border-bottom: 1px solid #e5e7eb; background: #f9fafb; color: #374151; font-weight: 600; font-size: 0.85rem; }
        .pixel-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 0.9rem; vertical-align: middle; }
        .pixel-table tr:last-child td { border-bottom: none; }
        .produk-cell { max-width: 280px; font-size: 0.85rem; }
        .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; white-space: nowrap; }
        .badge.kecil { font-size: 0.7rem; padding: 0.1rem 0.45rem; margin-left: auto; }
        .badge-gray { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .badge-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .action-buttons { display: flex; gap: 0.75rem; justify-content: center; }
        .btn-text { background: none; border: none; cursor: pointer; font-weight: 500; padding: 0; }
        .btn-text:disabled { opacity: 0.4; cursor: not-allowed; }
        .text-blue { color: #3b82f6; }
        .text-red { color: #ef4444; }
        .text-green { color: #16a34a; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 500; font-size: 0.9rem; cursor: pointer; border: 1px solid transparent; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-primary { background: #f1a124; color: white; }
        .btn-primary:hover:not(:disabled) { background: #d68f20; }
        .btn-outline { background: white; border-color: #f1a124; color: #f1a124; }
        .empty-state { text-align: center; padding: 2.5rem 1rem; color: #6b7280; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
        .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
        .modal-header h3 { margin: 0; font-size: 1.1rem; color: #111827; }
        .close-btn { background: none; border: none; font-size: 1.5rem; line-height: 1; color: #9ca3af; cursor: pointer; }
        .modal-body { padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group > label, .group-label { font-weight: 500; font-size: 0.9rem; color: #374151; }
        .input-field { width: 100%; padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.95rem; outline: none; background: white; }
        .input-field:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
        .input-field:disabled { background: #f3f4f6; }
        .hint { color: #6b7280; font-size: 0.8rem; margin: 0; }
        .checkbox-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #374151; cursor: pointer; }
        .produk-picker { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .search-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; color: #9ca3af; }
        .search-box input { border: none; outline: none; flex: 1; font-size: 0.9rem; }
        .produk-list { max-height: 240px; overflow-y: auto; padding: 0.25rem 0; }
        .produk-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem; font-size: 0.875rem; color: #374151; cursor: pointer; }
        .produk-item:hover { background: #f9fafb; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.25rem; }
        .font-medium { font-weight: 500; }
        .text-gray-900 { color: #111827; }
        .text-red-500 { color: #ef4444; }
        @media (max-width: 640px) { .pixel-setting-page { padding: 1rem; } }
      `}</style>
    </Layout>
  );
}
