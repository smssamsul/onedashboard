"use client";

import { useState, useEffect } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import "@/styles/sales/customer.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads-modal.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { toastSuccess, toastError } from "@/lib/toast";

const BASE_URL = "/api";

export default function EditLeadModal({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_id: null,
    sales_id: null,
    lead_label: "",
    status: "",
    minat_produk: "",
    alasan_tertarik: "",
    alasan_belum: "",
    harapan: "",
    last_contact_at: null,
    next_follow_up_at: null,
  });

  const [customers, setCustomers] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Status options (CONVERTED, LOST, QUALIFIED tidak bisa diubah manual)
  const STATUS_OPTIONS = [
    { value: "NEW", label: "NEW" },
    { value: "CONTACTED", label: "CONTACTED" },
  ];

  // Load lead data and fetch options
  useEffect(() => {
    if (lead) {
      // Set form data from lead
      setFormData({
        customer_id: lead.customer_id || lead.customer_rel?.id || null,
        sales_id: lead.sales_id || lead.sales_rel?.id || null,
        lead_label: lead.lead_label || lead.label || "",
        status: lead.status || "NEW",
        minat_produk: lead.minat_produk || "",
        alasan_tertarik: lead.alasan_tertarik || "",
        alasan_belum: lead.alasan_belum || lead.alasan_belum_membeli || "",
        harapan: lead.harapan || lead.harapan_customer || "",
        last_contact_at: lead.last_contact_at || lead.last_contact ? new Date(lead.last_contact_at || lead.last_contact) : null,
        next_follow_up_at: lead.next_follow_up_at || lead.next_followup ? new Date(lead.next_follow_up_at || lead.next_followup) : null,
      });

      // Set customer search
      const customer = lead.customer_rel || {};
      setCustomerSearch(customer.nama || "");
    }
  }, [lead]);

  // Fetch customers, sales list, and labels
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch customers
        const customersRes = await fetch(`${BASE_URL}/sales/customer`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          if (customersData.success && customersData.data) {
            setCustomers(customersData.data);
          }
        }

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
            setLabelOptions(labelsData.data);
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

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearch) return true;
    const searchLower = customerSearch.toLowerCase();
    return (
      customer.nama?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.wa?.toLowerCase().includes(searchLower)
    );
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toastError("Customer wajib dipilih");
      return;
    }

    if (!formData.lead_label || !formData.lead_label.trim()) {
      toastError("Label Lead wajib diisi");
      return;
    }

    // Check if status is editable (CONVERTED, LOST, QUALIFIED tidak bisa diubah manual)
    const nonEditableStatuses = ["CONVERTED", "LOST", "QUALIFIED"];
    if (nonEditableStatuses.includes(lead?.status?.toUpperCase())) {
      toastError(`Status ${lead.status} tidak bisa diubah manual. Hanya bisa diubah melalui follow-up.`);
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      // Format dates to "YYYY-MM-DD HH:mm:ss" if provided
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

      // Build payload according to API documentation
      const payload = {
        customer_id: formData.customer_id,
        lead_label: formData.lead_label.trim(),
        ...(formData.sales_id && { sales_id: formData.sales_id }),
        ...(formData.status && { status: formData.status.toUpperCase() }),
        ...(formData.minat_produk && formData.minat_produk.trim() && { minat_produk: formData.minat_produk.trim() }),
        ...(formData.alasan_tertarik && formData.alasan_tertarik.trim() && { alasan_tertarik: formData.alasan_tertarik.trim() }),
        ...(formData.alasan_belum && formData.alasan_belum.trim() && { alasan_belum: formData.alasan_belum.trim() }),
        ...(formData.harapan && formData.harapan.trim() && { harapan: formData.harapan.trim() }),
        ...(formData.last_contact_at && { last_contact_at: formatDateTime(formData.last_contact_at) }),
        ...(formData.next_follow_up_at && { next_follow_up_at: formatDateTime(formData.next_follow_up_at) }),
      };

      const res = await fetch(`${BASE_URL}/sales/lead/${lead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengupdate lead");
      }

      toastSuccess(data.message || "Lead berhasil diupdate");
      setTimeout(() => {
        onSuccess(data.message || "Lead berhasil diupdate");
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toastError("Gagal mengupdate lead: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);
  const isStatusEditable = lead?.status && !["CONVERTED", "LOST", "QUALIFIED"].includes(lead.status.toUpperCase());

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(600px, 95vw)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Edit Lead</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Body */}
        <form className="modal-body modal-body--form" onSubmit={handleSubmit} style={{ overflowY: "auto" }}>
          {/* Customer */}
          <div className="form-group form-group--primary">
            <label>
              Customer <span className="required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Cari customer..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="form-input"
                style={{ width: "100%" }}
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="leads-customer-dropdown">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="leads-customer-dropdown-item"
                      onClick={() => {
                        handleChange("customer_id", customer.id);
                        setCustomerSearch(customer.nama || "");
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div className="leads-customer-name">{customer.nama}</div>
                      <div className="leads-customer-info">
                        {customer.email} | {customer.wa}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <small style={{ color: "var(--dash-muted)", marginTop: "0.25rem", display: "block" }}>
                Dipilih: {selectedCustomer.nama}
              </small>
            )}
          </div>

          {/* Assign Sales */}
          <div className="form-group form-group--primary">
            <label>Assign Sales</label>
            <Dropdown
              value={formData.sales_id}
              options={salesList}
              onChange={(e) => handleChange("sales_id", e.value)}
              placeholder="Pilih Sales"
              className="w-full"
              style={{ width: "100%" }}
              optionLabel="label"
              optionValue="value"
              showClear
            />
          </div>

          {/* Label Lead */}
          <div className="form-group form-group--primary">
            <label>
              Label Lead <span className="required">*</span>
            </label>
            <Dropdown
              value={formData.lead_label}
              options={labelOptions.map((label) => ({ value: label, label: label }))}
              onChange={(e) => handleChange("lead_label", e.value)}
              placeholder="Pilih atau ketik label"
              className="w-full"
              style={{ width: "100%" }}
              filter
              editable
            />
          </div>

          {/* Status */}
          <div className="form-group form-group--primary">
            <label>Status</label>
            {isStatusEditable ? (
              <Dropdown
                value={formData.status}
                options={STATUS_OPTIONS}
                onChange={(e) => handleChange("status", e.value)}
                placeholder="Pilih Status"
                className="w-full"
                style={{ width: "100%" }}
                optionLabel="label"
                optionValue="value"
              />
            ) : (
              <input
                type="text"
                value={formData.status}
                className="form-input"
                disabled
                style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
              />
            )}
            {!isStatusEditable && (
              <small style={{ color: "var(--dash-muted)", marginTop: "0.25rem", display: "block" }}>
                Status CONVERTED, LOST, dan QUALIFIED tidak bisa diubah manual (hanya melalui follow-up)
              </small>
            )}
          </div>

          {/* Minat Produk */}
          <div className="form-group form-group--secondary">
            <label>Minat Produk</label>
            <input
              type="text"
              placeholder="Produk yang diminati customer"
              value={formData.minat_produk}
              onChange={(e) => handleChange("minat_produk", e.target.value)}
              className="form-input"
            />
          </div>

          {/* Alasan Tertarik */}
          <div className="form-group form-group--secondary">
            <label>Alasan Tertarik</label>
            <textarea
              placeholder="Alasan customer tertarik..."
              value={formData.alasan_tertarik}
              onChange={(e) => handleChange("alasan_tertarik", e.target.value)}
              className="form-input"
              rows={3}
            />
          </div>

          {/* Alasan Belum Membeli */}
          <div className="form-group form-group--secondary">
            <label>Alasan Belum Membeli</label>
            <textarea
              placeholder="Alasan customer belum membeli..."
              value={formData.alasan_belum}
              onChange={(e) => handleChange("alasan_belum", e.target.value)}
              className="form-input"
              rows={3}
            />
          </div>

          {/* Harapan Customer */}
          <div className="form-group form-group--secondary">
            <label>Harapan Customer</label>
            <textarea
              placeholder="Harapan dari customer..."
              value={formData.harapan}
              onChange={(e) => handleChange("harapan", e.target.value)}
              className="form-input"
              rows={3}
            />
          </div>

          {/* Last Contact */}
          <div className="form-group form-group--secondary">
            <label>Last Contact</label>
            <Calendar
              value={formData.last_contact_at}
              onChange={(e) => handleChange("last_contact_at", e.value)}
              showTime
              hourFormat="24"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy --:--"
              className="w-full"
              style={{ width: "100%" }}
            />
          </div>

          {/* Next Follow Up */}
          <div className="form-group form-group--secondary">
            <label>Next Follow Up</label>
            <Calendar
              value={formData.next_follow_up_at}
              onChange={(e) => handleChange("next_follow_up_at", e.value)}
              showTime
              hourFormat="24"
              dateFormat="dd/mm/yy"
              placeholder="dd/mm/yyyy --:--"
              className="w-full"
              style={{ width: "100%" }}
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
            {submitting ? "Memproses..." : "Update Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

