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

export default function AddLeadModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_id: null,
    sales_id: null,
    lead_label: "",
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
  const [currentUser, setCurrentUser] = useState(null);
  const [isStaffLevel2, setIsStaffLevel2] = useState(false);

  // Get current user data and check level
  useEffect(() => {
    const userDataStr = localStorage.getItem("user");
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        setCurrentUser(user);
        // Check if user is staff level 2
        const userLevel = user?.level ? Number(user.level) : null;
        if (userLevel === 2) {
          setIsStaffLevel2(true);
          // Auto set sales_id to current user's id (ensure it's a number)
          if (user.id) {
            const userId = Number(user.id);
            if (!isNaN(userId)) {
              setFormData((prev) => ({ ...prev, sales_id: userId }));
            }
          }
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  // Fetch customers and sales list
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

        // Fetch sales list from API - use /api/sales/lead/sales-list
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

        // Fetch labels from API
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
      // If staff level 2, always include sales_id from current user
      let salesId = null;
      if (isStaffLevel2 && currentUser?.id) {
        // Ensure sales_id is a number for staff level 2
        salesId = Number(currentUser.id);
        if (isNaN(salesId) || salesId <= 0) {
          toastError("Sales ID tidak valid. Silakan login kembali.");
          setSubmitting(false);
          return;
        }
      } else if (formData.sales_id) {
        salesId = Number(formData.sales_id);
        if (isNaN(salesId) || salesId <= 0) {
          toastError("Sales ID tidak valid. Silakan pilih Sales.");
          setSubmitting(false);
          return;
        }
      } else {
        toastError("Sales ID wajib diisi. Silakan pilih Sales.");
        setSubmitting(false);
        return;
      }
      
      console.log("📤 Submitting lead with sales_id:", salesId, "type:", typeof salesId, "isStaffLevel2:", isStaffLevel2, "currentUser:", currentUser);
      console.log("📤 Form data sales_id:", formData.sales_id, "type:", typeof formData.sales_id);
      
      const payload = {
        customer_id: Number(formData.customer_id),
        lead_label: formData.lead_label.trim(),
        status: "NEW",
        sales_id: salesId, // Always include sales_id as number
        ...(formData.minat_produk && formData.minat_produk.trim() && { minat_produk: formData.minat_produk.trim() }),
        ...(formData.alasan_tertarik && formData.alasan_tertarik.trim() && { alasan_tertarik: formData.alasan_tertarik.trim() }),
        ...(formData.alasan_belum && formData.alasan_belum.trim() && { alasan_belum: formData.alasan_belum.trim() }),
        ...(formData.harapan && formData.harapan.trim() && { harapan: formData.harapan.trim() }),
        ...(formData.last_contact_at && { last_contact_at: formatDateTime(formData.last_contact_at) }),
        ...(formData.next_follow_up_at && { next_follow_up_at: formatDateTime(formData.next_follow_up_at) }),
      };

      console.log("📤 Payload:", JSON.stringify(payload, null, 2));

      const res = await fetch(`${BASE_URL}/sales/lead`, {
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
        // Handle validation errors
        if (data.errors && typeof data.errors === "object") {
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return messages.join(", ");
              }
              return String(messages);
            })
            .join("\n");
          throw new Error(errorMessages || data.message || "Gagal menambahkan lead");
        }
        throw new Error(data.message || "Gagal menambahkan lead");
      }

      toastSuccess(data.message || "Lead berhasil ditambahkan");
      setTimeout(() => {
        onSuccess(data.message || "Lead berhasil ditambahkan");
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toastError("Gagal menambahkan lead: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(600px, 95vw)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="modal-header">
          <h2>Tambah Lead Baru</h2>
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

          {/* Assign Sales - Hidden/Disabled for staff level 2 */}
          {!isStaffLevel2 && (
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
              />
            </div>
          )}
          {isStaffLevel2 && currentUser && (
            <div className="form-group form-group--primary">
              <label>Assign Sales</label>
              <input
                type="text"
                value={currentUser.nama || currentUser.name || "Anda"}
                className="form-input"
                disabled
                style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
              />
              <small style={{ color: "var(--dash-muted)", marginTop: "0.25rem", display: "block" }}>
                Lead akan otomatis di-assign ke Anda
              </small>
            </div>
          )}

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
            {submitting ? "Memproses..." : "Tambah Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

