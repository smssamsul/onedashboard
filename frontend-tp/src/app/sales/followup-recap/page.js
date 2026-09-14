"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Send } from "lucide-react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import styles from "./followupRecap.module.css";

const DAY_OPTIONS = [
  { label: "7 Hari", value: 7 },
  { label: "14 Hari", value: 14 },
  { label: "30 Hari", value: 30 },
  { label: "90 Hari", value: 90 },
];

function fmt(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.5rem 0.75rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>Jam {label}:00</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0", fontSize: 12 }}>
          {entry.name}: <strong>{fmt(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export default function FollowUpRecapPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);
  const [salesId, setSalesId] = useState("all");

  // Chat panel (pojok kanan bawah) - sama seperti di /sales/leads-ai
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatConversation, setChatConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  // percakapan_id sudah ada langsung di tiap baris per_lead (row.id), jadi
  // tidak perlu lewat get-or-create seperti di leads-ai - langsung GET detail.
  const openChat = async (percakapanId) => {
    setLoadingChat(true);
    setShowChatPanel(true);
    try {
      const res = await fetch(getApiUrl(`sales/percakapan/${percakapanId}`), {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setChatConversation(json.data);
        setChatMessages(json.data.detail_percakapan || []);
      } else {
        setError(json.message || "Gagal memuat percakapan");
        setShowChatPanel(false);
      }
    } catch {
      setError("Gagal memuat percakapan");
      setShowChatPanel(false);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendChatMessage = async () => {
    if (!newChatMessage.trim() || !chatConversation) return;
    setSendingChat(true);
    try {
      const res = await fetch(getApiUrl(`sales/percakapan/${chatConversation.id}/message`), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ sender_type: "sales", message_text: newChatMessage }),
      });
      const json = await res.json();
      if (json.success) {
        setNewChatMessage("");
        openChat(chatConversation.id);
      }
    } catch {
      // diamkan - input tetap terisi, user bisa coba kirim ulang
    } finally {
      setSendingChat(false);
    }
  };

  const fetchRecap = useCallback(async (daysValue, salesValue) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: daysValue, sales_id: salesValue });
      const res = await fetch(`/api/sales/followup-recap?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.message || "Gagal memuat data rekap follow-up");
      }
    } catch {
      setError("Terjadi kesalahan koneksi ke server");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRecap(days, salesId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDaysChange(value) {
    setDays(value);
    fetchRecap(value, salesId);
  }

  function handleSalesChange(value) {
    setSalesId(value);
    fetchRecap(days, value);
  }

  const hourlyChartData = (data?.hourly || []).map((h) => ({
    hour: String(h.hour).padStart(2, "0"),
    "Balasan masuk (customer)": h.balasan_masuk,
    "Kirim tim (termasuk otomatis)": h.kirim_tim,
  }));

  const summary = data?.summary;
  const funnel = data?.funnel;
  const salesOptions = data?.sales_options || [];
  const perLead = data?.per_lead || [];

  return (
    <Layout title="Rekap Follow-Up">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Rekap Follow-Up</h1>
            <p className={styles.pageSubtitle}>
              Ringkasan respons tim terhadap percakapan WhatsApp masuk
              {data?.period ? ` · ${data.period.start} s/d ${data.period.end}` : ""}
            </p>
          </div>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sales</span>
              <select value={salesId} onChange={(e) => handleSalesChange(e.target.value)}>
                <option value="all">Semua Sales</option>
                {salesOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Periode</span>
              <div className={styles.dayTabs}>
                {DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.dayTabBtn} ${days === opt.value ? styles.dayTabBtnActive : ""}`}
                    onClick={() => handleDaysChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" /><path d="M10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {error}
          </div>
        )}

        {loading && (
          <div className={styles.skeletonGrid}>
            {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 80}ms` }} />)}
          </div>
        )}

        {!loading && summary && (
          <>
            {/* ── Summary Cards ── */}
            <div className={styles.summaryGrid}>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Leads Masuk</span>
                <div className={styles.cardValue}>{fmt(summary.leads_masuk)}</div>
                <span className={styles.cardDesc}>Inbound periode ini</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Dibalas Tim</span>
                <div className={`${styles.cardValue} ${styles.cardValueGreen}`}>
                  {fmt(summary.dibalas_tim)} <span style={{ fontSize: "1rem" }}>({summary.dibalas_pct}%)</span>
                </div>
                <span className={styles.cardDesc}>dari {fmt(summary.percakapan_aktif)} percakapan</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Belum Dibalas</span>
                <div className={`${styles.cardValue} ${styles.cardValueRed}`}>{fmt(summary.belum_dibalas)}</div>
                <span className={styles.cardDesc}>Perlu dikejar</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Balasan Customer</span>
                <div className={styles.cardValue}>{fmt(summary.balasan_customer)}</div>
                <span className={styles.cardDesc}>{fmt(summary.kirim_tim)} kirim tim</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Median Respon</span>
                <div className={`${styles.cardValue} ${styles.cardValueTeal}`}>
                  {summary.median_respon_menit !== null ? `${summary.median_respon_menit} mnt` : "-"}
                </div>
                <span className={styles.cardDesc}>90% ≤ {summary.median_respon_menit ? Math.round(summary.median_respon_menit * 2) : "-"} mnt</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Balas Cepat</span>
                <div className={`${styles.cardValue} ${styles.cardValueGreen}`}>{summary.balas_cepat_pct}%</div>
                <span className={styles.cardDesc}>≤ 15 menit</span>
              </div>
            </div>

            <p className={styles.footnote}>
              &quot;Dibalas&quot; &amp; &quot;Median respon&quot; dihitung dari pesan tim berikutnya setelah customer chat —
              termasuk balasan otomatis/broadcast (data belum memisah manual vs otomatis), jadi baca sebagai indikator, bukan angka mutlak.
            </p>

            {/* ── Jam Aktivitas Chart ── */}
            <div className={styles.chartCard}>
              <h4 className={styles.chartTitle}>Jam Aktivitas — Masuk vs Dibalas</h4>
              <p className={styles.chartHint}>
                Sumbu = jam 0–23. Batang oranye mencakup balasan manual + auto-reply + broadcast + follow-up (data belum memisah manual vs otomatis).
              </p>
              {hourlyChartData.some((h) => h["Balasan masuk (customer)"] > 0 || h["Kirim tim (termasuk otomatis)"] > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourlyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Balasan masuk (customer)" fill="rgba(30,58,95,0.85)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Kirim tim (termasuk otomatis)" fill="rgba(20,184,166,0.85)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyState}>Tidak ada aktivitas di periode ini</div>
              )}
            </div>

            {/* ── Corong Percakapan ── */}
            <div className={styles.chartCard}>
              <h4 className={styles.chartTitle}>Corong Percakapan</h4>
              <p className={styles.chartHint}>&nbsp;</p>
              {funnel && (
                <>
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Percakapan masuk</span>
                    <div className={styles.funnelBarWrap}>
                      <div className={styles.funnelBarFill} style={{ width: "100%" }}>{fmt(funnel.percakapan_masuk)}</div>
                    </div>
                    <span className={styles.funnelPct}>100%</span>
                  </div>
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Dibalas tim</span>
                    <div className={styles.funnelBarWrap}>
                      <div className={styles.funnelBarFill} style={{ width: `${funnel.dibalas_pct}%` }}>{fmt(funnel.dibalas_tim)}</div>
                    </div>
                    <span className={styles.funnelPct}>{funnel.dibalas_pct}%</span>
                  </div>
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Prospek balas lagi</span>
                    <div className={styles.funnelBarWrap}>
                      <div className={styles.funnelBarFill} style={{ width: `${Math.round((funnel.prospek_balas_lagi / (funnel.percakapan_masuk || 1)) * 100)}%` }}>
                        {fmt(funnel.prospek_balas_lagi)}
                      </div>
                    </div>
                    <span className={styles.funnelPct}>{funnel.balas_lagi_pct}%</span>
                  </div>
                </>
              )}
            </div>

            {/* ── Rekap Percakapan per Lead ── */}
            <div className={styles.tableCard}>
              <h4 className={styles.chartTitle}>Rekap Percakapan per Lead</h4>
              <p className={styles.chartHint}>{days} hari terakhir · maksimal 200 baris, diurutkan dari yang paling baru</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>WhatsApp</th>
                      <th>Sales</th>
                      <th>Pesan Masuk</th>
                      <th>Kirim Tim</th>
                      <th>Status</th>
                      <th>Respon (mnt)</th>
                      <th>Aktivitas Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perLead.length > 0 ? (
                      perLead.map((row) => (
                        <tr key={row.id} onClick={() => openChat(row.id)} style={{ cursor: "pointer" }} title="Klik untuk lihat percakapan">
                          <td><strong>{row.nama}</strong></td>
                          <td>
                            {row.phone
                              ? (
                                <a
                                  href={`https://wa.me/${row.phone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {row.phone}
                                </a>
                              )
                              : "-"}
                          </td>
                          <td>{row.sales_nama || "-"}</td>
                          <td>{fmt(row.pesan_masuk)}</td>
                          <td>{fmt(row.pesan_tim)}</td>
                          <td>
                            <span className={`${styles.badge} ${row.dibalas ? styles.badgeSuccess : styles.badgeDanger}`}>
                              {row.dibalas ? "Dibalas" : "Belum Dibalas"}
                            </span>
                          </td>
                          <td>{row.respon_menit !== null ? row.respon_menit : "-"}</td>
                          <td>
                            {row.last_message_at
                              ? new Date(row.last_message_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                              : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={8} className={styles.tdEmpty}>Tidak ada percakapan di periode ini</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chat Panel - Bottom Right (sama seperti /sales/leads-ai) */}
      {showChatPanel && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "400px",
            maxWidth: "calc(100vw - 40px)",
            height: "600px",
            maxHeight: "calc(100vh - 40px)",
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
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
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
                  flexShrink: 0,
                }}
              >
                {(chatConversation?.phone_number || "U").substring((chatConversation?.phone_number || "U").length - 2)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {chatConversation?.name || chatConversation?.phone_number || "-"}
                </div>
                {chatConversation?.name && (
                  <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>{chatConversation.phone_number || "-"}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setShowChatPanel(false);
                setChatConversation(null);
                setChatMessages([]);
              }}
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
                flexShrink: 0,
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
            {loadingChat ? (
              <div style={{ textAlign: "center", color: "#667781", padding: "2rem" }}>Memuat percakapan...</div>
            ) : chatMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#667781", padding: "2rem" }}>Belum ada pesan</div>
            ) : (
              chatMessages.map((msg) => {
                const isSent = msg.sender_type === "AI" || msg.sender_type === "sales" || msg.sender_type === "system";
                const senderLabel = msg.sender_type === "AI" ? "AI" : msg.sender_type === "sales" ? "Sales" : msg.sender_type === "system" ? "System" : "Customer";
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
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", textAlign: isSent ? "right" : "left", color: "#667781" }}>
                        {senderLabel}
                      </div>
                      <div style={{ fontSize: "0.875rem", lineHeight: 1.4, color: "#111b21", margin: 0 }}>{msg.message_text}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#667781", marginTop: "0.25rem", textAlign: isSent ? "right" : "left" }}>
                        {time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          <div style={{ padding: "0.75rem 1rem", background: "#f0f2f5", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            <textarea
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              onKeyDown={(e) => {
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
                flexShrink: 0,
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
