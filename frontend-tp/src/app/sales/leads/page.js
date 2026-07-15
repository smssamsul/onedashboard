"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Users, RefreshCw, Plus, Sparkles, Filter, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads.css";
import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";

const BASE_URL = "/api";

// Lazy load modals
const AddLeadModal = dynamic(() => import("./addLead"), { ssr: false });
const GenerateLeadsModal = dynamic(() => import("./generateLeads"), { ssr: false });
const BroadcastLeadModal = dynamic(() => import("./broadcastLead"), { ssr: false });
const SendWhatsAppModal = dynamic(() => import("./sendWhatsApp"), { ssr: false });
const AddFollowUpModal = dynamic(() => import("./addFollowUp"), { ssr: false });
const ViewLeadModal = dynamic(() => import("./viewLead"), { ssr: false });
const EditLeadModal = dynamic(() => import("./editLead"), { ssr: false });

const LEADS_COLUMNS = [
  "Nama Customer",
  "Label",
  "Status",
  "Assign Sales",
  "Minat Produk",
  "Last Contact",
  "Next Follow Up",
  "Aksi",
];

// Status options untuk dropdown
const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

// Label options akan di-fetch dari API (dinamis dari lead_label)

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [labelOptions, setLabelOptions] = useState([{ value: "all", label: "Semua Label" }]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const perPage = 15;
  const fetchingRef = useRef(false);
  const isInitialMount = useRef(true);
  
  // Modal states
  const [showAddLead, setShowAddLead] = useState(false);
  const [showGenerateLeads, setShowGenerateLeads] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showSendWhatsApp, setShowSendWhatsApp] = useState(false);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [showViewLead, setShowViewLead] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Statistics (tidak terpengaruh filter)
  const [statistics, setStatistics] = useState({
    total_leads: 0,
    new_leads: 0,
    contacted_leads: 0,
    qualified_leads: 0,
    converted_leads: 0,
    lost_leads: 0,
    active_leads: 0,
  });
  
  // Fetch leads data dengan pagination
  const fetchLeads = useCallback(async (pageNumber = 1) => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      console.log("⏸️ Already fetching, skipping duplicate request for page", pageNumber);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found");
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", pageNumber.toString());
      params.append("per_page", perPage.toString());
      
      // Add filters
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter.toUpperCase());
      }
      if (labelFilter && labelFilter !== "all") {
        params.append("lead_label", labelFilter);
      }
      if (searchInput && searchInput.trim()) {
        params.append("search", searchInput.trim());
      }

      const res = await fetch(`/api/sales/lead?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      
      if (json.success && json.data && Array.isArray(json.data)) {
        // Selalu replace data (bukan append) - setiap page menampilkan data yang berbeda
        setLeads(json.data);

        // Update label options jika ada label baru di current page
        // (Label options utama sudah di-fetch di fetchLabelOptions)
        const currentPageLabels = [...new Set(json.data.map((lead) => lead.lead_label).filter(Boolean))];
        setLabelOptions((prev) => {
          const existingValues = new Set(prev.map((opt) => opt.value));
          const newLabels = currentPageLabels.filter((label) => !existingValues.has(label));
          if (newLabels.length > 0) {
            return [
              ...prev,
              ...newLabels.map((label) => ({ value: label, label: label })),
            ];
          }
          return prev;
        });

        // Gunakan pagination object jika tersedia
        if (json.pagination && typeof json.pagination === "object") {
          const isLastPage = json.pagination.current_page >= json.pagination.last_page;
          setHasMore(!isLastPage);
          setPaginationInfo(json.pagination);
          console.log("📄 Pagination info (leads):", {
            current_page: json.pagination.current_page,
            last_page: json.pagination.last_page,
            total: json.pagination.total,
            hasMore: !isLastPage,
          });
        } else {
          setPaginationInfo(null);
          // Fallback pagination: cek jumlah data untuk menentukan hasMore
          if (json.data.length < perPage) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
        }

        // Statistics tidak dihitung dari fetchLeads, karena harus tetap menampilkan total (tidak terpengaruh filter)
      } else {
        console.warn("⚠️ Unexpected response format (leads):", json);
        setLeads([]);
        setHasMore(false);
        setPaginationInfo(null);
      }
      
      setLoading(false);
      fetchingRef.current = false;
    } catch (err) {
      console.error("Error fetching leads:", err);
      toastError("Gagal memuat data leads");
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [statusFilter, labelFilter, searchInput, perPage]);

  // Fetch statistics (tidak terpengaruh filter)
  const fetchStatistics = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/sales/lead/statistics`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStatistics({
            total_leads: json.data.total_leads || 0,
            new_leads: json.data.new_leads || 0,
            contacted_leads: json.data.contacted_leads || 0,
            qualified_leads: json.data.qualified_leads || 0,
            converted_leads: json.data.converted_leads || 0,
            lost_leads: json.data.lost_leads || 0,
            active_leads: json.data.active_leads || 0,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching statistics:", err);
    }
  }, []);

  // Fetch all unique labels untuk filter dropdown
  const fetchLabelOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch labels from API
      const res = await fetch(`/api/sales/lead/labels-list`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data)) {
          const labelOpts = [
            { value: "all", label: "Semua Label" },
            ...json.data.map((label) => ({ value: label, label: label })),
          ];
          setLabelOptions(labelOpts);
        }
      }
    } catch (err) {
      console.error("Error fetching label options:", err);
    }
  }, []);

  // Initial load: fetch page 1, label options, dan statistics
  useEffect(() => {
    setPage(1);
    setLeads([]);
    setHasMore(true);
    fetchLeads(1);
    fetchLabelOptions();
    fetchStatistics();
    // Mark initial mount as complete after a short delay
    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Hanya sekali saat mount

  // Fetch data saat page berubah
  useEffect(() => {
    if (page > 1 && !loading && !isInitialMount.current) {
      fetchLeads(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // Hanya depend pada page

  // Reset page ke 1 dan fetch ulang ketika filter berubah (dengan debounce untuk search)
  useEffect(() => {
    // Skip pada initial mount
    if (isInitialMount.current) return;
    
    // Debounce untuk search input
    const timeoutId = setTimeout(() => {
      // Reset ke page 1 dan fetch ulang data
      setPage(1);
      setLeads([]);
      setHasMore(true);
      fetchLeads(1);
    }, searchInput ? 500 : 0); // 500ms debounce untuk search, langsung untuk filter dropdown
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, statusFilter, labelFilter]); // Reset page ketika filter berubah

  // Next page handler
  const handleNextPage = useCallback(() => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    console.log("🔄 Next page clicked, loading page:", nextPage);
    setPage(nextPage);
  }, [page, hasMore, loading]);

  // Previous page handler
  const handlePrevPage = useCallback(() => {
    if (loading || page <= 1) return;
    
    const prevPage = page - 1;
    console.log("🔄 Previous page clicked, loading page:", prevPage);
    setPage(prevPage);
  }, [page, loading]);

  // Refresh handler
  const requestRefresh = useCallback(async (message, type = "success") => {
    setPage(1);
    setLeads([]);
    setHasMore(true);
    await fetchLeads(1);
    await fetchStatistics(); // Refresh statistics juga
    if (message) {
      if (type === "error") {
        toastError(message);
      } else if (type === "warning") {
        toastWarning(message);
      } else {
        toastSuccess(message);
      }
    }
  }, [fetchLeads, fetchStatistics]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".leads-filter-dropdown")) {
        setShowStatusDropdown(false);
        setShowLabelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleRefresh = useCallback(async () => {
    await requestRefresh("Data berhasil diperbarui", "success");
  }, [requestRefresh]);

  const handleBroadcast = () => {
    setShowBroadcast(true);
  };

  const handleAddLead = () => {
    setShowAddLead(true);
  };

  const handleGenerateLeads = () => {
    setShowGenerateLeads(true);
  };

  const handleModalSuccess = (message) => {
    toastSuccess(message);
    requestRefresh(message, "success");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const statusMap = {
      new: "status-new",
      contacted: "status-contacted",
      qualified: "status-qualified",
      converted: "status-converted",
      lost: "status-lost",
    };
    return statusMap[statusLower] || "status-default";
  };

  const getLabelClass = (label) => {
    const labelLower = label?.toLowerCase() || "";
    const labelMap = {
      hot: "label-hot",
      warm: "label-warm",
      cold: "label-cold",
    };
    return labelMap[labelLower] || "label-default";
  };
  const searchedLeads = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return leads;
  
    return leads.filter((lead) => {
      const customer = lead.customer_rel || {};
      return (
        customer.nama?.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q) ||
        customer.wa?.toLowerCase().includes(q) ||
        lead.nama?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.wa?.toLowerCase().includes(q) ||
        lead.minat_produk?.toLowerCase().includes(q)
      );
    });
  }, [leads, searchInput]);
  
  return (
    <Layout>
      <div className="dashboard-shell leads-shell">
        {/* Summary Cards */}
        <section className="dashboard-summary leads-summary">
          <article className="summary-card summary-card--combined summary-card--seven-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">Total Leads</p>
                <p className="summary-card__value">{statistics.total_leads}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">New Leads</p>
                <p className="summary-card__value">{statistics.new_leads}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">Contacted</p>
                <p className="summary-card__value">{statistics.contacted_leads}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">Qualified</p>
                <p className="summary-card__value">{statistics.qualified_leads}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">Converted</p>
                <p className="summary-card__value">{statistics.converted_leads}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">Lost</p>
                <p className="summary-card__value">{statistics.lost_leads}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Users size={20} />
              </div>
              <div>
                <p className="summary-card__label">Active</p>
                <p className="summary-card__value">{statistics.active_leads}</p>
              </div>
            </div>
          </article>
        </section>

        {/* Toolbar */}
        <section className="dashboard-hero leads-hero">
          <div className="orders-toolbar">
            <div className="orders-search">
              <input
                type="search"
                placeholder="Cari nama, email, atau produk..."
                className="orders-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="orders-search__icon pi pi-search" />
            </div>
            <div className="orders-toolbar-buttons">
              {/* Status Filter Dropdown */}
              <div className="leads-filter-dropdown" style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`leads-filter-btn ${statusFilter !== "all" ? "is-active" : ""}`}
                  onClick={() => {
                    setShowStatusDropdown(!showStatusDropdown);
                    setShowLabelDropdown(false);
                  }}
                >
                  {STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label || "Semua Status"}
                  <ChevronDown size={16} style={{ marginLeft: "0.5rem" }} />
                </button>
                {showStatusDropdown && (
                  <div className="leads-filter-dropdown-menu">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`leads-filter-dropdown-item ${statusFilter === option.value ? "is-selected" : ""}`}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setShowStatusDropdown(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Label Filter Dropdown */}
              <div className="leads-filter-dropdown" style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`leads-filter-btn ${labelFilter !== "all" ? "is-active" : ""}`}
                  onClick={() => {
                    setShowLabelDropdown(!showLabelDropdown);
                    setShowStatusDropdown(false);
                  }}
                >
                  {labelOptions.find((opt) => opt.value === labelFilter)?.label || "Semua Label"}
                  <ChevronDown size={16} style={{ marginLeft: "0.5rem" }} />
                </button>
                {showLabelDropdown && (
                  <div className="leads-filter-dropdown-menu">
                    {labelOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`leads-filter-dropdown-item ${labelFilter === option.value ? "is-selected" : ""}`}
                        onClick={() => {
                          setLabelFilter(option.value);
                          setShowLabelDropdown(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                className="customers-button customers-button--secondary"
                onClick={handleBroadcast}
                title="Broadcast"
              >
                <span style={{ marginRight: "0.5rem" }}>📢</span>
                Broadcast
              </button>
              <button
                type="button"
                className="customers-button customers-button--secondary"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw size={16} style={{ marginRight: "0.5rem" }} />
                Refresh
              </button>
              
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="panel leads-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">CRM / Leads Management</p>
              <h3 className="panel__title">Daftar Leads</h3>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                type="button"
                className="customers-button customers-button--primary"
                onClick={handleAddLead}
                title="Tambah Lead"
              >
                <Plus size={16} style={{ marginRight: "0.5rem" }} />
                Tambah Lead
              </button>
              <button
                type="button"
                className="customers-button customers-button--primary"
                onClick={handleGenerateLeads}
                title="Generate Leads"
              >
                <Sparkles size={16} style={{ marginRight: "0.5rem" }} />
                Generate Leads
              </button>
            </div>
          </div>

          <div className="leads-table__wrapper">
            <div className="leads-table">
              <div className="leads-table__head">
                {LEADS_COLUMNS.map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </div>
              <div className="leads-table__body">
              {searchedLeads.length > 0 ? (
                searchedLeads.map((lead, i) => {
                    const customer = lead.customer_rel || {};
                    const customerName = customer.nama || lead.nama || "-";
                    const customerEmail = customer.email || lead.email || "";
                    const customerPhone = customer.wa || lead.wa || "";
                    
                    // Assign Sales dari relasi sales_rel
                    const assignSales = lead.sales_rel || {};
                    const assignSalesName = assignSales.nama || assignSales.name || "";
                    const assignSalesRole = assignSales.level ? (assignSales.level === "2" ? "Sales" : assignSales.level === "1" ? "Admin" : "Sales") : "Sales";
                    
                    // Label dari lead_label
                    const leadLabel = lead.lead_label || lead.label || "";
                    
                    return (
                      <div key={lead.id || i} className="leads-table__row">
                        {/* Nama Customer */}
                        <span className="leads-table__cell">
                          <div className="leads-customer-info">
                            <div 
                              className="leads-customer-name"
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowViewLead(true);
                              }}
                              style={{ cursor: "pointer" }}
                              title="Klik untuk melihat detail"
                            >
                              {customerName}
                            </div>
                            {customerEmail && (
                              <div className="leads-customer-email">{customerEmail}</div>
                            )}
                            {customerPhone && (
                              <div className="leads-customer-phone">{customerPhone}</div>
                            )}
                            <div className="leads-contact-icons">
                              {customerPhone && (
                                <button
                                  type="button"
                                  className="leads-contact-icon leads-contact-icon--whatsapp"
                                  title={`Kirim WhatsApp ${customerPhone}`}
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setShowSendWhatsApp(true);
                                  }}
                                >
                                  <i className="pi pi-whatsapp" />
                                </button>
                              )}
                              {customerEmail && (
                                <a
                                  href={`mailto:${customerEmail}`}
                                  className="leads-contact-icon leads-contact-icon--email"
                                  title={`Email ${customerEmail}`}
                                >
                                  <i className="pi pi-envelope" />
                                </a>
                              )}
                              {customerPhone && (
                                <a
                                  href={`tel:${customerPhone}`}
                                  className="leads-contact-icon leads-contact-icon--phone"
                                  title={`Call ${customerPhone}`}
                                >
                                  <i className="pi pi-phone" />
                                </a>
                              )}
                              <button
                                className="leads-contact-icon leads-contact-icon--add"
                                title="Input Follow Up"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowAddFollowUp(true);
                                }}
                              >
                                <i className="pi pi-plus" />
                              </button>
                            </div>
                          </div>
                        </span>

                        {/* Label */}
                        <span className="leads-table__cell">
                          {leadLabel ? (
                            <span className="leads-label-text">{leadLabel}</span>
                          ) : (
                            "-"
                          )}
                        </span>

                        {/* Status */}
                        <span className="leads-table__cell">
                          {lead.status ? (
                            <span className={`leads-status ${getStatusClass(lead.status)}`}>
                              {lead.status.toUpperCase()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </span>

                        {/* Assign Sales */}
                        <span className="leads-table__cell">
                          {assignSalesName ? (
                            <div className="leads-assign-sales">
                              <div className="leads-assign-sales-name">{assignSalesName}</div>
                              <div className="leads-assign-sales-role">{assignSalesRole}</div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </span>

                        {/* Minat Produk */}
                        <span className="leads-table__cell">
                          {lead.minat_produk ? (
                            <span className="leads-minat-produk">{lead.minat_produk}</span>
                          ) : (
                            "-"
                          )}
                        </span>

                        {/* Last Contact */}
                        <span className="leads-table__cell">
                          {formatDate(lead.last_contact_at)}
                        </span>

                        {/* Next Follow Up */}
                        <span className="leads-table__cell">
                          {formatDate(lead.next_follow_up_at)}
                        </span>

                        {/* Aksi */}
                        <span className="leads-table__cell leads-table__cell--actions">
                          <button
                            className="customers-action-btn"
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowViewLead(true);
                            }}
                            title="Lihat"
                          >
                            <i className="pi pi-eye" />
                          </button>
                          <button
                            className="customers-action-btn customers-action-btn--ghost"
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowEditLead(true);
                            }}
                            title="Edit"
                          >
                            <i className="pi pi-pencil" />
                          </button>
                          <button
                            className="customers-action-btn customers-action-btn--danger"
                            onClick={async () => {
                              if (confirm(`Apakah Anda yakin ingin menghapus lead ini?`)) {
                                try {
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`/api/sales/lead/${lead.id}`, {
                                    method: "DELETE",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Accept: "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    toastSuccess(data.message || "Lead berhasil dihapus");
                                    requestRefresh("Lead berhasil dihapus", "success");
                                  } else {
                                    throw new Error(data.message || "Gagal menghapus lead");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  toastError("Gagal menghapus lead: " + err.message);
                                }
                              }
                            }}
                            title="Hapus"
                          >
                            <i className="pi pi-trash" />
                          </button>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="leads-table__row">
                    <div className="leads-table__empty">
                      <p>Tidak ada data leads</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {(paginationInfo || hasMore || page > 1) && (
            <div className="customers-pagination">
              <button
                className="customers-pagination__btn"
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
              >
                Previous
              </button>
              <span className="customers-pagination__info">
                {paginationInfo ? (
                  <>
                    Halaman {paginationInfo.current_page} dari {paginationInfo.last_page} 
                    {paginationInfo.total !== undefined && ` (Total: ${paginationInfo.total})`}
                  </>
                ) : (
                  `Halaman ${page}`
                )}
              </span>
              <button
                className="customers-pagination__btn"
                onClick={handleNextPage}
                disabled={!hasMore || loading}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showGenerateLeads && (
        <GenerateLeadsModal
          onClose={() => setShowGenerateLeads(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showBroadcast && (
        <BroadcastLeadModal
          onClose={() => setShowBroadcast(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showSendWhatsApp && selectedLead && (
        <SendWhatsAppModal
          lead={selectedLead}
          onClose={() => {
            setShowSendWhatsApp(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showAddFollowUp && selectedLead && (
        <AddFollowUpModal
          lead={selectedLead}
          onClose={() => {
            setShowAddFollowUp(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showViewLead && selectedLead && (
        <ViewLeadModal
          lead={selectedLead}
          onClose={() => {
            setShowViewLead(false);
            setSelectedLead(null);
          }}
          onEdit={(lead) => {
            // Immediately set all states to transition from ViewLeadModal to EditLeadModal
            setSelectedLead(lead);
            setShowViewLead(false);
            setShowEditLead(true);
          }}
        />
      )}

      {showEditLead && selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          onClose={() => {
            setShowEditLead(false);
            setSelectedLead(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </Layout>
  );
}

