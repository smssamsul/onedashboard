"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, MessageCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import styles from "./leadsAnalisa.module.css";

const TAB_ORDER = ["hot", "warm", "cold", "low_quality"];

const LABELS = {
  hot: {
    title: "Hot",
    color: "#ef4444",
    explain: "Sudah menanyakan nomor rekening atau biaya - siap didorong closing.",
  },
  warm: {
    title: "Warm",
    color: "#f59e0b",
    explain: "Sudah menanyakan jadwal, materi, atau benefit - tertarik tapi belum siap bayar.",
  },
  cold: {
    title: "Cold",
    color: "#38bdf8",
    explain: "Sudah membalas, tapi belum menanyakan jadwal maupun benefit.",
  },
  low_quality: {
    title: "Low Quality",
    color: "#94a3b8",
    explain: "Sama sekali belum merespons.",
  },
};

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} jam lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function LeadsAnalisaPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("hot");
  const [counts, setCounts] = useState({ hot: 0, warm: 0, cold: 0, low_quality: 0 });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const messagesEndRef = useRef(null);

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("token") : "";
  }

  const getHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    []
  );

  const loadStats = useCallback(
    async (search) => {
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        const res = await fetch(getApiUrl(`sales/percakapan/stats?${params.toString()}`), {
          headers: getHeaders(),
        });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const json = await res.json();
        if (json.success) {
          setCounts(json.data.per_status || {});
        }
      } catch {
        // diamkan - badge tab cukup tampil 0 kalau gagal
      }
    },
    [getHeaders, router]
  );

  const loadList = useCallback(
    async (status, search, pageNumber, append = false) => {
      if (append) setLoadingMore(true);
      else setLoadingList(true);
      try {
        const params = new URLSearchParams({
          status,
          page: String(pageNumber),
          per_page: "20",
        });
        if (search) params.append("search", search);
        const res = await fetch(getApiUrl(`sales/percakapan?${params.toString()}`), {
          headers: getHeaders(),
        });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const json = await res.json();
        if (json.success) {
          setLeads((prev) => (append ? [...prev, ...json.data] : json.data));
          setLastPage(json.pagination?.last_page || 1);
        }
      } catch {
        // diamkan - list kosong lebih baik daripada crash
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
      }
    },
    [getHeaders, router]
  );

  const loadDetail = useCallback(
    async (id) => {
      setLoadingDetail(true);
      try {
        const res = await fetch(getApiUrl(`sales/percakapan/${id}`), { headers: getHeaders() });
        const json = await res.json();
        if (json.success) {
          setSelectedConversation(json.data);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      } catch {
        // diamkan
      } finally {
        setLoadingDetail(false);
      }
    },
    [getHeaders]
  );

  const rescoreOne = useCallback(
    async (id) => {
      setRescoring(true);
      try {
        const res = await fetch(getApiUrl(`sales/percakapan/${id}/rescore`), {
          method: "POST",
          headers: getHeaders(),
        });
        const json = await res.json();
        if (json.success) {
          setSelectedConversation((prev) => (prev ? { ...prev, ...json.data } : json.data));
          loadStats(debouncedSearch);
          loadList(activeTab, debouncedSearch, 1);
        }
      } catch {
        // diamkan
      } finally {
        setRescoring(false);
      }
    },
    [getHeaders, loadStats, loadList, activeTab, debouncedSearch]
  );

  // Muat ulang tab + statistik saat tab/pencarian berubah
  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setSelectedConversation(null);
    loadList(activeTab, debouncedSearch, 1);
    loadStats(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadList(activeTab, debouncedSearch, next, true);
  };

  const label = LABELS[activeTab];
  const selectedLabel = selectedConversation ? LABELS[selectedConversation.status] : null;
  const messages = selectedConversation?.detail_percakapan || selectedConversation?.detailPercakapan || [];

  return (
    <Layout title="Analisa Leads">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Analisa Leads</h1>
          <p className={styles.pageSubtitle}>Skoring otomatis berdasarkan intent percakapan customer</p>
        </div>

        <div className={styles.banner}>
          <h2 className={styles.bannerTitle}>🎯 Analisa Leads — Skoring Intent</h2>
          <p className={styles.bannerText}>
            Tiap percakapan customer diberi skor otomatis (Hot/Warm/Cold/Low Quality) berdasarkan intent pesan yang
            sudah terdeteksi AI — tanpa perlu dicek satu-satu secara manual.
          </p>
        </div>

        <div className={styles.layout}>
          {/* Kolom kiri: tab skor + pencarian + daftar lead */}
          <div className={`${styles.panel} ${styles.leftPanel}`}>
            <div className={styles.tabs}>
              {TAB_ORDER.map((key) => {
                const info = LABELS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === key ? styles.tabBtnActive : ""}`}
                    style={{ "--tab-color": info.color }}
                    onClick={() => setActiveTab(key)}
                  >
                    <span className={styles.tabCount}>{counts[key] ?? 0}</span>
                    <span className={styles.tabLabel}>{info.title}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.searchBox}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Cari nama / nomor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className={styles.leadList}>
              {loadingList ? (
                <div className={styles.emptyState}>Memuat...</div>
              ) : leads.length === 0 ? (
                <div className={styles.emptyState}>Tidak ada lead di kategori {label.title} ini.</div>
              ) : (
                leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className={`${styles.leadItem} ${selectedId === lead.id ? styles.leadItemActive : ""}`}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <div className={styles.leadItemTop}>
                      <span
                        className={styles.badge}
                        style={{ background: `${LABELS[lead.status]?.color || "#94a3b8"}22`, color: LABELS[lead.status]?.color || "#94a3b8" }}
                      >
                        {LABELS[lead.status]?.title || lead.status || "-"}
                      </span>
                    </div>
                    <div className={styles.leadName}>{lead.name || "Tanpa nama"}</div>
                    <div className={styles.leadMeta}>{lead.phone_number}</div>
                    <div className={styles.leadSnippet}>{formatRelative(lead.last_message_at)}</div>
                  </button>
                ))
              )}
              {!loadingList && page < lastPage && (
                <button type="button" className={styles.loadMoreBtn} onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Memuat..." : "Muat lebih banyak"}
                </button>
              )}
            </div>
          </div>

          {/* Kolom kanan: percakapan + analisa */}
          <div className={`${styles.panel} ${styles.rightPanel}`}>
            {!selectedConversation ? (
              <div className={styles.centerState}>
                <div>
                  <MessageCircle size={32} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
                  <div>Pilih lead di sebelah kiri untuk lihat percakapan &amp; hasil analisa.</div>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.chatHeader}>
                  <div className={styles.chatHeaderInfo}>
                    <div>
                      <div className={styles.chatHeaderName}>{selectedConversation.name || "Tanpa nama"}</div>
                      <div className={styles.chatHeaderMeta}>{selectedConversation.phone_number}</div>
                    </div>
                  </div>
                  <div className={styles.chatHeaderActions}>
                    <a
                      className={`${styles.actionBtn} ${styles.actionBtnWa}`}
                      href={`https://wa.me/${(selectedConversation.phone_number || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={15} /> Buka WA
                    </a>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnRescore}`}
                      onClick={() => rescoreOne(selectedConversation.id)}
                      disabled={rescoring}
                    >
                      <RefreshCw size={15} className={rescoring ? styles.spin : ""} /> {rescoring ? "Menganalisa..." : "Analisa Ulang"}
                    </button>
                  </div>
                </div>

                <div className={styles.chatBody}>
                  {loadingDetail ? (
                    <div className={styles.emptyState}>Memuat percakapan...</div>
                  ) : messages.length === 0 ? (
                    <div className={styles.emptyState}>Belum ada pesan.</div>
                  ) : (
                    messages
                      .filter((m) => m.created_at)
                      .map((m) => {
                        const isSent = m.sender_type === "AI" || m.sender_type === "sales" || m.sender_type === "system";
                        const senderLabel =
                          m.sender_type === "AI" ? "AI" : m.sender_type === "sales" ? "Sales" : m.sender_type === "system" ? "System" : "Customer";
                        return (
                          <div key={m.id} className={`${styles.bubbleRow} ${isSent ? styles.bubbleRowSent : ""}`}>
                            <div className={`${styles.bubble} ${isSent ? styles.bubbleSent : styles.bubbleReceived}`}>
                              <div className={styles.bubbleSender}>{senderLabel}</div>
                              <div>{m.message_text}</div>
                              <div className={styles.bubbleTime}>{formatTime(m.created_at)}</div>
                            </div>
                          </div>
                        );
                      })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className={styles.analisaPanel}>
                  <div className={styles.analisaTitleRow}>
                    <span className={styles.analisaTitle}>Analisa</span>
                    <span className={styles.autoChip}>⚡ Otomatis</span>
                    {selectedLabel && (
                      <span
                        className={styles.badge}
                        style={{ background: `${selectedLabel.color}22`, color: selectedLabel.color }}
                      >
                        {selectedLabel.title}
                      </span>
                    )}
                  </div>
                  <p className={styles.analisaExplain}>
                    {selectedLabel?.explain || "Status belum dianalisa - klik \"Analisa Ulang\"."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
