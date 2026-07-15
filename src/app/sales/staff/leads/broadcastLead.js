"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "primereact/dropdown";
import "@/styles/sales/customer.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads-modal.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { toastSuccess, toastError } from "@/lib/toast";

const BASE_URL = "/api";

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
              placeholder="Masukkan pesan yang akan dikirim..."
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              className="form-input"
              rows={6}
            />
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

