"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import "@/styles/sales/customer.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads-modal.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { toastSuccess, toastError } from "@/lib/toast";

const BASE_URL = "/api";

export default function GenerateLeadsModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    lead_label: "",
    sales_id: null,
    all: false,
    min_salary: null,
    produk_id: [],
  });

  const [salesList, setSalesList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch sales and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch sales list from API
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

        // Fetch products
        const productsRes = await fetch(`${BASE_URL}/sales/produk`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          if (productsData.success && productsData.data) {
            const productOptions = Array.isArray(productsData.data)
              ? productsData.data.map((p) => ({
                  value: p.id,
                  label: p.nama || p.name,
                }))
              : [];
            setProducts(productOptions);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.lead_label || !formData.lead_label.trim()) {
      toastError("Label Lead wajib diisi");
      return;
    }

    if (!formData.sales_id) {
      toastError("Assign Sales wajib dipilih");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      // Build payload according to API documentation
      // Note: API expects single produk_id, but we allow multiple selection
      // If multiple selected, we'll use the first one or send all if API supports it
      const payload = {
        lead_label: formData.lead_label.trim(),
        sales_id: formData.sales_id,
        all: formData.all || false,
        ...(formData.min_salary && { min_salary: Number(formData.min_salary) }),
        // API expects single produk_id, so we use the first selected product
        ...(formData.produk_id && formData.produk_id.length > 0 && { produk_id: formData.produk_id[0] }),
      };

      const res = await fetch(`${BASE_URL}/sales/lead/generate`, {
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
        throw new Error(data.message || "Gagal generate leads");
      }

      toastSuccess(data.message || "Leads berhasil di-generate");
      setTimeout(() => {
        onSuccess(data.message || "Leads berhasil di-generate");
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toastError("Gagal generate leads: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(600px, 95vw)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Generate Leads dari Customer</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Body */}
        <form className="modal-body modal-body--form" onSubmit={handleSubmit} style={{ overflowY: "auto" }}>
          <p style={{ color: "var(--dash-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Generate leads otomatis berdasarkan data customer. Customer yang sudah memiliki lead dengan label yang sama
            akan di-skip.
          </p>

          {/* Label Lead */}
          <div className="form-group form-group--primary">
            <label>
              Label Lead <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Campaign A"
              value={formData.lead_label}
              onChange={(e) => handleChange("lead_label", e.target.value)}
              className="form-input"
            />
          </div>

          {/* Assign Sales */}
          <div className="form-group form-group--primary">
            <label>
              Assign Sales <span className="required">*</span>
            </label>
            <Dropdown
              value={formData.sales_id}
              options={salesList}
              onChange={(e) => handleChange("sales_id", e.value)}
              placeholder="Pilih Sales"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
            />
          </div>

          {/* Generate dari Semua Customer */}
          <div className="form-group form-group--secondary">
            <label>
              <input
                type="checkbox"
                checked={formData.all}
                onChange={(e) => handleChange("all", e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Generate dari Semua Customer
            </label>
          </div>

          {/* Filter Pendapatan Minimum */}
          <div className="form-group form-group--secondary">
            <label>Filter Pendapatan Minimum (min_salary)</label>
            <InputNumber
              value={formData.min_salary}
              onValueChange={(e) => handleChange("min_salary", e.value)}
              placeholder="Tidak ada filter"
              mode="currency"
              currency="IDR"
              locale="id-ID"
              className="w-full"
              style={{ width: "100%" }}
              useGrouping={true}
            />
            {!formData.min_salary && (
              <small style={{ color: "var(--dash-muted)", marginTop: "0.25rem", display: "block" }}>
                Tidak ada filter
              </small>
            )}
          </div>

          {/* Filter Produk yang Pernah Dibeli - Checkbox */}
          <div className="form-group form-group--secondary">
            <label>Filter Produk yang Pernah Dibeli</label>
            <div style={{ marginTop: "0.5rem", maxHeight: "200px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "0.5rem" }}>
              {products.length > 0 ? (
                products.map((product) => (
                  <label
                    key={product.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.5rem",
                      cursor: "pointer",
                      borderRadius: "0.25rem",
                      marginBottom: "0.25rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <input
                      type="checkbox"
                      checked={formData.produk_id.includes(product.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange("produk_id", [...formData.produk_id, product.value]);
                        } else {
                          handleChange(
                            "produk_id",
                            formData.produk_id.filter((id) => id !== product.value)
                          );
                        }
                      }}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <span>{product.label}</span>
                  </label>
                ))
              ) : (
                <div style={{ padding: "0.5rem", color: "var(--dash-muted)" }}>Tidak ada produk</div>
              )}
            </div>
            {(!formData.produk_id || formData.produk_id.length === 0) && (
              <small style={{ color: "var(--dash-muted)", marginTop: "0.25rem", display: "block" }}>
                Tidak ada filter
              </small>
            )}
            {formData.produk_id && formData.produk_id.length > 1 && (
              <small style={{ color: "#f59e0b", marginTop: "0.25rem", display: "block" }}>
                ⚠️ Hanya produk pertama yang akan digunakan ({products.find((p) => p.value === formData.produk_id[0])?.label || formData.produk_id[0]})
              </small>
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
            disabled={submitting}
          >
            {submitting ? "Memproses..." : "Generate Leads"}
          </button>
        </div>
      </div>
    </div>
  );
}

