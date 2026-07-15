"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Users, RefreshCw, Edit, Trash2, Eye, Search, Filter, MessageSquare, X, Send } from "lucide-react";
import { getApiUrl } from "@/config/api";
import { toastSuccess, toastError } from "@/lib/toast";

const slideInStyle = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LEADS_COLUMNS = [
  "Nama",
  "Nomor Telepon",
  "Pesan Pertama",
  "Waktu",
  "Status",
  "Produk",
  "Lokasi",
  "Aksi",
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "new", label: "New" },
  { value: "lead", label: "Lead" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
  { value: "trash", label: "Trash" },
];

export default function LeadsAiPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const perPage = 15;
  const fetchingRef = useRef(false);

  // Modal states
  const [showViewLead, setShowViewLead] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch leads data dengan pagination
  const fetchLeads = useCallback(async (pageNumber = 1) => {
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("page", pageNumber.toString());
      params.append("per_page", perPage.toString());

      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchInput && searchInput.trim()) {
        params.append("search", searchInput.trim());
      }
      if (nameFilter && nameFilter.trim()) {
        params.append("name", nameFilter.trim());
      }
      if (phoneFilter && phoneFilter.trim()) {
        params.append("phone_number", phoneFilter.trim());
      }
      if (productFilter && productFilter.trim()) {
        params.append("product", productFilter.trim());
      }
      if (locationFilter && locationFilter.trim()) {
        params.append("location", locationFilter.trim());
      }
      if (salesFilter && salesFilter !== "") {
        params.append("assigned_sales_id", salesFilter);
      }
      if (dateFromFilter) {
        params.append("date_from", dateFromFilter);
      }
      if (dateToFilter) {
        params.append("date_to", dateToFilter);
      }

      const res = await fetch(getApiUrl(`sales/lead-ai?${params.toString()}`), {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      if (json.success && json.data && Array.isArray(json.data)) {
        setLeads(json.data);
        setPaginationInfo(json.pagination);
        setHasMore(json.pagination.current_page < json.pagination.last_page);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toastError("Gagal memuat data leads");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [statusFilter, searchInput, productFilter, locationFilter, salesFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    fetchLeads(1);
    setPage(1);
  }, [statusFilter, searchInput, nameFilter, phoneFilter, productFilter, locationFilter, salesFilter, dateFromFilter, dateToFilter]);

  // Load sales list for filter
  useEffect(() => {
    const loadSales = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("sales/lead/sales-list"), {
          headers: getHeaders(),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSalesList(json.data);
        } else {
          // Fallback to admin users API
          try {
            const res = await fetch(getApiUrl("admin/users"), {
              headers: getHeaders(),
            });
            const json = await res.json();
            if (json.success && json.data) {
              const salesUsers = json.data.filter((user) => String(user.divisi) === "3");
              setSalesList(salesUsers);
            }
          } catch (error) {
            console.error("Error loading sales:", error);
          }
        }
      } catch (error) {
        console.error("Error loading sales:", error);
      }
    };
    loadSales();
  }, []);

  const handleView = async (lead) => {
    try {
      const res = await fetch(getApiUrl(`sales/lead-ai/${lead.id}`), {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedLead(json.data);
        setShowViewLead(true);
      } else {
        toastError(json.message || "Gagal memuat detail lead");
      }
    } catch (error) {
      console.error("Error fetching lead detail:", error);
      toastError("Gagal memuat detail lead");
    }
  };

  const handleEdit = async (lead) => {
    try {
      const res = await fetch(getApiUrl(`sales/lead-ai/${lead.id}`), {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedLead(json.data);
        setShowEditLead(true);
      } else {
        toastError(json.message || "Gagal memuat detail lead");
      }
    } catch (error) {
      console.error("Error fetching lead detail:", error);
      toastError("Gagal memuat detail lead");
    }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus lead ${lead.name || lead.phone_number}?`)) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`sales/lead-ai/${lead.id}`), {
        method: "DELETE",
        headers: getHeaders(),
      });

      const json = await res.json();

      if (json.success) {
        toastSuccess("Lead berhasil dihapus");
        fetchLeads(page);
      } else {
        toastError(json.message || "Gagal menghapus lead");
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      toastError("Gagal menghapus lead");
    }
  };

  const loadChatConversation = async (phoneNumber) => {
    try {
      const response = await fetch(getApiUrl(`sales/percakapan/get-or-create`), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const result = await response.json();

      if (result.success) {
        const convId = result.data.id;
        const convDetail = await fetch(getApiUrl(`sales/percakapan/${convId}`), {
          headers: getHeaders(),
        });
        const convResult = await convDetail.json();

        if (convResult.success) {
          setChatConversation(convResult.data);
          setChatMessages(convResult.data.detail_percakapan || []);
          setShowChatPanel(true);
        }
      }
    } catch (error) {
      console.error("Error loading chat conversation:", error);
      toastError("Gagal memuat percakapan");
    }
  };

  const sendChatMessage = async () => {
    if (!newChatMessage.trim() || !chatConversation) return;

    try {
      setSendingChat(true);
      const response = await fetch(getApiUrl(`sales/percakapan/${chatConversation.id}/message`), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          sender_type: "sales",
          message_text: newChatMessage,
          message_type: "text",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNewChatMessage("");
        await loadChatConversation(chatConversation.phone_number);
      } else {
        toastError(result.message || "Gagal mengirim pesan");
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      toastError("Gagal mengirim pesan");
    } finally {
      setSendingChat(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      new: { bg: "#dbeafe", color: "#2563eb", label: "New" },
      lead: { bg: "#d1fae5", color: "#059669", label: "Lead" },
      hot: { bg: "#fee2e2", color: "#dc2626", label: "Hot" },
      warm: { bg: "#fef3c7", color: "#d97706", label: "Warm" },
      cold: { bg: "#dbeafe", color: "#2563eb", label: "Cold" },
      trash: { bg: "#f3f4f6", color: "#6b7280", label: "Trash" },
    };
    const statusInfo = statusMap[status?.toLowerCase()] || { bg: "#f3f4f6", color: "#6b7280", label: status || "-" };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.25rem 0.75rem",
          borderRadius: "12px",
          fontSize: "0.75rem",
          fontWeight: 500,
          background: statusInfo.bg,
          color: statusInfo.color,
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <Layout title="Leads AI">
      <style>{slideInStyle}</style>
      <div style={{ padding: "1.5rem" }}>
        {/* Filters */}
        <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "1.25rem", marginBottom: "1.5rem" }}>
          {/* Main Filters Row */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: showAdvancedFilters ? "1rem" : "0", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ position: "relative", flex: "1", minWidth: "250px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                Pencarian
              </label>
              <div style={{ position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="Cari nama, nomor telepon, atau pesan..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem 0.625rem 2.5rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
            </div>
            
            <div style={{ minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                style={{
                  padding: "0.625rem 1rem",
                  background: showAdvancedFilters ? "#3b82f6" : "white",
                  color: showAdvancedFilters ? "white" : "#374151",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                <Filter size={16} />
                Filter Lanjutan
              </button>
              
              <button
                type="button"
                onClick={() => {
                  fetchLeads(1);
                  setPage(1);
                }}
                style={{
                  padding: "0.625rem 1rem",
                  background: "#14b8a6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              {(nameFilter || phoneFilter || productFilter || locationFilter || salesFilter || dateFromFilter || dateToFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setNameFilter("");
                    setPhoneFilter("");
                    setProductFilter("");
                    setLocationFilter("");
                    setSalesFilter("");
                    setDateFromFilter("");
                    setDateToFilter("");
                    fetchLeads(1);
                    setPage(1);
                  }}
                  style={{
                    padding: "0.625rem 1rem",
                    background: "white",
                    color: "#ef4444",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  <X size={16} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div
              style={{
                paddingTop: "1rem",
                borderTop: "1px solid #e5e7eb",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                animation: "slideIn 0.2s ease-out",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Nama
                </label>
                <input
                  type="text"
                  placeholder="Filter nama..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  placeholder="Filter nomor telepon..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Produk
                </label>
                <input
                  type="text"
                  placeholder="Filter produk..."
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Lokasi
                </label>
                <input
                  type="text"
                  placeholder="Filter lokasi..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Sales
                </label>
                <select
                  value={salesFilter}
                  onChange={(e) => setSalesFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    backgroundColor: "white",
                  }}
                >
                  <option value="">Semua Sales</option>
                  {salesList.map((sales) => (
                    <option key={sales.id} value={sales.id}>
                      {sales.nama || sales.name || `User ${sales.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Tanggal Dari
                </label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "0.25rem" }}>
                  Tanggal Sampai
                </label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {LEADS_COLUMNS.map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={LEADS_COLUMNS.length} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={LEADS_COLUMNS.length} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
                        <span
                          onClick={() => lead.phone_number && loadChatConversation(lead.phone_number)}
                          style={{
                            color: lead.phone_number ? "#3b82f6" : "inherit",
                            cursor: lead.phone_number ? "pointer" : "default",
                            textDecoration: lead.phone_number ? "underline" : "none",
                          }}
                        >
                          {lead.name || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>{lead.phone_number || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", maxWidth: "300px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.first_message || "-"}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {lead.last_reply_at && (
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                              Last Reply: {formatDate(lead.last_reply_at)}
                            </div>
                          )}
                          {lead.created_at && (
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                              Created: {formatDate(lead.created_at)}
                            </div>
                          )}
                          {lead.updated_at && (
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                              Updated: {formatDate(lead.updated_at)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>{getStatusBadge(lead.status)}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>{lead.product || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>{lead.location || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleView(lead)}
                            style={{
                              padding: "0.375rem",
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Lihat"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(lead)}
                            style={{
                              padding: "0.375rem",
                              background: "#14b8a6",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
                            style={{
                              padding: "0.375rem",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paginationInfo && paginationInfo.last_page > 1 && (
            <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Menampilkan {((paginationInfo.current_page - 1) * paginationInfo.per_page) + 1} - {Math.min(paginationInfo.current_page * paginationInfo.per_page, paginationInfo.total)} dari {paginationInfo.total}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    if (page > 1) {
                      setPage(page - 1);
                      fetchLeads(page - 1);
                    }
                  }}
                  disabled={page === 1}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #e5e7eb",
                    background: page === 1 ? "#f3f4f6" : "white",
                    borderRadius: "6px",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => {
                    if (hasMore) {
                      setPage(page + 1);
                      fetchLeads(page + 1);
                    }
                  }}
                  disabled={!hasMore}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #e5e7eb",
                    background: !hasMore ? "#f3f4f6" : "white",
                    borderRadius: "6px",
                    cursor: !hasMore ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewLead && selectedLead && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowViewLead(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: 600 }}>Detail Lead</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Nama</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.name || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Nomor Telepon</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.phone_number || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Pesan Pertama</label>
                <div style={{ fontSize: "0.9375rem", whiteSpace: "pre-wrap" }}>{selectedLead.first_message || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Status</label>
                <div>{getStatusBadge(selectedLead.status)}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Produk</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.product || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Lokasi</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.location || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Waktu Dibuat</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.created_at ? formatDate(selectedLead.created_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Waktu Diupdate</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.updated_at ? formatDate(selectedLead.updated_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Last Reply</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.last_reply_at ? formatDate(selectedLead.last_reply_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Follow Up At</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.followup_at ? formatDate(selectedLead.followup_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Assigned At</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.assigned_at ? formatDate(selectedLead.assigned_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Last Contact At</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.last_contact_at ? formatDate(selectedLead.last_contact_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Next Follow Up At</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.next_follow_up_at ? formatDate(selectedLead.next_follow_up_at) : "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Source</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.source || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Lead Score</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.lead_score ?? "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Lead Label</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.lead_label || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Minat Produk</label>
                <div style={{ fontSize: "0.9375rem" }}>{selectedLead.minat_produk || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Alasan Tertarik</label>
                <div style={{ fontSize: "0.9375rem", whiteSpace: "pre-wrap" }}>{selectedLead.alasan_tertarik || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Alasan Belum</label>
                <div style={{ fontSize: "0.9375rem", whiteSpace: "pre-wrap" }}>{selectedLead.alasan_belum || "-"}</div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Harapan</label>
                <div style={{ fontSize: "0.9375rem", whiteSpace: "pre-wrap" }}>{selectedLead.harapan || "-"}</div>
              </div>
              {selectedLead.assigned_sales && (
                <div>
                  <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>Assigned Sales</label>
                  <div style={{ fontSize: "0.9375rem" }}>{selectedLead.assigned_sales.nama || "-"}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={() => setShowViewLead(false)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #e5e7eb",
                  background: "white",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditLead && selectedLead && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowEditLead(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: 600 }}>Edit Lead</h2>
            <EditLeadForm
              lead={selectedLead}
              onClose={() => {
                setShowEditLead(false);
                setSelectedLead(null);
              }}
              onSuccess={() => {
                fetchLeads(page);
                setShowEditLead(false);
                setSelectedLead(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Chat Panel - Bottom Right */}
      {showChatPanel && chatConversation && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "400px",
            height: "600px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: "1rem",
              background: "#075E54",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#128C7E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                {(chatConversation.phone_number || "U").substring((chatConversation.phone_number || "U").length - 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{chatConversation.lead?.name || chatConversation.phone_number || "-"}</div>
                {chatConversation.lead?.name && (
                  <div style={{ fontSize: "0.75rem", opacity: 0.9, marginBottom: "0.25rem" }}>
                    {chatConversation.phone_number || "-"}
                  </div>
                )}
                <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>{getStatusBadge(chatConversation.status)}</div>
              </div>
            </div>
            <button
              onClick={() => setShowChatPanel(false)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                color: "white",
                padding: "0.5rem",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              background: "#ECE5DD",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Belum ada pesan</div>
            ) : (
              chatMessages.map((msg) => {
                const isSent = msg.sender_type === "AI" || msg.sender_type === "bot" || msg.sender_type === "sales" || msg.sender_type === "system";
                const senderLabel = msg.sender_type === "AI" ? "AI" : msg.sender_type === "bot" ? "Bot" : msg.sender_type === "sales" ? "Sales" : msg.sender_type === "system" ? "System" : "Customer";
                const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      maxWidth: "75%",
                      alignSelf: isSent ? "flex-end" : "flex-start",
                      flexDirection: isSent ? "row-reverse" : "row",
                      animation: "slideIn 0.2s ease-out",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "7.5px",
                        background: isSent ? "#DCF8C6" : "white",
                        borderBottomRightRadius: isSent ? "2px" : "7.5px",
                        borderBottomLeftRadius: isSent ? "7.5px" : "2px",
                        boxShadow: isSent ? "none" : "0 1px 2px rgba(0, 0, 0, 0.1)",
                        wordWrap: "break-word",
                      }}
                    >
                      {isSent ? (
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", textAlign: "right", color: "#6b7280" }}>
                          {senderLabel}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "#6b7280" }}>{senderLabel}</div>
                      )}
                      <div style={{ fontSize: "0.875rem", lineHeight: 1.4, color: "#111827", margin: 0 }}>{msg.message_text}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#6b7280", marginTop: "0.25rem", textAlign: isSent ? "right" : "left" }}>
                        {time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          <div style={{ padding: "0.75rem 1rem", background: "#f0f2f5", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <textarea
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Ketik pesan..."
              style={{
                flex: 1,
                padding: "0.625rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "21px",
                fontSize: "0.875rem",
                resize: "none",
                maxHeight: "100px",
                fontFamily: "inherit",
              }}
              rows={1}
            />
            <button
              onClick={sendChatMessage}
              disabled={!newChatMessage.trim() || sendingChat}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#25D366",
                border: "none",
                color: "white",
                cursor: newChatMessage.trim() && !sendingChat ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: newChatMessage.trim() && !sendingChat ? 1 : 0.5,
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

function EditLeadForm({ lead, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: lead.name || "",
    phone_number: lead.phone_number || "",
    first_message: lead.first_message || "",
    status: lead.status || "new",
    product: lead.product || "",
    location: lead.location || "",
    assigned_sales_id: lead.assigned_sales?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [salesList, setSalesList] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoadingSales(true);
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("sales/lead/sales-list"), {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSalesList(json.data);
        }
      } catch (error) {
        console.error("Error loading sales:", error);
        // Fallback to admin users API
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(getApiUrl("admin/users"), {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          const json = await res.json();
          if (json.success && json.data) {
            // Filter only sales division (divisi = 3)
            const salesUsers = json.data.filter((user) => String(user.divisi) === "3");
            setSalesList(salesUsers);
          }
        } catch (fallbackError) {
          console.error("Error loading sales from fallback:", fallbackError);
        }
      } finally {
        setLoadingSales(false);
      }
    };
    loadSales();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      // Prepare data for submission
      const submitData = { ...formData };
      
      // Convert empty strings to null for optional fields
      if (submitData.assigned_sales_id === '') {
        submitData.assigned_sales_id = null;
      }

      const res = await fetch(getApiUrl(`sales/lead-ai/${lead.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const json = await res.json();

      if (json.success) {
        toastSuccess("Lead berhasil diupdate");
        onSuccess();
      } else {
        toastError(json.message || "Gagal mengupdate lead");
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      toastError("Gagal mengupdate lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingRight: "0.5rem" }}>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Nama *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
        
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Nomor Telepon *
          </label>
          <input
            type="text"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            required
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
        
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Chat Pertama *
          </label>
          <textarea
            value={formData.first_message}
            onChange={(e) => setFormData({ ...formData, first_message: e.target.value })}
            required
            rows={4}
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              resize: "vertical",
              transition: "border-color 0.2s",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
        
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            required
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              backgroundColor: "white",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          >
            <option value="new">New</option>
            <option value="lead">Lead</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="trash">Trash</option>
          </select>
        </div>
        
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Produk
          </label>
          <input
            type="text"
            value={formData.product}
            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
        
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Lokasi
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
        
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "#374151" }}>
            Sales Sign
          </label>
          <select
            value={formData.assigned_sales_id}
            onChange={(e) => setFormData({ ...formData, assigned_sales_id: e.target.value || "" })}
            disabled={loadingSales}
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              backgroundColor: loadingSales ? "#f3f4f6" : "white",
              cursor: loadingSales ? "not-allowed" : "pointer",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => !loadingSales && (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          >
            <option value="">Pilih Sales</option>
            {salesList.map((sales) => (
              <option key={sales.id} value={sales.id}>
                {sales.nama || sales.name || `User ${sales.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #e5e7eb",
            background: "white",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.5rem 1rem",
            background: "#14b8a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
