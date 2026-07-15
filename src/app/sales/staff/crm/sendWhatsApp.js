"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "@/styles/sales/customer.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads-modal.css";
import { toastSuccess, toastError } from "@/lib/toast";

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
  { label: "{{payment_method}}", value: "{{payment_method}}" },
  { label: "{{payment_time}}", value: "{{payment_time}}" },
  { label: "{{payment_ke}}", value: "{{payment_ke}}" },
  { label: "{{amount}}", value: "{{amount}}" },
  { label: "{{amount_total}}", value: "{{amount_total}}" },
  { label: "{{amount_remaining}}", value: "{{amount_remaining}}" },
  { label: "{{amount_remaining_formatted}}", value: "{{amount_remaining_formatted}}" },
];

export default function SendWhatsAppModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    pesan: "",
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAutotext, setSelectedAutotext] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const textareaRef = useRef(null);

  // Get customer info from lead
  const customer = lead?.customer_rel || {};
  const customerName = customer.nama || lead?.nama || "-";
  const customerPhone = customer.wa || lead?.wa || "";
  const customerEmail = customer.email || lead?.email || "-";
  const customerPendapatan = customer.pendapatan_bln || lead?.pendapatan || "-";

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('[data-emoji-picker]')) {
        setShowEmojiPicker(false);
      }
      if (showProductDropdown && !event.target.closest('[data-product-search]')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, showProductDropdown]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const productsRes = await fetch(`${BASE_URL}/sales/produk`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          if (productsData.success && productsData.data && Array.isArray(productsData.data)) {
            // Filter only active products
            const activeProducts = productsData.data.filter((p) => p.status === "1" || p.status === 1);
            setProducts(activeProducts);
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (lead) {
      // Reset form when lead changes
      setFormData({ pesan: "" });
    }
  }, [lead]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const insertAtCursor = (value) => {
    if (!value) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({ ...prev, pesan: (prev.pesan || "") + value }));
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = formData.pesan.slice(0, start);
    const after = formData.pesan.slice(end);
    const newValue = `${before}${value}${after}`;
    setFormData((prev) => ({ ...prev, pesan: newValue }));
    requestAnimationFrame(() => {
      const newPos = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleInsertAutotext = () => {
    if (!selectedAutotext) {
      toastError("Pilih autotext terlebih dahulu");
      return;
    }
    
    // Jika memilih product_name, tampilkan search produk
    if (selectedAutotext === "{{product_name}}") {
      setShowProductSearch(true);
      setProductSearchQuery("");
      setShowProductDropdown(true);
      return;
    }
    
    // Untuk autotext lainnya, langsung insert
    insertAtCursor(selectedAutotext);
    setSelectedAutotext(""); // Reset selection
  };

  const handleSelectProduct = (product) => {
    // Insert {{product_name}} setelah user pilih produk
    insertAtCursor("{{product_name}}");
    setShowProductSearch(false);
    setProductSearchQuery("");
    setShowProductDropdown(false);
    setSelectedAutotext(""); // Reset selection
  };

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    if (!productSearchQuery) return true;
    const searchLower = productSearchQuery.toLowerCase();
    return (
      product.nama?.toLowerCase().includes(searchLower) ||
      product.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData?.emoji;
    if (emoji) {
      insertAtCursor(emoji);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.pesan || !formData.pesan.trim()) {
      toastError("Pesan WhatsApp wajib diisi");
      return;
    }

    if (!customerPhone) {
      toastError("Nomor WhatsApp customer tidak tersedia");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${BASE_URL}/sales/lead/${lead?.id}/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: formData.pesan.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengirim WhatsApp");
      }

      toastSuccess(data.message || "WhatsApp berhasil dikirim");
      setTimeout(() => {
        onSuccess(data.message || "WhatsApp berhasil dikirim");
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toastError("Gagal mengirim WhatsApp: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPendapatan = (pendapatan) => {
    if (!pendapatan || pendapatan === "-" || pendapatan === 0) return "—";
    // Format untuk range pendapatan (pendapatan_bln)
    const mapping = {
      "10-20jt": "10 - 20 Juta",
      "20-30jt": "20 - 30 Juta",
      "30-40jt": "30 - 40 Juta",
      "40-50jt": "40 - 50 Juta",
      "50-60jt": "50 - 60 Juta",
      "60-70jt": "60 - 70 Juta",
      "70-80jt": "70 - 80 Juta",
      "80-90jt": "80 - 90 Juta",
      "90-100jt": "90 - 100 Juta",
      ">100jt": "> 100 Juta",
    };
    // Jika sudah dalam format range, langsung return mapping
    if (mapping[pendapatan]) {
      return mapping[pendapatan];
    }
    // Fallback untuk format lama (number atau string dengan Rp)
    if (typeof pendapatan === "number") {
      return `Rp ${pendapatan.toLocaleString("id-ID")}`;
    }
    if (typeof pendapatan === "string") {
      const num = parseInt(pendapatan.replace(/[^\d]/g, ""));
      if (isNaN(num)) return "—";
      return `Rp ${num.toLocaleString("id-ID")}`;
    }
    return "—";
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(500px, 95vw)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Kirim WhatsApp</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Body */}
        <form className="modal-body modal-body--form" onSubmit={handleSubmit} style={{ overflowY: "auto" }}>
          {/* Customer Info */}
          <div className="leads-whatsapp-customer-info">
            <div className="leads-whatsapp-customer-name">{customerName}</div>
            <div className="leads-whatsapp-customer-detail">
              <div className="leads-whatsapp-detail-row">
                <span className="leads-whatsapp-detail-label">WhatsApp:</span>
                <span className="leads-whatsapp-detail-value">{customerPhone || "-"}</span>
              </div>
              <div className="leads-whatsapp-detail-row">
                <span className="leads-whatsapp-detail-label">Email:</span>
                <span className="leads-whatsapp-detail-value">{customerEmail}</span>
              </div>
              <div className="leads-whatsapp-detail-row">
                <span className="leads-whatsapp-detail-label">Pendapatan per Bulan:</span>
                <span className="leads-whatsapp-detail-value">{formatPendapatan(customerPendapatan)}</span>
              </div>
            </div>
          </div>

          {/* Pesan WhatsApp */}
          <div className="form-group form-group--primary">
            <label>
              Pesan WhatsApp <span className="required">*</span>
            </label>
            <textarea
              ref={textareaRef}
              placeholder="Tulis pesan yang akan dikirim ke customer..."
              value={formData.pesan}
              onChange={(e) => handleChange("pesan", e.target.value)}
              className="form-input"
              rows={10}
              required
            />
            
            {/* Autotext and Emoji Controls */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              {/* Autotext */}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flex: "1", minWidth: "200px" }}>
                <select
                  value={selectedAutotext}
                  onChange={(e) => setSelectedAutotext(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    border: "1px solid var(--dash-border)",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    backgroundColor: "var(--dash-surface)",
                    color: "var(--dash-text)",
                  }}
                >
                  {AUTOTEXT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleInsertAutotext}
                  disabled={!selectedAutotext}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: selectedAutotext ? "var(--primary)" : "var(--dash-border)",
                    color: selectedAutotext ? "white" : "var(--dash-muted)",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: selectedAutotext ? "pointer" : "not-allowed",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  Insert
                </button>
              </div>

              {/* Emoji Picker */}
              <div style={{ position: "relative" }} data-emoji-picker>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: showEmojiPicker ? "var(--primary)" : "var(--dash-surface)",
                    color: showEmojiPicker ? "white" : "var(--dash-text)",
                    border: "1px solid var(--dash-border)",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>😊</span>
                  <span>Emoticon</span>
                </button>
                {showEmojiPicker && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      right: 0,
                      marginBottom: "0.5rem",
                      zIndex: 1000,
                    }}
                  >
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
            </div>

            {/* Product Search - Muncul saat user pilih {{product_name}} */}
            {showProductSearch && (
              <div data-product-search style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "rgba(251, 133, 0, 0.05)", border: "1px solid rgba(251, 133, 0, 0.2)", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--dash-text)" }}>
                    Pilih Produk:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductSearch(false);
                      setProductSearchQuery("");
                      setShowProductDropdown(false);
                      setSelectedAutotext("");
                    }}
                    style={{
                      marginLeft: "auto",
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "var(--dash-muted)",
                    }}
                    title="Tutup"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Cari produk..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid var(--dash-border)",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      backgroundColor: "var(--dash-surface)",
                      color: "var(--dash-text)",
                    }}
                  />
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "0.25rem",
                        maxHeight: "200px",
                        overflowY: "auto",
                        backgroundColor: "var(--dash-surface)",
                        border: "1px solid var(--dash-border)",
                        borderRadius: "0.375rem",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                      }}
                    >
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            textAlign: "left",
                            backgroundColor: "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--dash-border)",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            color: "var(--dash-text)",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "rgba(251, 133, 0, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                          }}
                        >
                          {product.nama || product.name || `Produk ${product.id}`}
                        </button>
                      ))}
                    </div>
                  )}
                  {showProductDropdown && filteredProducts.length === 0 && productSearchQuery && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "0.25rem",
                        padding: "0.75rem",
                        backgroundColor: "var(--dash-surface)",
                        border: "1px solid var(--dash-border)",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        color: "var(--dash-muted)",
                        textAlign: "center",
                      }}
                    >
                      Produk tidak ditemukan
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer modal-footer--form">
          <button type="button" className="customers-button customers-button--secondary" onClick={onClose}>
            Batal
          </button>
          <button
            type="submit"
            className="customers-button customers-button--primary"
            onClick={handleSubmit}
            disabled={submitting || !customerPhone}
          >
            {submitting ? "Mengirim..." : "Kirim WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

