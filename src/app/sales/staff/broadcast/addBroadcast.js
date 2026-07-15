"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar } from "primereact/calendar";
import { normalizeBroadcastPayload } from "@/lib/sales/broadcast";
import dynamic from "next/dynamic";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

// Dynamic import untuk EmojiPicker
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

// Status Order Mapping
const STATUS_ORDER_MAP = {
  "1": "Proses",
  "2": "Processing",
  "3": "Failed",
  "4": "Upselling",
  "N": "Dihapus",
};

// Status Pembayaran Mapping
const STATUS_PEMBAYARAN_MAP = {
  0: { label: "Unpaid", class: "unpaid" },
  null: { label: "Unpaid", class: "unpaid" },
  1: { label: "Waiting Approval", class: "pending" }, 
  2: { label: "Paid", class: "paid" },             
  3: { label: "Rejected", class: "rejected" },
  4: { label: "Partial Payment", class: "partial" },
};

export default function AddBroadcast({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    nama: "",
    pesan: "",
    langsung_kirim: true,
    tanggal_kirim: null,
    target: {
      tipe: "filter",
      produk: [],
      status_order: "",
      status_pembayaran: "",
      excel_data: null,
    },
  });

  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [statusOrderOptions, setStatusOrderOptions] = useState([]);
  const [statusPembayaranOptions, setStatusPembayaranOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [senderInfo, setSenderInfo] = useState(null);
  
  const [showProdukDropdown, setShowProdukDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Token tidak ditemukan");
          setLoading(false);
          return;
        }

        // Fetch sender profile info
        try {
          const profileRes = await fetch("/api/profile", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            if (profileJson.success && profileJson.data) {
              setSenderInfo(profileJson.data);
            }
          }
        } catch (profileErr) {
          console.error("Error fetching sender profile:", profileErr);
        }

        // Fetch products
        const productsRes = await fetch("/api/sales/produk", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (productsRes.ok) {
          const productsJson = await productsRes.json();
          if (productsJson.success && productsJson.data) {
            const activeProducts = Array.isArray(productsJson.data)
              ? productsJson.data.filter((p) => p.status === "1" || p.status === 1)
              : [];
            setProducts(activeProducts);
          }
        }

        // Fetch templates
        const templatesRes = await fetch("/api/sales/template-broadcast", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (templatesRes.ok) {
          const templatesJson = await templatesRes.json();
          if (templatesJson.success && templatesJson.data) {
            setTemplates(Array.isArray(templatesJson.data) ? templatesJson.data : []);
          }
        }

        // Fetch orders for statuses
        const ordersRes = await fetch("/api/sales/order?page=1&per_page=1000", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          if (ordersJson.success && ordersJson.data && Array.isArray(ordersJson.data)) {
            const uniqueStatusOrder = new Set();
            ordersJson.data.forEach((order) => {
              if (order.status_order) {
                const status = String(order.status_order);
                if (status && status !== "null" && status !== "undefined") {
                  uniqueStatusOrder.add(status);
                }
              }
            });

            const uniqueStatusPembayaran = new Set();
            ordersJson.data.forEach((order) => {
              let status = order.status_pembayaran;
              if (status === undefined) status = null;
              uniqueStatusPembayaran.add(status);
            });

            const statusOrderOpts = Array.from(uniqueStatusOrder)
              .sort()
              .map((value) => ({
                value,
                label: STATUS_ORDER_MAP[value] || value,
              }));

            const statusPembayaranOpts = Array.from(uniqueStatusPembayaran)
              .sort((a, b) => {
                if (a === null) return -1;
                if (b === null) return 1;
                return Number(a) - Number(b);
              })
              .map((value) => ({
                value,
                label: STATUS_PEMBAYARAN_MAP[value]?.label || value
              }));

            setStatusOrderOptions(statusOrderOpts);
            setStatusPembayaranOptions(statusPembayaranOpts);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataFile = new FormData();
    formDataFile.append('file', file);

    try {
      setIsUploadingExcel(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/sales/broadcast/parse-excel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataFile
      });

      const json = await res.json();
      if (json.success) {
        setFormData(prev => ({
          ...prev,
          target: {
            ...prev.target,
            excel_data: json.data
          }
        }));
        alert(`Berhasil membaca ${json.data.length} kontak dari Excel`);
      } else {
        alert(json.message || "Gagal memproses file Excel");
        e.target.value = null;
      }
    } catch (err) {
      alert("Terjadi kesalahan saat upload Excel");
      e.target.value = null;
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    if (!templateId) return;
    
    const selectedTemplate = templates.find(t => t.id.toString() === templateId);
    if (selectedTemplate) {
      insertAtCursor(selectedTemplate.isi);
    }
  };

  const toggleProduk = (productId) => {
    setFormData((prev) => {
      const currentProduk = prev.target.produk || [];
      const isSelected = currentProduk.includes(productId);
      return {
        ...prev,
        target: {
          ...prev.target,
          produk: isSelected
            ? currentProduk.filter((id) => id !== productId)
            : [...currentProduk, productId],
        },
      };
    });
  };

  const toggleSemuaProduk = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        target: { ...prev.target, produk: [] }
      }));
    }
  };

  const insertAtCursor = (value) => {
    if (!value) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({
        ...prev,
        pesan: (prev.pesan || "") + value,
      }));
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = formData.pesan.slice(0, start);
    const after = formData.pesan.slice(end);
    const newValue = `${before}${value}${after}`;
    setFormData((prev) => ({
      ...prev,
      pesan: newValue,
    }));
    requestAnimationFrame(() => {
      const newPos = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const insertAutoText = (value) => {
    insertAtCursor(value);
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData?.emoji;
    if (emoji) {
      insertAtCursor(emoji);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.nama.trim()) {
      setError("Nama broadcast wajib diisi");
      return;
    }
    if (!formData.pesan.trim()) {
      setError("Pesan broadcast wajib diisi");
      return;
    }
    if (!formData.langsung_kirim && !formData.tanggal_kirim) {
      setError("Tanggal kirim wajib diisi jika memilih 'Kirim Nanti'");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      const requestBody = normalizeBroadcastPayload(formData);

      const res = await fetch("/api/sales/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat broadcast");
      }

      if (json.data?.total_target === 0) {
        alert("⚠️ Broadcast berhasil dibuat, tetapi tidak ada customer yang sesuai dengan filter.");
      } else {
        alert(`✅ Broadcast berhasil dibuat!\nTotal Target: ${json.data?.total_target || 0} customer`);
      }

      if (onAdd) onAdd(json.data);
      onClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat membuat broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="orders-modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="orders-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", background: 'white', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Buat Broadcast</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1, padding: "1.5rem" }}>
          {error && (
            <div style={{ background: "#fee2e2", color: "#dc2626", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          {senderInfo && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <i className="pi pi-user" style={{ color: "#3b82f6", fontSize: "1.25rem" }}></i>
              <div style={{ fontSize: "0.875rem" }}>
                <span style={{ fontWeight: 600, color: "#1e3a8a" }}>Sales Pengirim:</span>{" "}
                <span style={{ color: "#1e40af" }}>{senderInfo.nama}</span>{" "}
                <span style={{ color: "#64748b" }}>|</span>{" "}
                <span style={{ fontWeight: 600, color: "#1e3a8a" }}>WhatsApp:</span>{" "}
                <span style={{ color: "#1e40af" }}>{senderInfo.no_telp || "-"}</span>
              </div>
            </div>
          )}

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "1.25rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="pi pi-info-circle" style={{ color: "#F1A124" }}></i>
              Informasi broadcast
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Nama broadcast <span style={{ color: "#dc2626" }}>*</span></label>
              <input type="text" name="nama" value={formData.nama} onChange={handleChange} required placeholder="Contoh: Promo Januari 2026" style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.375rem" }} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Pilih Template (Opsional)</label>
              <select onChange={handleTemplateChange} style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.375rem" }}>
                <option value="">-- Ketik pesan manual --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.judul}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Pesan <span style={{ color: "#dc2626" }}>*</span></label>
              <textarea ref={textareaRef} name="pesan" value={formData.pesan} onChange={handleChange} required placeholder="Tulis pesan WhatsApp..." rows="5" style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.375rem", resize: "vertical" }} />
              
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => insertAutoText('{Halo|Hai|Selamat pagi}')} style={{ background: "#e2e8f0", border: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}>Sapaan (Spintax)</button>
                <button type="button" onClick={() => insertAutoText('{{customer_name}}')} style={{ background: "#e2e8f0", border: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}>Nama Customer</button>
                <button type="button" onClick={() => insertAutoText('{{product_name}}')} style={{ background: "#e2e8f0", border: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}>Nama Produk</button>
                <button type="button" onClick={() => insertAutoText('{{order_total}}')} style={{ background: "#e2e8f0", border: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}>Total Order</button>
                
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "#e2e8f0", border: "none", padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}>😊 Emoji</button>
                  {showEmojiPicker && (
                    <div style={{ position: "absolute", bottom: "100%", left: 0, zIndex: 100 }}>
                      <EmojiPicker onEmojiClick={handleEmojiClick} height={300} width={280} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "1.25rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="pi pi-clock" style={{ color: "#F1A124" }}></i>
              Waktu pengiriman
            </div>
            
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: !formData.langsung_kirim ? "1rem" : "0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                <input type="radio" checked={formData.langsung_kirim} onChange={() => setFormData(p => ({...p, langsung_kirim: true, tanggal_kirim: null}))} /> Langsung
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                <input type="radio" checked={!formData.langsung_kirim} onChange={() => setFormData(p => ({...p, langsung_kirim: false}))} /> Jadwalkan
              </label>
            </div>

            {!formData.langsung_kirim && (
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Tanggal & waktu kirim</label>
                <Calendar value={formData.tanggal_kirim} onChange={(e) => setFormData(p => ({...p, tanggal_kirim: e.value}))} showTime hourFormat="24" style={{ width: "100%" }} />
              </div>
            )}
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="pi pi-users" style={{ color: "#F1A124" }}></i>
              Target penerima
            </div>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, fontSize: "0.875rem" }}>Tipe Target</label>
              <div style={{ display: "flex", gap: "1.5rem", padding: "0.75rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "0.375rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                  <input type="radio" checked={formData.target.tipe === "filter"} onChange={() => setFormData(p => ({...p, target: {...p.target, tipe: "filter"}}))} /> Filter Data Order
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                  <input type="radio" checked={formData.target.tipe === "excel"} onChange={() => setFormData(p => ({...p, target: {...p.target, tipe: "excel"}}))} /> Upload Excel
                </label>
              </div>
            </div>

            {formData.target.tipe === "filter" && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Produk</label>
                  <div style={{ position: "relative" }}>
                    <div 
                      onClick={() => setShowProdukDropdown(!showProdukDropdown)} 
                      style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.375rem", background: "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span style={{ color: formData.target.produk.length === 0 ? "#9ca3af" : "inherit" }}>
                        {formData.target.produk.length === 0 ? "Semua produk" : `${formData.target.produk.length} produk dipilih`}
                      </span>
                      <i className="pi pi-chevron-down" />
                    </div>

                    {showProdukDropdown && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "0.375rem", marginTop: "0.25rem", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                        <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                            <input type="checkbox" checked={formData.target.produk.length === 0} onChange={toggleSemuaProduk} />
                            Semua produk (tidak filter produk)
                          </label>
                        </div>
                        {products.map(p => (
                          <div key={p.id} style={{ padding: "0.5rem 1rem" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                              <input type="checkbox" checked={formData.target.produk.includes(p.id)} onChange={() => toggleProduk(p.id)} />
                              {p.nama}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Status Order</label>
                    <select 
                      value={formData.target.status_order || ""}
                      onChange={(e) => setFormData(p => ({...p, target: {...p.target, status_order: e.target.value}}))}
                      style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.375rem" }}
                    >
                      <option value="">Semua Status Order</option>
                      {statusOrderOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Status Pembayaran</label>
                    <select 
                      value={formData.target.status_pembayaran !== null ? formData.target.status_pembayaran : ""}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val === "null") val = null;
                        setFormData(p => ({...p, target: {...p.target, status_pembayaran: val}}));
                      }}
                      style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.375rem" }}
                    >
                      <option value="">Semua Status Pembayaran</option>
                      {statusPembayaranOptions.map((opt, idx) => (
                        <option key={idx} value={opt.value === null ? "null" : opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {formData.target.tipe === "excel" && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>Upload Excel Target</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleExcelUpload} 
                    ref={fileInputRef}
                    style={{ display: "none" }}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: "0.5rem 1rem", background: "#e2e8f0", border: "none", borderRadius: "0.375rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                    disabled={isUploadingExcel}
                  >
                    <i className={isUploadingExcel ? "pi pi-spin pi-spinner" : "pi pi-upload"}></i>
                    {isUploadingExcel ? "Memproses..." : "Pilih File Excel"}
                  </button>
                  {formData.target.excel_data && (
                    <span style={{ fontSize: "0.875rem", color: "#16a34a", fontWeight: 600 }}>
                      {formData.target.excel_data.length} kontak siap dikirim
                    </span>
                  )}
                  {formData.target.excel_data && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setFormData(prev => ({...prev, target: {...prev.target, excel_data: null}}));
                        if (fileInputRef.current) fileInputRef.current.value = null;
                      }}
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.875rem" }}
                    >
                      Batal
                    </button>
                  )}
                </div>
                <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem" }}>Format: Kolom A (Nama), Kolom B (No WA)</small>
              </div>
            )}
          </div>
        </form>
        
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "0.75rem", background: "#f8fafc", borderBottomLeftRadius: "0.75rem", borderBottomRightRadius: "0.75rem" }}>
          <button type="button" onClick={onClose} style={{ padding: "0.5rem 1rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 500 }}>Batal</button>
          <button type="button" onClick={handleSubmit} disabled={submitting} style={{ padding: "0.5rem 1rem", background: "#F1A124", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 500 }}>
            {submitting ? "Menyimpan..." : "Simpan Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}
