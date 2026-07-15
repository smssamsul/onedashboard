"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { MessageSquare, Send, Plus, Search, MoreVertical } from "lucide-react";

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

export default function PercakapanPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const messagesEndRef = useRef(null);
  const conversationListRef = useRef(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    loadConversations(true);
  }, []);

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery) {
      // When searching, filter existing conversations
      const filtered = conversations.filter((conv) =>
        conv.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      // When clearing search, reset to all conversations
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);


  // Scroll listener for load more
  useEffect(() => {
    const conversationList = conversationListRef.current;
    if (!conversationList) return;

    const handleScroll = () => {
      if (isLoadingMore || !hasMorePages || currentPage >= lastPage) {
        return;
      }

      const scrollTop = conversationList.scrollTop;
      const scrollHeight = conversationList.scrollHeight;
      const clientHeight = conversationList.clientHeight;

      // Check if scrolled near bottom (within 100px)
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreConversations();
      }
    };

    conversationList.addEventListener("scroll", handleScroll);
    return () => {
      conversationList.removeEventListener("scroll", handleScroll);
    };
  }, [isLoadingMore, hasMorePages, currentPage, lastPage]);

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadConversations = async (reset = true) => {
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setIsLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      const response = await fetch(getApiUrl(`sales/percakapan?page=${page}&per_page=20`), {
        headers: getHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        const newConversations = result.data || [];
        
        if (reset) {
          setConversations(newConversations);
          setFilteredConversations(newConversations);
        } else {
          // Append new conversations
          setConversations((prev) => [...prev, ...newConversations]);
          if (!searchQuery) {
            setFilteredConversations((prev) => [...prev, ...newConversations]);
          }
        }

        // Update pagination info
        if (result.pagination) {
          setCurrentPage(result.pagination.current_page);
          setLastPage(result.pagination.last_page);
          setHasMorePages(result.pagination.has_more || result.pagination.current_page < result.pagination.last_page);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      fetchingRef.current = false;
    }
  };

  const loadMoreConversations = async () => {
    if (isLoadingMore || !hasMorePages || currentPage >= lastPage || fetchingRef.current) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await fetch(getApiUrl(`sales/percakapan?page=${nextPage}&per_page=20`), {
        headers: getHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        const newConversations = result.data || [];
        setConversations((prev) => [...prev, ...newConversations]);
        
        if (!searchQuery) {
          setFilteredConversations((prev) => [...prev, ...newConversations]);
        }

        // Update pagination info
        if (result.pagination) {
          setCurrentPage(result.pagination.current_page);
          setLastPage(result.pagination.last_page);
          setHasMorePages(result.pagination.has_more || result.pagination.current_page < result.pagination.last_page);
        }
      }
    } catch (error) {
      console.error("Error loading more conversations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadConversation = async (id) => {
    try {
      const response = await fetch(getApiUrl(`sales/percakapan/${id}`), {
        headers: getHeaders(),
      });
      const result = await response.json();

      if (result.success) {
        setSelectedConversation(result.data);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const response = await fetch(
        getApiUrl(`sales/percakapan/${selectedConversation.id}/message`),
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            sender_type: "sales",
            message_text: newMessage,
            message_type: "text",
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setNewMessage("");
        await loadConversation(selectedConversation.id);
        await loadConversations(true);
      } else {
        alert(result.message || "Gagal mengirim pesan");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const saveStatus = async () => {
    if (!selectedConversation) return;

    const statusSelect = document.getElementById("statusSelect");
    const status = statusSelect?.value;

    if (!status) return;

    try {
      const response = await fetch(getApiUrl(`sales/percakapan/${selectedConversation.id}`), {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (result.success) {
        setShowStatusModal(false);
        await loadConversations(true);
        await loadConversation(selectedConversation.id);
      } else {
        alert(result.message || "Gagal update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Terjadi kesalahan saat update status");
    }
  };

  const sendNewConversation = async () => {
    if (!newPhoneNumber.trim() || !newMessageText.trim()) {
      alert("Nomor telepon dan pesan harus diisi");
      return;
    }

    try {
      setSending(true);
      const response = await fetch(getApiUrl("sales/percakapan/get-or-create"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          phone_number: newPhoneNumber,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const percakapanId = result.data.id;
        await fetch(getApiUrl(`sales/percakapan/${percakapanId}/message`), {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            sender_type: "sales",
            message_text: newMessageText,
            message_type: "text",
          }),
        });

        setShowAddModal(false);
        setNewPhoneNumber("");
        setNewMessageText("");
        await loadConversations(true);
        await loadConversation(percakapanId);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Terjadi kesalahan saat membuat percakapan");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} jam lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
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
    const statusInfo = statusMap[status] || { bg: "#f3f4f6", color: "#6b7280", label: status || "-" };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.25rem 0.5rem",
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

  const getLastMessage = (conv) => {
    if (!conv.detail_percakapan || conv.detail_percakapan.length === 0) {
      return "Belum ada pesan";
    }
    const sorted = [...conv.detail_percakapan].sort((a, b) => b.id - a.id);
    return sorted[0]?.message_text || "Belum ada pesan";
  };

  return (
    <Layout title="Percakapan">
      <style>{slideInStyle}</style>
      <div style={{ display: "flex", height: "calc(100vh - 200px)", background: "#ECE5DD", borderRadius: "8px", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "350px", background: "white", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem", background: "#075E54", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>Percakapan</h3>
            <button
              onClick={() => setShowAddModal(true)}
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
              <Plus size={20} />
            </button>
          </div>
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem 0.5rem 2.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "20px",
                  fontSize: "0.875rem",
                  background: "#f0f2f5",
                }}
              />
            </div>
          </div>
          <div ref={conversationListRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Memuat percakapan...</div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Tidak ada percakapan</div>
            ) : (
              <>
                {filteredConversations.map((conv) => {
                const lastMessage = getLastMessage(conv);
                const phone = conv.phone_number || "-";
                const initials = phone.substring(phone.length - 2) || "U";
                const isActive = selectedConversation?.id === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid #e5e7eb",
                      cursor: "pointer",
                      background: isActive ? "#e9edef" : "white",
                      display: "flex",
                      gap: "0.75rem",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "#f5f6f6";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "white";
                    }}
                  >
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        background: "#128C7E",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.25rem", color: "#111827" }}>
                        {conv.lead?.name || phone}
                      </div>
                      {conv.lead?.name && (
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                          {phone}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          color: "#6b7280",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.4,
                          maxHeight: "2.8em",
                        }}
                      >
                        {lastMessage}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{formatTime(conv.last_message_at)}</div>
                      {getStatusBadge(conv.status)}
                    </div>
                  </div>
                );
              })}
                {/* Load More Indicator */}
                {hasMorePages && currentPage < lastPage && !searchQuery && (
                  <div
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      color: isLoadingMore ? "#128C7E" : "#6b7280",
                      fontSize: "0.875rem",
                      background: "#f9fafb",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    {isLoadingMore ? "Memuat lebih banyak..." : "Scroll ke bawah untuk memuat lebih banyak"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#e5ddd5" }}>
          {selectedConversation ? (
            <>
              <div style={{ padding: "0.75rem 1rem", background: "#075E54", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                    {(selectedConversation.phone_number || "U").substring((selectedConversation.phone_number || "U").length - 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{selectedConversation.lead?.name || selectedConversation.phone_number || "-"}</div>
                    {selectedConversation.lead?.name && (
                      <div style={{ fontSize: "0.8125rem", opacity: 0.9, marginBottom: "0.25rem" }}>
                        {selectedConversation.phone_number || "-"}
                      </div>
                    )}
                    <div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>{getStatusBadge(selectedConversation.status)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowStatusModal(true)}
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
                  title="Update Status"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", background: "#ECE5DD" }}>
                {selectedConversation.detail_percakapan?.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Belum ada pesan</div>
                ) : (
                  selectedConversation.detail_percakapan?.map((msg) => {
                    const isSent = msg.sender_type === "AI" || msg.sender_type === "bot" || msg.sender_type === "sales" || msg.sender_type === "system";
                    const senderLabel = msg.sender_type === "AI" ? "AI" : msg.sender_type === "bot" ? "Bot" : msg.sender_type === "sales" ? "Sales" : msg.sender_type === "system" ? "System" : "Customer";
                    const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
                    
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          maxWidth: "65%",
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
                            position: "relative",
                          }}
                        >
                          {isSent ? (
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", textAlign: "right", color: "#6b7280" }}>
                              {senderLabel}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "#6b7280" }}>
                              {senderLabel}
                            </div>
                          )}
                          <div style={{ fontSize: "0.9375rem", lineHeight: 1.4, color: "#111827", margin: 0 }}>
                            {msg.message_text}
                          </div>
                          <div style={{ fontSize: "0.6875rem", color: "#6b7280", marginTop: "0.25rem", textAlign: isSent ? "right" : "left" }}>
                            {time}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "0.75rem 1rem", background: "#f0f2f5", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ketik pesan..."
                  style={{
                    flex: 1,
                    padding: "0.625rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "21px",
                    fontSize: "0.9375rem",
                    resize: "none",
                    maxHeight: "100px",
                    fontFamily: "inherit",
                  }}
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "#25D366",
                    border: "none",
                    color: "white",
                    cursor: newMessage.trim() && !sending ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: newMessage.trim() && !sending ? 1 : 0.5,
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", textAlign: "center" }}>
              <div>
                <p style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Pilih percakapan untuk memulai</p>
                <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Pilih percakapan dari daftar di sebelah kiri</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Conversation Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem 0" }}>Tambah Percakapan</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nomor Telepon *</label>
              <input
                type="text"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="6281234567890"
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e5e7eb", borderRadius: "4px" }}
              />
              <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>Format: 6281234567890 (tanpa + dan spasi)</small>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Pesan *</label>
              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                rows={4}
                placeholder="Ketik pesan yang ingin dikirim..."
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e5e7eb", borderRadius: "4px", resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: "0.5rem 1rem", border: "1px solid #e5e7eb", background: "white", borderRadius: "4px", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={sendNewConversation}
                disabled={sending}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#25D366",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.5 : 1,
                }}
              >
                {sending ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
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
            zIndex: 2000,
          }}
          onClick={() => setShowStatusModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem 0" }}>Update Status</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Status</label>
              <select
                id="statusSelect"
                defaultValue={selectedConversation?.status || "new"}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                }}
              >
                <option value="new">New</option>
                <option value="lead">Lead</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="trash">Trash</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #e5e7eb",
                  background: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={saveStatus}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#075E54",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
