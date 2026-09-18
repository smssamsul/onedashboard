"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, MessageCircle, Plus, Search, X, Package, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { toastSuccess, toastError } from "@/lib/toast";
import styles from "./leadsAnalisa.module.css";

const STATUS_PEMBAYARAN_LABEL = {
  0: "Unpaid", 1: "Waiting Approval", 2: "Paid", 3: "Rejected", 4: "Partial Payment",
};

function productBasePrice(prod) {
  return Number(prod?.harga_asli ?? prod?.harga ?? 0) || 0;
}
function isBundleActive(b) {
  const s = b?.status;
  if (s === undefined || s === null || s === "") return true;
  if (s === "N" || s === "0" || s === 0) return false;
  return s === "1" || s === 1 || s === "A" || s === "a";
}
function getBundles(prod) {
  if (!Array.isArray(prod?.bundling_rel)) return [];
  return prod.bundling_rel.filter(isBundleActive);
}
function priceForProduct(prod, bundleId) {
  const base = productBasePrice(prod);
  if (!bundleId) return base;
  const b = getBundles(prod).find((x) => String(x.id) === String(bundleId));
  if (!b) return base;
  return Number(b.harga) || base;
}
function formatRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
}
function formatDateShort(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString).slice(0, 10);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const TAB_ORDER = ["closing", "hot", "warm", "cold", "low_quality"];

