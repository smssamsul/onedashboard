"use client";

import { useState, useEffect, useRef } from "react";
import { Dropdown } from "primereact/dropdown";
import dynamic from "next/dynamic";
import "@/styles/sales/customer.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads-modal.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
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

// Status options
const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export default function BroadcastLeadModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    message: "",
    lead_label: "",
    status: "",
    sales_id: null,
  });

  const [salesList, setSalesList] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAutotext, setSelectedAutotext] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const textareaRef = useRef(null);

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

  // Fetch sales list and labels
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch sales list
        const salesRes = await fetch(`${BASE_URL}/sales/lead/sales-list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          if (salesData.success && salesData.data && Array.isArray(salesData.data)) {
            const salesOpts = salesData.data.map((sales) => ({
              value: sales.id,
              label: sales.nama || sales.name || `Sales ${sales.id}`,
            }));
            setSalesList(salesOpts);
          }
        }

        // Fetch labels
        const labelsRes = await fetch(`${BASE_URL}/sales/lead/labels-list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (labelsRes.ok) {
          const labelsData = await labelsRes.json();
          if (labelsData.success && labelsData.data && Array.isArray(labelsData.data)) {
            const labelOpts = labelsData.data.map((label) => ({
              value: label,
              label: label,
            }));
            setLabelOptions(labelOpts);
          }
        }

        // Fetch products
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
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const insertAtCursor = (value) => {
    if (!value) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({ ...prev, message: (prev.message || "") + value }));
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = formData.message.slice(0, start);
    const after = formData.message.slice(end);
    const newValue = `${before}${value}${after}`;
    setFormData((prev) => ({ ...prev, message: newValue }));
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

    if (!formData.message || !formData.message.trim()) {
      toastError("Pesan WhatsApp wajib diisi");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      // Build payload according to API documentation
      const payload = {
        message: formData.message.trim(),
        ...(formData.lead_label && formData.lead_label.trim() && { lead_label: formData.lead_label.trim() }),
        ...(formData.status && formData.status !== "" && { status: formData.status.toUpperCase() }),
        ...(formData.sales_id && { sales_id: formData.sales_id }),
      };

      const res = await fetch(`${BASE_URL}/sales/lead/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengirim broadcast");
      }

      toastSuccess(data.message || "Broadcast berhasil dikirim");
      setTimeout(() => {
        onSuccess(data.message || "Broadcast berhasil dikirim");
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toastError("Gagal mengirim broadcast: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(600px, 95vw)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Broadcast Lead</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Body */}
        <form className="modal-body modal-body--form" onSubmit={handleSubmit} style={{ overflowY: "auto" }}>
          {/* Pesan WhatsApp */}
          <div className="form-group form-group--primary">
            <label>
              Pesan WhatsApp <span className="required">*</span>
            </label>
            <textarea
              ref={textareaRef}
              placeholder="Masukkan pesan yang akan dikirim..."
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              className="form-input"
              rows={10}
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

          {/* Filter Label Lead */}
          <div className="form-group form-group--secondary">
            <label>Filter Label Lead (Opsional)</label>
            <Dropdown
              value={formData.lead_label}
              options={labelOptions}
              onChange={(e) => handleChange("lead_label", e.value)}
              placeholder="Pilih Label (Opsional)"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
              showClear
            />
          </div>

          {/* Filter Status Lead */}
          <div className="form-group form-group--secondary">
            <label>Filter Status Lead (Opsional)</label>
            <Dropdown
              value={formData.status}
              options={STATUS_OPTIONS.filter((opt) => opt.value !== "all")}
              onChange={(e) => handleChange("status", e.value)}
              placeholder="Pilih Status (Opsional)"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
              showClear
            />
          </div>

          {/* Filter Assign Sales */}
          <div className="form-group form-group--secondary">
            <label>Filter Assign Sales (Opsional)</label>
            <Dropdown
              value={formData.sales_id}
              options={salesList}
              onChange={(e) => handleChange("sales_id", e.value)}
              placeholder="Pilih Sales (Opsional)"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
              showClear
            />
          </div>

          {/* Info */}
          <div
            style={{
              padding: "0.875rem",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--dash-text)", lineHeight: 1.6 }}>
              <strong>Info:</strong> Broadcast akan mengirim pesan ke semua lead yang sesuai dengan filter, mengubah
              status menjadi CONTACTED, dan mencatat aktivitas serta follow up.
            </p>
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
            disabled={submitting}
          >
            {submitting ? "Mengirim..." : "Kirim Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}

