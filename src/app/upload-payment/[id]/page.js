"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UploadCloud, CheckCircle, Info, FileText } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";

export default function UploadPaymentPage() {
  const { id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState("");
  const [waktuPembayaran, setWaktuPembayaran] = useState("");
  const [metodePembayaran, setMetodePembayaran] = useState("Transfer Bank");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Set default waktu ke waktu sekarang
    const now = new Date();
    // format YYYY-MM-DDTHH:mm
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    setWaktuPembayaran(localISOTime);

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/public-order/${id}`);
        const result = await res.json();
        if (res.ok && result.success) {
          setOrder(result.data);

          // Hitung sisa tagihan
          const totalHarga = parseFloat(result.data.total_harga || 0);
          const totalPaid = result.data.order_payment_rel?.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) || 0;
          const sisa = Math.max(0, totalHarga - totalPaid);

          setAmount(sisa.toString());
        } else {
          toastError(result.message || "Gagal memuat data order");
        }
      } catch (err) {
        toastError("Terjadi kesalahan jaringan");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) {
        toastError("Ukuran file maksimal 4MB");
        return;
      }
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toastError("Silakan pilih file bukti pembayaran");
      return;
    }
    if (!amount || amount <= 0) {
      toastError("Jumlah transfer tidak valid");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("amount", amount);
      formData.append("waktu_pembayaran", waktuPembayaran.replace("T", " ") + ":00");
      formData.append("metode_pembayaran", metodePembayaran);
      formData.append("bukti_pembayaran", file);

      const res = await fetch(`/api/public-order/${id}/upload-bukti-pembayaran`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toastSuccess("Bukti pembayaran berhasil diupload!");
        setSuccess(true);
      } else {
        toastError(result.message || "Gagal mengupload bukti pembayaran");
      }
    } catch (err) {
      console.error(err);
      toastError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="saas-payment-page">
        <div className="flex justify-center items-center h-full">
          <p className="text-slate-500 font-medium">Memuat data...</p>
        </div>
        <style jsx>{`
          .saas-payment-page { min-height: 100vh; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; }
        `}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="saas-payment-page">
        <div className="error-card">
          <h2 className="error-title">Order Tidak Ditemukan</h2>
          <p className="error-desc">Link pembayaran tidak valid atau order sudah tidak tersedia.</p>
        </div>
        <style jsx>{`
          .saas-payment-page { min-height: 100vh; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; padding: 1rem; }
          .error-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
          .error-title { font-size: 1.5rem; font-weight: 600; color: #dc2626; margin: 0 0 1rem 0; }
          .error-desc { color: #475569; margin: 0; }
        `}</style>
      </div>
    );
  }

  if (success) {
    return (
      <div className="saas-payment-page">
        <div className="success-wrapper">
          <div className="success-icon-container">
            <CheckCircle size={64} color="#10b981" strokeWidth={1.5} />
          </div>
          <h2 className="saas-title">Pembayaran Diterima!</h2>
          <p className="saas-subtitle" style={{ marginBottom: 0 }}>
            Terima kasih, bukti pembayaran Anda telah berhasil kami terima dan akan segera divalidasi oleh tim kami. Anda akan menerima notifikasi melalui WhatsApp.
          </p>
        </div>

        <style jsx>{`
          .saas-payment-page {
            min-height: 100vh;
            background-color: #f8fafc;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 3rem 1rem;
          }
          .success-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background: white;
            padding: 3rem 2rem;
            border-radius: 20px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025);
            width: 100%;
            max-width: 500px;
          }
          .success-icon-container {
            margin-bottom: 1.5rem;
            animation: scaleIn 0.5s ease-out;
          }
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          .saas-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1e293b;
            letter-spacing: -0.025em;
            margin: 0 0 1rem 0;
          }
          .saas-subtitle {
            color: #64748b;
            font-size: 1.05rem;
            line-height: 1.5;
            max-width: 480px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="saas-payment-page">
      <div className="saas-container">

        {/* Header */}
        <div className="header-area">
          <h1 className="saas-title">Konfirmasi Pembayaran</h1>
          <p className="saas-subtitle">Silakan unggah bukti transfer pembayaran Anda</p>
        </div>

        {/* Form Card Container */}
        <div className="payment-card">

          {/* Order Info Section */}
          <div className="section-header">
            <FileText size={20} color="#6366f1" />
            Detail Order
          </div>

          <div className="order-detail-section">
            <div className="detail-row">
              <span className="detail-label">Produk</span>
              <span className="detail-value">{order.produk_rel?.nama || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Nama</span>
              <span className="detail-value">{order.customer_rel?.nama || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Tagihan</span>
              <span className="detail-value total-tagihan-value">
                Rp {parseInt(order.total_harga || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Upload Form Section */}
          <div className="form-section">
            <form onSubmit={handleSubmit}>

              {/* Amount */}
              {/* <div className="form-group">
                <label className="form-label">
                  Jumlah Transfer (Rp)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="form-input"
                  placeholder="0"
                />
              </div> */}

              {/* Metode & Waktu */}
              <div className="grid-2-cols form-group">
                <div>
                  <label className="form-label">
                    Metode Pembayaran
                  </label>
                  <select
                    value={metodePembayaran}
                    onChange={(e) => setMetodePembayaran(e.target.value)}
                    className="form-select"
                  >
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="E-Wallet">E-Wallet (OVO, GoPay, dll)</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Waktu Transfer
                  </label>
                  <input
                    type="datetime-local"
                    value={waktuPembayaran}
                    onChange={(e) => setWaktuPembayaran(e.target.value)}
                    required
                    className="form-input"
                  />

                </div>
              </div>

              {/* Upload Area */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">
                  Bukti Transfer (Screenshot / Struk)
                </label>
                <div
                  className="upload-area"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {previewUrl ? (
                    <div className="preview-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="preview-img" />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="upload-icon-circle">
                        <UploadCloud size={28} color="#4f46e5" />
                      </div>
                      <div>
                        <p className="upload-title">Klik untuk upload gambar</p>
                        <p className="upload-subtitle">JPG, JPEG, PNG maksimal 4MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Alert */}
              {/* <div className="info-alert">
                <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="info-text">
                  Pastikan nominal transfer sesuai dengan total tagihan. Bukti yang tidak jelas atau manipulasi akan menghambat proses validasi Anda.
                </p>
              </div> */}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !file}
                className="btn-primary"
              >
                {submitting ? (
                  <>
                    <span className="pi pi-spin pi-spinner"></span> Memproses...
                  </>
                ) : (
                  'Kirim Bukti Pembayaran'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>

      <style jsx>{`
        /* --- RESET & VARS --- */
        .saas-payment-page, .saas-payment-page * {
          box-sizing: border-box;
        }

        .saas-payment-page {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          display: flex;
          justify-content: center;
          padding: 3rem 1rem;
        }

        .saas-container {
          width: 100%;
          max-width: 600px;
        }

        .header-area {
          text-align: center;
          margin-bottom: 2rem;
        }

        .saas-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.025em;
          margin: 0 0 0.5rem 0;
        }

        .saas-subtitle {
          color: #64748b;
          font-size: 1.05rem;
          line-height: 1.5;
          margin: 0;
        }

        /* --- CARDS --- */
        .payment-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
          width: 100%;
          overflow: hidden;
          margin-bottom: 2rem;
          text-align: left;
        }

        .section-header {
          padding: 1.5rem 2rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          background: #f8fafc;
        }

        .order-detail-section {
          padding: 1.5rem 2rem;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding-bottom: 0.75rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .detail-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 0;
        }

        .detail-label {
          color: #64748b;
          font-size: 0.95rem;
        }
        .detail-value {
          font-weight: 600;
          color: #0f172a;
          text-align: right;
        }
        .total-tagihan-value {
          font-weight: 700;
          color: #2563eb;
          font-size: 1.125rem;
        }

        .form-section {
          padding: 2rem;
          background: #ffffff;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 0.95rem;
          transition: all 0.2s;
          background-color: #f8fafc;
          color: #0f172a;
        }
        .form-input:focus, .form-select:focus {
          border-color: #4f46e5;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
        }

        .grid-2-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 2.5rem 1rem;
          text-align: center;
          background-color: #f8fafc;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
        }
        .upload-area:hover {
          border-color: #94a3b8;
          background-color: #f1f5f9;
        }

        .upload-icon-circle {
          background: #e0e7ff;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem;
          transition: transform 0.2s;
        }
        .upload-area:hover .upload-icon-circle {
          transform: scale(1.05);
        }

        .upload-title {
          font-weight: 600;
          color: #4f46e5;
          margin: 0;
          font-size: 1rem;
        }
        .upload-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin: 6px 0 0 0;
        }

        .preview-container {
          position: relative;
          width: 100%;
          height: 200px;
          display: flex;
          justify-content: center;
        }
        .preview-img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
          border-radius: 6px;
        }

        .info-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: #eff6ff;
          padding: 1rem 1.25rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #bfdbfe;
        }
        .info-text {
          font-size: 0.85rem;
          color: #1e3a8a;
          margin: 0;
          line-height: 1.5;
        }

        .btn-primary {
          width: 100%;
          padding: 1rem;
          background-color: #4f46e5;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #4338ca;
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        @media (max-width: 480px) {
          .grid-2-cols { grid-template-columns: 1fr; gap: 1rem; }
          .form-section { padding: 1.5rem; }
          .order-detail-section { padding: 1.5rem; }
          .section-header { padding: 1.25rem 1.5rem 1rem; }
        }
      `}</style>
    </div>
  );
}
