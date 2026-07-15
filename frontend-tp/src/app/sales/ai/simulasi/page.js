"use client";

import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { getAiSetting } from "@/lib/aiSetting";
import { getApiUrl } from "@/config/api";
import { toast } from "react-hot-toast";
import {
  Send,
  Loader2,
  Bot,
  User,
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  MessageSquare,
  Database,
  FileText,
  Package,
} from "lucide-react";

const STATUS_TABS = [
  { key: "basic", label: "Basic (New/Lead)", color: "#6366f1" },
  { key: "cold", label: "Cold", color: "#3b82f6" },
  { key: "warm", label: "Warm", color: "#f97316" },
];

const LEAD_STATUS_MAP = {
  basic: "new",
  cold: "cold",
  warm: "warm",
};

export default function AiSimulasiPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [prompts, setPrompts] = useState({ basic: "", cold: "", warm: "" });
  const [dbPrompts, setDbPrompts] = useState({ basic: "", cold: "", warm: "" });
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSetting, setCurrentSetting] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [expandedKnowledge, setExpandedKnowledge] = useState({});

  // Derived: apakah prompt sudah dimodifikasi dari DB?
  const isModified = prompts[activeTab] !== dbPrompts[activeTab];

  useEffect(() => {
    fetchSetting();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSetting = async () => {
    try {
      setLoading(true);
      const result = await getAiSetting();
      if (result.data) {
        setCurrentSetting(result.data);
        const loaded = {
          basic: result.data.prompt || "",
          cold: result.data.prompt_cold || "",
          warm: result.data.prompt_warm || "",
        };
        setPrompts(loaded);
        setDbPrompts(loaded);
      }
    } catch (error) {
      console.error("Error fetching AI setting:", error);
      toast.error("Gagal mengambil setting AI");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const msg = inputMsg.trim();
    if (!msg || sending) return;

    const userBubble = { role: "user", text: msg, time: new Date() };
    setMessages((prev) => [...prev, userBubble]);
    setInputMsg("");
    setSending(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        message: msg,
        lead_status: LEAD_STATUS_MAP[activeTab],
        custom_prompt: isModified ? prompts[activeTab] : undefined,
      };

      const res = await fetch(getApiUrl("sales/ai-simulasi/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        const aiBubble = {
          role: "ai",
          text: data.reply,
          time: new Date(),
          tokens: data.tokens,
          promptSource: data.prompt_source,
          knowledgeUsed: data.knowledge_used || [],
        };
        setMessages((prev) => [...prev, aiBubble]);
      } else {
        toast.error(data.message || "AI gagal merespons");
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            text: data.message || "Terjadi kesalahan",
            time: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghubungi server");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    toast.success("Chat direset");
  };

  const handleSavePrompt = async () => {
    if (!isModified) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("sales/ai-simulasi/save-prompt"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompts[activeTab],
          lead_status: activeTab,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDbPrompts((prev) => ({ ...prev, [activeTab]: prompts[activeTab] }));
        toast.success("Prompt berhasil disimpan ke produksi!");
      } else {
        toast.error(data.message || "Gagal menyimpan prompt");
      }
    } catch (err) {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrompt = () => {
    setPrompts((prev) => ({ ...prev, [activeTab]: dbPrompts[activeTab] }));
  };

  const formatTime = (date) =>
    date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <Layout title="Simulasi AI | One Dashboard">
        <div className="dashboard-shell">
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <Loader2 className="animate-spin" size={36} style={{ margin: "0 auto", color: "#f97316" }} />
            <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Memuat data AI...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const activeTabInfo = STATUS_TABS.find((t) => t.key === activeTab);

  return (
    <Layout title="Simulasi AI | One Dashboard">
      <div className="dashboard-shell">
        {/* Hero */}
        <section className="dashboard-hero">
          <div className="dashboard-hero__copy">
            <p className="dashboard-hero__eyebrow">Testing & Preview</p>
            <h2 className="dashboard-hero__title">Simulasi Percakapan AI</h2>
            <span className="dashboard-hero__meta">
              Test respons dan gaya bahasa AI sebelum diterapkan ke produksi
            </span>
          </div>
        </section>

        {/* Split Panel */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          {/* ===== PANEL KIRI: Prompt Editor ===== */}
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Zap size={16} style={{ color: "#f97316" }} />
                <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>
                  Prompt Editor
                </span>
              </div>
              {/* Status pill */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isModified ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: "rgba(249, 115, 22, 0.15)",
                      color: "#f97316",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    <AlertCircle size={12} />
                    Modified
                  </span>
                ) : (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    <CheckCircle size={12} />
                    Live
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
              }}
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.5rem",
                    background: activeTab === tab.key ? tab.color : "transparent",
                    color: activeTab === tab.key ? "white" : "var(--text-muted)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: activeTab === tab.key ? "600" : "400",
                    transition: "all 0.2s ease",
                    borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                Edit prompt di bawah untuk testing. Perubahan hanya aktif di simulasi ini hingga kamu simpan ke produksi.
              </p>
              <textarea
                ref={textareaRef}
                value={prompts[activeTab]}
                onChange={(e) =>
                  setPrompts((prev) => ({ ...prev, [activeTab]: e.target.value }))
                }
                style={{
                  flex: 1,
                  width: "100%",
                  minHeight: "340px",
                  padding: "0.875rem",
                  border: `1px solid ${isModified ? "#f97316" : "var(--border-color)"}`,
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  resize: "vertical",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  lineHeight: "1.6",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder={`Masukkan system prompt untuk status ${activeTabInfo?.label}...`}
              />

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                {isModified && (
                  <button
                    onClick={handleResetPrompt}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "0.5rem 0.875rem",
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      transition: "all 0.2s",
                    }}
                  >
                    <RefreshCw size={13} />
                    Reset
                  </button>
                )}
                <button
                  onClick={handleSavePrompt}
                  disabled={!isModified || saving}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "0.5rem 1rem",
                    background: isModified ? "#f97316" : "var(--bg-tertiary, #e5e7eb)",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isModified ? "pointer" : "not-allowed",
                    fontSize: "13px",
                    color: isModified ? "white" : "var(--text-muted)",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  Simpan ke Produksi
                </button>
              </div>
            </div>
          </div>

          {/* ===== PANEL KANAN: Chat Simulator ===== */}
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "600px",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageSquare size={16} style={{ color: "#6366f1" }} />
                <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>
                  Chat Simulator
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Info badge */}
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "20px",
                    background: `${activeTabInfo?.color}20`,
                    color: activeTabInfo?.color,
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {activeTabInfo?.label} {isModified ? "· Modified" : "· Live"}
                </span>
                <button
                  onClick={handleResetChat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    transition: "all 0.2s",
                  }}
                >
                  <RefreshCw size={12} />
                  Reset
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--text-muted)",
                    gap: "0.75rem",
                  }}
                >
                  <Bot size={40} style={{ opacity: 0.3 }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: "600" }}>Kirim pesan untuk mulai simulasi</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "13px" }}>
                      AI akan merespons menggunakan prompt {isModified ? "yang sudah kamu edit" : "dari database"}
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background:
                        msg.role === "user"
                          ? "#6366f1"
                          : msg.role === "error"
                          ? "#ef4444"
                          : "#f97316",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {msg.role === "user" ? (
                      <User size={16} color="white" />
                    ) : (
                      <Bot size={16} color="white" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div style={{ maxWidth: "75%" }}>
                    <div
                      style={{
                        padding: "0.625rem 0.875rem",
                        borderRadius:
                          msg.role === "user"
                            ? "12px 4px 12px 12px"
                            : "4px 12px 12px 12px",
                        background:
                          msg.role === "user"
                            ? "#6366f1"
                            : msg.role === "error"
                            ? "rgba(239, 68, 68, 0.1)"
                            : "var(--bg-primary)",
                        border:
                          msg.role === "error"
                            ? "1px solid rgba(239, 68, 68, 0.3)"
                            : msg.role === "ai"
                            ? "1px solid var(--border-color)"
                            : "none",
                        color:
                          msg.role === "user"
                            ? "white"
                            : msg.role === "error"
                            ? "#ef4444"
                            : "var(--text-primary)",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.text}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        marginTop: "4px",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {formatTime(msg.time)}
                      </span>
                      {msg.tokens && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-color)",
                            padding: "1px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          {msg.tokens.total} tokens
                        </span>
                      )}
                      {msg.promptSource === "custom" && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#f97316",
                            background: "rgba(249,115,22,0.1)",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            fontWeight: "600",
                          }}
                        >
                          Modified prompt
                        </span>
                      )}
                    </div>

                    {/* Knowledge Source Panel — hanya tampil di AI message */}
                    {msg.role === "ai" && msg.knowledgeUsed && msg.knowledgeUsed.length > 0 && (
                      <div
                        style={{
                          marginTop: "8px",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          overflow: "hidden",
                          fontSize: "12px",
                        }}
                      >
                        {/* Header knowledge panel */}
                        <button
                          onClick={() =>
                            setExpandedKnowledge((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: "rgba(99,102,241,0.07)",
                            border: "none",
                            cursor: "pointer",
                            color: "#6366f1",
                            fontWeight: "600",
                            fontSize: "12px",
                            gap: "6px",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Database size={12} />
                            {msg.knowledgeUsed.length} Knowledge Chunks Digunakan
                          </span>
                          {expandedKnowledge[idx] ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>

                        {/* Knowledge list */}
                        {expandedKnowledge[idx] && (
                          <div style={{ background: "var(--bg-primary)" }}>
                            {msg.knowledgeUsed.map((k, ki) => (
                              <div
                                key={ki}
                                style={{
                                  padding: "8px 10px",
                                  borderTop: ki > 0 ? "1px solid var(--border-color)" : "none",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "4px",
                                    gap: "8px",
                                  }}
                                >
                                  {/* Source info */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: 1, minWidth: 0 }}>
                                    {k.product_name ? (
                                      <Package size={11} style={{ color: "#f97316", flexShrink: 0 }} />
                                    ) : (
                                      <FileText size={11} style={{ color: "#6366f1", flexShrink: 0 }} />
                                    )}
                                    <span
                                      style={{
                                        fontWeight: "600",
                                        color: "var(--text-primary)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {k.source_title}
                                    </span>
                                    {k.product_name && (
                                      <span
                                        style={{
                                          padding: "1px 6px",
                                          borderRadius: "10px",
                                          background: "rgba(249,115,22,0.1)",
                                          color: "#f97316",
                                          fontWeight: "600",
                                          whiteSpace: "nowrap",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {k.product_name}
                                      </span>
                                    )}
                                  </div>

                                  {/* Similarity score */}
                                  {k.similarity !== null && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                                      <div
                                        style={{
                                          width: "50px",
                                          height: "4px",
                                          borderRadius: "2px",
                                          background: "var(--border-color)",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <div
                                          style={{
                                            height: "100%",
                                            width: `${Math.min(k.similarity, 100)}%`,
                                            background:
                                              k.similarity >= 80
                                                ? "#10b981"
                                                : k.similarity >= 60
                                                ? "#f97316"
                                                : "#6366f1",
                                            borderRadius: "2px",
                                            transition: "width 0.3s ease",
                                          }}
                                        />
                                      </div>
                                      <span
                                        style={{
                                          color:
                                            k.similarity >= 80
                                              ? "#10b981"
                                              : k.similarity >= 60
                                              ? "#f97316"
                                              : "#6366f1",
                                          fontWeight: "600",
                                          fontSize: "11px",
                                        }}
                                      >
                                        {k.similarity}%
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Content preview */}
                                {k.content_preview && (
                                  <p
                                    style={{
                                      margin: 0,
                                      color: "var(--text-muted)",
                                      lineHeight: "1.4",
                                      fontSize: "11px",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    "{k.content_preview}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Jika AI tidak pakai knowledge */}
                    {msg.role === "ai" && msg.knowledgeUsed && msg.knowledgeUsed.length === 0 && (
                      <div
                        style={{
                          marginTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Database size={11} />
                        Tidak ada knowledge chunk yang dipakai
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#f97316",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} color="white" />
                  </div>
                  <div
                    style={{
                      padding: "0.625rem 1rem",
                      borderRadius: "4px 12px 12px 12px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f97316", animation: "pulse 1s infinite" }} />
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f97316", animation: "pulse 1s infinite 0.2s" }} />
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f97316", animation: "pulse 1s infinite 0.4s" }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-end",
                background: "var(--bg-primary)",
              }}
            >
              <textarea
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{
                  flex: 1,
                  padding: "0.625rem 0.875rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.5",
                  maxHeight: "120px",
                  overflowY: "auto",
                  transition: "border-color 0.2s",
                }}
                placeholder="Ketik pesan simulasi... (Enter untuk kirim, Shift+Enter baris baru)"
                onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMsg.trim() || sending}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: inputMsg.trim() && !sending ? "#f97316" : "var(--bg-tertiary, #e5e7eb)",
                  border: "none",
                  cursor: inputMsg.trim() && !sending ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                  transform: inputMsg.trim() && !sending ? "scale(1)" : "scale(0.95)",
                }}
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <Send size={16} color={inputMsg.trim() ? "white" : "var(--text-muted)"} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div
          style={{
            marginTop: "1rem",
            padding: "0.875rem 1.25rem",
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <AlertCircle size={16} style={{ color: "#6366f1", flexShrink: 0, marginTop: "1px" }} />
          <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
            <strong style={{ color: "var(--text-primary)" }}>Cara pakai:</strong> Edit prompt di panel kiri untuk testing gaya bahasa AI. Status{" "}
            <span style={{ color: "#f97316", fontWeight: "600" }}>Modified</span> artinya prompt belum disimpan — perubahan hanya aktif di simulasi ini.
            Klik <strong>Simpan ke Produksi</strong> jika kamu puas dengan hasilnya untuk update prompt di WhatsApp chatbot.
          </div>
        </div>

        {/* CSS for pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
          }
          @media (max-width: 768px) {
            .sim-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
}
