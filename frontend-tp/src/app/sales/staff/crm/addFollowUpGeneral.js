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

export default function AddFollowUpGeneralModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    lead_id: null,
    follow_up_date: null,
    channel: "",
    type: "",
    note: "",
  });

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch leads list for dropdown
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${BASE_URL}/sales/lead?per_page=1000`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data)) {
            // Format leads untuk dropdown
            const leadOptions = json.data.map((lead) => {
              const customer = lead.customer_rel || {};
              const customerName = customer.nama || lead.nama || "-";
              return {
                value: lead.id,
                label: `${customerName}${lead.lead_label ? ` (${lead.lead_label})` : ""}`,
                lead: lead,
              };
            });
            setLeads(leadOptions);
          }
        }
      } catch (err) {
        console.error("Error fetching leads:", err);
        toastError("Gagal memuat daftar leads");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  // Set default date to now
  useEffect(() => {
    if (!formData.follow_up_date) {
      setFormData((prev) => ({ ...prev, follow_up_date: new Date() }));
    }
  }, []);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.lead_id) {
      toastError("Lead wajib dipilih");
      return;
    }

    if (!formData.follow_up_date) {
      toastError("Tanggal & Waktu Follow Up wajib diisi");
      return;
    }

    if (!formData.type) {
      toastError("Type Aktivitas wajib dipilih");
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

      const res = await fetch(`${BASE_URL}/sales/lead/${formData.lead_id}/followup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          follow_up_date: formatDateTime(formData.follow_up_date),
          channel: formData.channel || "",
          note: formData.note || "",
          type: formData.type,
        }),
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
          <h2>Tambah Follow Up</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Body */}
        <form className="modal-body modal-body--form" onSubmit={handleSubmit} style={{ overflowY: "auto" }}>
          {/* Lead Dropdown */}
          <div className="form-group form-group--primary">
            <label>
              Lead <span className="required">*</span>
            </label>
            <Dropdown
              value={formData.lead_id}
              options={leads}
              onChange={(e) => handleChange("lead_id", e.value)}
              placeholder="Pilih Lead"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
              loading={loading}
              filter
              filterPlaceholder="Cari lead..."
            />
          </div>

          {/* Follow Up Date & Time */}
          <div className="form-group form-group--primary">
            <label>
              Tanggal & Waktu Follow Up <span className="required">*</span>
            </label>
            <Calendar
              value={formData.follow_up_date}
              onChange={(e) => handleChange("follow_up_date", e.value)}
              showTime
              hourFormat="24"
              dateFormat="dd/mm/yy"
              placeholder="23/12/2025 12:19"
              className="w-full"
              style={{ width: "100%" }}
            />
          </div>

          {/* Channel Dropdown (Optional) */}
          <div className="form-group form-group--secondary">
            <label>Channel</label>
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
              Type Aktivitas <span className="required">*</span>
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

          {/* Note (Optional) */}
          <div className="form-group form-group--secondary">
            <label>Catatan</label>
            <textarea
              placeholder="Catatan follow up..."
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="form-input"
              rows={4}
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

