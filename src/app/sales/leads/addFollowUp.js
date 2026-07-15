"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import "@/styles/sales/customer.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads-modal.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { toastSuccess, toastError } from "@/lib/toast";

const BASE_URL = "/api";

// Channel options
const CHANNEL_OPTIONS = [
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Telepon", label: "Telepon" },
  { value: "Email", label: "Email" },
  { value: "Meeting", label: "Meeting" },
  { value: "Lainnya", label: "Lainnya" },
];

// Type options (sesuai dokumentasi)
const TYPE_OPTIONS = [
  { value: "whatsapp_out", label: "WhatsApp Out" },
  { value: "call_out", label: "Call Out" },
  { value: "send_price", label: "Send Price" },
  { value: "interested", label: "Interested" },
  { value: "thinking", label: "Thinking" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

export default function AddFollowUpModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    follow_up_date: null,
    channel: "",
    note: "",
    type: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Get customer info from lead
  const customer = lead?.customer_rel || {};
  const customerName = customer.nama || lead?.nama || "-";
  const customerPhone = customer.wa || lead?.wa || "";
  const customerEmail = customer.email || lead?.email || "-";

  useEffect(() => {
    if (lead) {
      // Reset form when lead changes
      setFormData({
        follow_up_date: new Date(),
        channel: "",
        note: "",
        type: "",
      });
    }
  }, [lead]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.follow_up_date) {
      toastError("Tanggal Follow Up wajib diisi");
      return;
    }

    if (!formData.channel) {
      toastError("Channel wajib dipilih");
      return;
    }

    if (!formData.type) {
      toastError("Type wajib dipilih");
      return;
    }

    if (!formData.note || !formData.note.trim()) {
      toastError("Note wajib diisi");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      // Format date to "YYYY-MM-DD HH:mm:ss"
      const formatDateTime = (date) => {
        if (!date) return null;
        if (date instanceof Date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const seconds = String(date.getSeconds()).padStart(2, "0");
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        return null;
      };

      const payload = {
        lead_id: lead?.id,
        follow_up_date: formatDateTime(formData.follow_up_date),
        channel: formData.channel || null,
        note: formData.note.trim(),
        type: formData.type,
      };

      const res = await fetch(`${BASE_URL}/sales/followup`, {
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
        throw new Error(data.message || "Gagal menambahkan follow up");
      }

      toastSuccess(data.message || "Follow up berhasil ditambahkan");
      setTimeout(() => {
        onSuccess(data.message || "Follow up berhasil ditambahkan");
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toastError("Gagal menambahkan follow up: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(500px, 95vw)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Input Follow Up</h2>
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
            </div>
          </div>

          {/* Follow Up Date */}
          <div className="form-group form-group--primary">
            <label>
              Tanggal Follow Up <span className="required">*</span>
            </label>
            <Calendar
              value={formData.follow_up_date}
              onChange={(e) => handleChange("follow_up_date", e.value)}
              showTime
              hourFormat="24"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy --:--"
              className="w-full"
              style={{ width: "100%" }}
            />
          </div>

          {/* Channel Dropdown */}
          <div className="form-group form-group--primary">
            <label>
              Channel <span className="required">*</span>
            </label>
            <Dropdown
              value={formData.channel}
              options={CHANNEL_OPTIONS}
              onChange={(e) => handleChange("channel", e.value)}
              placeholder="Pilih Channel"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
            />
          </div>

          {/* Type Dropdown */}
          <div className="form-group form-group--primary">
            <label>
              Type <span className="required">*</span>
            </label>
            <Dropdown
              value={formData.type}
              options={TYPE_OPTIONS}
              onChange={(e) => handleChange("type", e.value)}
              placeholder="Pilih Type"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
            />
            <small style={{ color: "var(--dash-muted)", marginTop: "0.25rem", display: "block" }}>
              closed_won → CONVERTED | closed_lost → LOST | interested → QUALIFIED | lainnya → CONTACTED
            </small>
          </div>

          {/* Note (Required) */}
          <div className="form-group form-group--primary">
            <label>
              Note <span className="required">*</span>
            </label>
            <textarea
              placeholder="Tambahkan note..."
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="form-input"
              rows={4}
              required
            />
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
            {submitting ? "Menyimpan..." : "Simpan Follow Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