const LABELS = {
  closing: {
    title: "Closing",
    color: "#16a34a",
    explain: "Sudah punya order dengan status Waiting Approval atau Paid - tinggal ditutup.",
  },
  hot: {
    title: "Hot",
    color: "#ef4444",
    explain: "Sudah mengarah ke pendaftaran - nanya harga, cara bayar, rekening, minta daftar, atau sudah menentukan jadwal.",
  },
  warm: {
    title: "Warm",
    color: "#f59e0b",
    explain: "Sudah mulai tertarik - nanya jadwal, materi, atau benefit/fasilitas, sedang evaluasi kecocokan.",
  },
  cold: {
    title: "Cold",
    color: "#38bdf8",
    explain: "Masih sekadar cari informasi umum - belum nanya jadwal, materi, benefit, harga, atau pembayaran.",
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

const ANALISA_TTL_MS = 24 * 60 * 60 * 1000; // 1 hari - biar tidak boncos biaya AI

function isAnalysisStale(aiAnalysisAt) {
  if (!aiAnalysisAt) return true;
  return Date.now() - new Date(aiAnalysisAt).getTime() > ANALISA_TTL_MS;
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

// ai_analysis tersimpan sebagai teks "Ringkasan: ...\nPotensi: ...\n..." -
// parse balik jadi bagian-bagian supaya bisa ditampilkan terpisah.
function parseAiAnalysis(text) {
  if (!text) return null;
  const cari = (label) => {
    const re = new RegExp(`${label}:\\s*(.+?)(?=\\n(?:Ringkasan|Potensi|Keberatan|Rekomendasi):|$)`, "s");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  return {
    ringkasan: cari("Ringkasan"),
    potensi: cari("Potensi"),
    keberatan: cari("Keberatan"),
    rekomendasi: cari("Rekomendasi"),
  };
}

function ScoreGauge({ score, color, closing }) {
  const persen = closing ? 100 : Math.max(0, Math.min(100, score));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - persen / 100);

  return (
    <div className={styles.gaugeWrap}>
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--color-divider, #e5e7eb)" strokeWidth="10" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 56 56)"
        />
      </svg>
      <div className={styles.gaugeCenter}>
        <span className={styles.gaugeScore} style={{ color }}>
          {score}
        </span>
        <span className={styles.gaugePercent}>{persen}%</span>
      </div>
    </div>
  );
}

export default function LeadsAnalisaPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("hot");
  const [counts, setCounts] = useState({ hot: 0, warm: 0, cold: 0, low_quality: 0 });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [filterOptions, setFilterOptions] = useState({ sumber: [], produk: [] });
  const [sumberFilter, setSumberFilter] = useState("");
  const [produkFilter, setProdukFilter] = useState("");

  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ product: null, bundleId: "", harga: 0 });
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

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

  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`sales/percakapan/filter-options`), { headers: getHeaders() });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const json = await res.json();
      if (json.success) {
        setFilterOptions({ sumber: json.data.sumber || [], produk: json.data.produk || [] });
      }
    } catch {
      // diamkan - dropdown filter cukup kosong kalau gagal
    }
  }, [getHeaders, router]);

  const loadStats = useCallback(
    async (search, sumber, produk) => {
      try {
        const params = new URLSearchParams({ hanya_lead_valid: "1" });
        if (search) params.append("search", search);
        if (sumber) params.append("sumber", sumber);
        if (produk) params.append("produk", produk);
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
    async (status, search, pageNumber, sumber, produk, append = false) => {
      if (append) setLoadingMore(true);
      else setLoadingList(true);
      try {
        const params = new URLSearchParams({
          status,
          page: String(pageNumber),
          per_page: "20",
          hanya_lead_valid: "1",
        });
        if (search) params.append("search", search);
        if (sumber) params.append("sumber", sumber);
        if (produk) params.append("produk", produk);
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
          loadStats(debouncedSearch, sumberFilter, produkFilter);
          loadList(activeTab, debouncedSearch, 1, sumberFilter, produkFilter);
        }
      } catch {
        // diamkan
      } finally {
        setRescoring(false);
      }
    },
    [getHeaders, loadStats, loadList, activeTab, debouncedSearch, sumberFilter, produkFilter]
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

          // Analisa AI (poin + naratif) otomatis dipicu saat lead dibuka,
          // TAPI cuma kalau analisa terakhir sudah lebih dari 1 hari (atau
          // belum pernah) - supaya buka-tutup lead yang sama berkali-kali
          // sehari tidak berulang kali manggil AI (boncos biaya). Tombol
          // "Analisa Ulang" tetap selalu memaksa analisa baru kapan saja.
          if (isAnalysisStale(json.data.ai_analysis_at)) {
            rescoreOne(id);
          }
        }
      } catch {
        // diamkan
      } finally {
        setLoadingDetail(false);
      }
    },
    [getHeaders, rescoreOne]
  );

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`sales/produk`), { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setProducts(json.data || []);
    } catch {
      // diamkan - dropdown produk cukup kosong kalau gagal
    }
  }, [getHeaders]);

  function openOrderModal() {
    setProductSearch("");
    setConfirmState({ product: null, bundleId: "", harga: 0 });
    setOrderModalOpen(true);
  }

  function selectOrderProduct(prod) {
    setConfirmState({ product: prod, bundleId: "", harga: productBasePrice(prod) });
  }

  function handleBundleChange(e) {
    const bId = e.target.value;
    setConfirmState((prev) => ({ ...prev, bundleId: bId, harga: priceForProduct(prev.product, bId) }));
  }

  const handleOrderConfirm = useCallback(async () => {
    if (!selectedConversation || !confirmState.product) return;
    setConfirmSubmitting(true);
    try {
      const body = {
        produk: confirmState.product.id,
        harga: String(confirmState.harga),
        ongkir: "0",
        total_harga: String(confirmState.harga),
        sumber: "analisa_leads",
        bundling: confirmState.bundleId || "",
        notif: 1,
      };
      if (selectedConversation.customer_id) {
        body.customer = selectedConversation.customer_id;
      } else {
        body.nama = selectedConversation.name || selectedConversation.phone_number;
        body.wa = selectedConversation.phone_number;
      }
      const res = await fetch(getApiUrl(`sales/order-admin`), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toastSuccess(json.message || "Order berhasil dibuat");
        setOrderModalOpen(false);
        loadDetail(selectedConversation.id);
      } else {
        toastError(json.message || "Gagal membuat order");
      }
    } catch {
      toastError("Terjadi kesalahan saat membuat order");
    } finally {
      setConfirmSubmitting(false);
    }
  }, [selectedConversation, confirmState, getHeaders, loadDetail]);

  useEffect(() => {
    loadFilterOptions();
    fetchProducts();
  }, [loadFilterOptions, fetchProducts]);

  // Muat ulang tab + statistik saat tab/pencarian/filter sumber-produk berubah
  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setSelectedConversation(null);
    loadList(activeTab, debouncedSearch, 1, sumberFilter, produkFilter);
    loadStats(debouncedSearch, sumberFilter, produkFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, sumberFilter, produkFilter]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadList(activeTab, debouncedSearch, next, sumberFilter, produkFilter, true);
  };

  const label = LABELS[activeTab];
  const selectedLabel = selectedConversation ? LABELS[selectedConversation.status] : null;
  const messages = selectedConversation?.detail_percakapan || selectedConversation?.detailPercakapan || [];
  const aiAnalysis = selectedConversation ? parseAiAnalysis(selectedConversation.ai_analysis) : null;

  return (
    <Layout title="Analisa Leads">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Analisa Leads</h1>
          <p className={styles.pageSubtitle}>Skoring otomatis berdasarkan intent percakapan customer</p>
        </div>

        <div className={styles.banner}>
          <h2 className={styles.bannerTitle}>🎯 Analisa Leads — Skoring Poin</h2>
          <p className={styles.bannerText}>
            Tiap aktivitas customer (nanya jadwal, harga, kirim rekening, dll) dikonversi jadi poin oleh AI, dikurangi
            penalti kalau tidak aktif — totalnya menentukan Closing/Hot/Warm/Cold/Low Quality, tanpa perlu dicek
            satu-satu secara manual.
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

            <div className={styles.filterRow}>
              <select
                className={styles.filterSelect}
                value={sumberFilter}
                onChange={(e) => setSumberFilter(e.target.value)}
              >
                <option value="">Semua Sumber</option>
                {filterOptions.sumber.map((s) => (
                  <option key={s.sumber} value={s.sumber}>
                    {s.sumber} ({s.jumlah})
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={produkFilter}
                onChange={(e) => setProdukFilter(e.target.value)}
              >
                <option value="">Semua Produk</option>
                {filterOptions.produk.map((p) => (
                  <option key={p.produk_text} value={p.produk_text}>
                    {p.produk_text} ({p.jumlah})
                  </option>
                ))}
              </select>
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
                      <span className={styles.leadItemScore}>{lead.lead_score ?? 0}</span>
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
                      <div className={styles.chatHeaderMeta}>
                        {selectedConversation.phone_number}
                        {selectedConversation.lead_lokasi ? ` · ${selectedConversation.lead_lokasi}` : ""}
                      </div>
                      <div className={styles.leadDataRow}>
                        <span>
                          <strong>Sumber:</strong> {selectedConversation.lead_sumber || "-"}
                        </span>
                        <span>
                          <strong>Minat:</strong> {selectedConversation.lead_produk_text || "-"}
                        </span>
                        <span>
                          <strong>Sales:</strong> {selectedConversation.sales?.nama || "Belum ditugaskan"}
                        </span>
                      </div>
                      {selectedConversation.order_history?.length > 0 && (
                        <div className={styles.orderHistoryRow} title={selectedConversation.order_history.map((o) => `${o.produk_nama || "-"} (${STATUS_PEMBAYARAN_LABEL[o.status_pembayaran] || "Unpaid"}, ${formatDateShort(o.tanggal)})`).join(" | ")}>
                          <Package size={13} />
                          <span>
                            Pernah Order ({selectedConversation.order_history.length}x) - terakhir: {selectedConversation.order_history[0].produk_nama || "-"}
                          </span>
                        </div>
                      )}
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
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnOrder}`}
                      onClick={openOrderModal}
                    >
                      <Plus size={15} /> Tambah Order
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
                    {selectedConversation.ai_analysis_at && (
                      <span className={styles.analysisTimestamp}>
                        Dianalisa AI {formatRelative(selectedConversation.ai_analysis_at)}
                      </span>
                    )}
                  </div>

                  <div className={styles.analisaBody}>
                    <div className={styles.analisaTextCol}>
                      <p className={styles.analisaExplain}>
                        {selectedLabel?.explain || "Status belum dianalisa - klik \"Analisa Ulang\"."}
                      </p>
                      {aiAnalysis ? (
                        <div className={styles.aiSections}>
                          <div className={styles.aiSection}>
                            <span className={styles.aiSectionLabel}>Ringkasan</span>
                            <p>{aiAnalysis.ringkasan || "-"}</p>
                          </div>
                          <div className={styles.aiSection}>
                            <span className={styles.aiSectionLabel}>Potensi</span>
                            <p>{aiAnalysis.potensi || "-"}</p>
                          </div>
                          <div className={styles.aiSection}>
                            <span className={styles.aiSectionLabel}>Keberatan</span>
                            <p>{aiAnalysis.keberatan || "-"}</p>
                          </div>
                          <div className={styles.aiSection}>
                            <span className={styles.aiSectionLabel}>Rekomendasi</span>
                            <p>{aiAnalysis.rekomendasi || "-"}</p>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.analisaExplain}>
                          {rescoring ? "Menganalisa dengan AI..." : "Belum ada analisa AI rinci untuk lead ini - klik \"Analisa Ulang\"."}
                        </p>
                      )}
                    </div>

                    <ScoreGauge
                      score={selectedConversation.lead_score ?? 0}
                      color={selectedLabel?.color || "#94a3b8"}
                      closing={selectedConversation.status === "closing"}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {orderModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => !confirmSubmitting && setOrderModalOpen(false)}></div>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2>Tambah Order</h2>
              <button type="button" onClick={() => !confirmSubmitting && setOrderModalOpen(false)} className={styles.modalClose}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalSection}>
                <div className={styles.modalSectionLabel}>Pembeli</div>
                <div className={styles.modalFieldRow}>
                  <span className={styles.modalFieldLabel}>Nama</span>
                  <span className={styles.modalFieldValue}>{selectedConversation?.name || "-"}</span>
                </div>
                <div className={styles.modalFieldRow}>
                  <span className={styles.modalFieldLabel}>WhatsApp</span>
                  <span className={styles.modalFieldValue}>{selectedConversation?.phone_number || "-"}</span>
                </div>
                {selectedConversation?.lead_produk_text && (
                  <div className={styles.modalFieldRow}>
                    <span className={styles.modalFieldLabel}>Minat</span>
                    <span className={styles.modalFieldValue}>{selectedConversation.lead_produk_text}</span>
                  </div>
                )}
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionLabel}>Produk &amp; Pembayaran</div>

                {!confirmState.product ? (
                  <>
                    <div className={styles.modalSearchWrap}>
                      <Search size={15} className={styles.modalSearchIcon} />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ketik nama produk..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className={styles.modalSearchInput}
                      />
                    </div>
                    <div className={styles.modalProductList}>
                      {products
                        .filter((p) => !productSearch.trim() || p.nama.toLowerCase().includes(productSearch.trim().toLowerCase()))
                        .slice(0, 50)
                        .map((p) => (
                          <button type="button" key={p.id} onClick={() => selectOrderProduct(p)} className={styles.modalProductItem}>
                            <span>{p.nama}</span>
                            <span className={styles.modalProductPrice}>{formatRp(productBasePrice(p))}</span>
                          </button>
                        ))}
                      {products.filter((p) => !productSearch.trim() || p.nama.toLowerCase().includes(productSearch.trim().toLowerCase())).length === 0 && (
                        <div className={styles.modalProductEmpty}>Produk tidak ditemukan</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.modalFieldRow}>
                      <div>
                        <span className={styles.modalFieldLabel}>Produk</span>
                        <div className={styles.modalFieldValue}>{confirmState.product.nama}</div>
                      </div>
                      <button type="button" onClick={() => setConfirmState({ product: null, bundleId: "", harga: 0 })} className={styles.modalChangeBtn}>
                        Ganti produk
                      </button>
                    </div>

                    {getBundles(confirmState.product).length > 0 && (
                      <select value={confirmState.bundleId} onChange={handleBundleChange} className={styles.modalSelect}>
                        <option value="">Harga dasar produk</option>
                        {getBundles(confirmState.product).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama} - {formatRp(b.harga)}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className={styles.modalTotalRow}>
                      <span>Total</span>
                      <span className={styles.modalTotalValue}>{formatRp(confirmState.harga)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" disabled={confirmSubmitting} onClick={() => setOrderModalOpen(false)} className={styles.modalBtnCancel}>
                Batal
              </button>
              <button type="button" disabled={confirmSubmitting || !confirmState.product} onClick={handleOrderConfirm} className={styles.modalBtnConfirm}>
                {confirmSubmitting && <Loader2 size={16} className={styles.spin} />}
                Ya, buat order
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
