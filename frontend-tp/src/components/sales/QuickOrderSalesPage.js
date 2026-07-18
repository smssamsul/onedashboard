"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Layout from "@/components/Layout";
import { getQuickOrderProducts } from "@/lib/sales/products";
import { api } from "@/lib/api";
import { toastSuccess, toastError } from "@/lib/toast";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/quick-order.css";
import { ChevronUp, Loader2, Package, Play, Search, Upload, User, X, Zap } from "lucide-react";
import {
  parseCsvToRecords,
  pickCsvField,
  normalizeIdToken,
  downloadQuickOrderCsvTemplate,
} from "@/lib/sales/quickOrderCsv";

function cleanWaDigits(wa) {
  return String(wa || "").replace(/\D/g, "");
}

function productBasePrice(prod) {
  return Number(prod.harga_asli ?? prod.harga ?? 0) || 0;
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

function formatRp(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function priceForProduct(prod, bundleId) {
  const base = productBasePrice(prod);
  if (!bundleId) return base;
  const b = getBundles(prod).find((x) => String(x.id) === String(bundleId));
  if (!b) return base;
  return Number(b.harga) || base;
}

const SCROLL_TOP_THRESHOLD = 280;

export default function QuickOrderSalesPage() {
  // Dummy tester:
  // - Jika true, upload massal tidak akan menyimpan ke DB (backend dummy mode) dan tidak kirim WA.
  // - Ubah ke false untuk mode real.
  const QUICK_ORDER_IMPORT_DUMMY = false;

  const topAnchorRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [sumberOrder, setSumberOrder] = useState("");
  const [sumberManual, setSumberManual] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [bundleByProduct, setBundleByProduct] = useState({});
  const [orderingId, setOrderingId] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const importInputRef = useRef(null);
  const [importRunning, setImportRunning] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importSendWa, setImportSendWa] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  /** File sudah dipilih & di-parse; proses API memakai tombol terpisah. */
  const [importPending, setImportPending] = useState(null);

  const productById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(String(p.id), p));
    return m;
  }, [products]);

  const productByKode = useMemo(() => {
    const m = new Map();
    products.forEach((p) => {
      const k = String(p.kode || p.kode_produk || "")
        .trim()
        .toLowerCase();
      if (k) m.set(k, p);
    });
    return m;
  }, [products]);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setShowScrollTop(y > SCROLL_TOP_THRESHOLD);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const scrollToTopSmooth = useCallback(() => {
    const el = topAnchorRef.current;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (el) {
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await getQuickOrderProducts({ disableToast: true });
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      toastError("Gagal memuat daftar produk");
      setProducts([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const closeImportModal = useCallback(() => {
    if (importRunning) return;
    setShowImportModal(false);
    setImportPending(null);
  }, [importRunning]);

  useEffect(() => {
    if (!showImportModal) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      closeImportModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showImportModal, closeImportModal]);

  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmSubmitting) return;
      setConfirmState(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmState, confirmSubmitting]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.nama || "").toLowerCase().includes(q));
  }, [products, search]);

  const setBundleFor = (productId, value) => {
    setBundleByProduct((prev) => ({ ...prev, [String(productId)]: value }));
  };

  const validateCustomer = () => {
    if (!nama.trim()) {
      toastError("Isi nama customer terlebih dahulu");
      return false;
    }
    if (!wa.trim()) {
      toastError("Isi nomor telepon / WhatsApp terlebih dahulu");
      return false;
    }
    const digits = cleanWaDigits(wa);
    if (digits.length < 8) {
      toastError("Nomor telepon terlalu pendek");
      return false;
    }
    return true;
  };

  const openConfirmOrder = (prod) => {
    if (!validateCustomer()) return;
    const pid = String(prod.id);
    const bundleId = bundleByProduct[pid] || "";
    const harga = priceForProduct(prod, bundleId);
    let bundleLabel = "Harga dasar produk";
    if (bundleId) {
      const b = getBundles(prod).find((x) => String(x.id) === String(bundleId));
      bundleLabel = b?.nama ? String(b.nama) : "Paket bundle";
    }
    setConfirmState({
      product: prod,
      bundleId,
      harga,
      bundleLabel,
      kategori: prod.kategori_rel?.nama || null,
    });
  };

  const closeConfirmOrder = () => {
    if (confirmSubmitting) return;
    setConfirmState(null);
  };

  const executeQuickOrder = useCallback(async (namaVal, waVal, prod, bundleId, sumberVal) => {
    const n = String(namaVal || "").trim();
    const w = String(waVal || "").trim();
    if (!n) return { ok: false, message: "Nama kosong" };
    if (!w) return { ok: false, message: "WhatsApp / telepon kosong" };
    const digits = cleanWaDigits(w);
    if (digits.length < 8) return { ok: false, message: "Nomor telepon terlalu pendek" };

    const harga = priceForProduct(prod, bundleId);
    const email = `order_${digits || Date.now()}@quickorder.local`;

    const res = await api("/sales/order-admin", {
      method: "POST",
      body: JSON.stringify({
        nama: n,
        wa: w,
        email,
        alamat: "—",
        produk: prod.id,
        harga: String(harga),
        ongkir: "0",
        total_harga: String(harga),
        sumber: "sales_quick_order",
        utm_source: String(sumberVal || ""),
        bundling: bundleId ? String(bundleId) : "",
        notif: 1,
      }),
      disableToast: true,
    });

    if (res?.success) {
      return { ok: true, message: res?.message || "Order berhasil dibuat" };
    }
    return { ok: false, message: res?.message || "Gagal membuat order" };
  }, []);

  const submitConfirmedOrder = async () => {
    if (!confirmState) return;
    const { product: prod, bundleId } = confirmState;
    if (!validateCustomer()) return;

    setConfirmSubmitting(true);
    setOrderingId(prod.id);
    const finalSumber = sumberOrder === "lainnya" ? sumberManual : sumberOrder;
    try {
      const r = await executeQuickOrder(nama, wa, prod, bundleId, finalSumber);
      if (r.ok) {
        toastSuccess(r.message || "Order berhasil dibuat");
        setConfirmState(null);
        setSumberOrder("");
        setSumberManual("");
      } else {
        toastError(r.message || "Gagal membuat order");
      }
    } catch (e) {
      toastError(e?.message || "Gagal membuat order");
    } finally {
      setConfirmSubmitting(false);
      setOrderingId(null);
    }
  };

  const handlePickImportFile = () => {
    if (importRunning || loadingList) return;
    importInputRef.current?.click();
  };

  const handleImportFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!products.length) {
      toastError("Tunggu daftar produk selesai dimuat");
      return;
    }
    if (importRunning) return;

    setImportSummary(null);
    setImportPending(null);

    let text;
    try {
      text = await file.text();
    } catch {
      toastError("Gagal membaca file");
      return;
    }

    const records = parseCsvToRecords(text);
    if (!records.length) {
      toastError("CSV kosong atau hanya berisi header. Gunakan kolom: nama, wa, id_produk, kode_produk, bundling_id.");
      return;
    }

    const rows = [];
    const localFailures = [];

    for (let idx = 0; idx < records.length; idx++) {
      const row = records[idx];
      const lineNo = idx + 2;

      const namaRow = pickCsvField(row, ["nama", "name", "customer", "pembeli", "customer_name"]);
      const waRow = pickCsvField(row, ["wa", "whatsapp", "hp", "telepon", "phone", "no_hp", "no_wa", "telp"]);
      const pidRaw = pickCsvField(row, ["produk_id", "id_produk", "product_id"]);
      const kodeRaw = pickCsvField(row, ["kode_produk", "kode", "slug", "code"]);
      const bidRaw = pickCsvField(row, ["bundling_id", "bundle_id", "paket_id", "bundling"]);

      if (!namaRow && !waRow && !pidRaw && !kodeRaw && !bidRaw) continue;
      if (!namaRow) {
        localFailures.push({ line: lineNo, reason: "Nama wajib diisi" });
        continue;
      }
      if (!waRow) {
        localFailures.push({ line: lineNo, reason: "WhatsApp / telepon wajib diisi" });
        continue;
      }
      if (!pidRaw && !kodeRaw) {
        localFailures.push({ line: lineNo, reason: "id_produk atau kode_produk wajib diisi" });
        continue;
      }

      rows.push({
        nama: namaRow,
        wa: waRow,
        id_produk: pidRaw ? normalizeIdToken(pidRaw) : "",
        kode_produk: kodeRaw ? String(kodeRaw).trim() : "",
        bundling_id: bidRaw ? normalizeIdToken(bidRaw) : "",
        __line: lineNo,
      });
    }

    if (!rows.length) {
      toastError("Tidak ada baris valid untuk diproses");
      setImportSummary({ ok: 0, fail: localFailures });
      return;
    }

    setImportPending({ fileName: file.name, rows, localFailures });
  };

  const handleProcessImportUpload = async () => {
    if (!importPending?.rows?.length || importRunning || loadingList) return;
    if (!products.length) {
      toastError("Tunggu daftar produk selesai dimuat");
      return;
    }

    const { rows, localFailures } = importPending;

    setImportRunning(true);
    setImportProgress({ done: 0, total: rows.length });
    try {
      const res = await api("/sales/order-admin/bulk", {
        method: "POST",
        body: JSON.stringify({
          dummy: QUICK_ORDER_IMPORT_DUMMY,
          notif: Boolean(importSendWa),
          rows: rows.map(({ __line, ...r }) => r),
        }),
        disableToast: true,
      });

      const summary = res?.summary || {};
      const okCount = Number(summary.success || 0);
      const results = Array.isArray(res?.results) ? res.results : [];

      const failures = [...(localFailures || [])];
      results.forEach((r) => {
        if (r?.success === false) {
          const idx = Number(r.index);
          const line = rows[idx]?.__line ?? null;
          failures.push({ line: line || "?", reason: r.message || "Gagal" });
        }
      });

      setImportSummary({ ok: okCount, fail: failures });
      setImportPending(null);

      if (okCount && !failures.length) {
        toastSuccess(`Import selesai: ${okCount} order berhasil dibuat`);
      } else if (okCount && failures.length) {
        toastSuccess(`${okCount} order berhasil; ${failures.length} baris gagal (lihat ringkasan di bawah)`);
      } else if (!okCount && failures.length) {
        toastError(`Semua baris gagal (${failures.length}). Periksa ringkasan di bawah.`);
      } else {
        toastError("Tidak ada order yang diproses");
      }
    } catch (err) {
      console.error(err);
      toastError(err?.message || "Gagal import");
      setImportSummary({
        ok: 0,
        fail: localFailures?.length ? localFailures : [{ line: "?", reason: "Gagal import" }],
      });
    } finally {
      setImportRunning(false);
      setImportProgress(null);
    }
  };

  const importModal =
    portalReady &&
    showImportModal &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="modal-overlay"
        role="presentation"
        onClick={closeImportModal}
        style={{
          padding:
            "max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px)) max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <div
          className="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-order-import-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(560px, calc(100vw - 2rem))",
            maxWidth: "100%",
            margin: "auto",
          }}
        >
          <div className="modal-header">
            <h2 id="quick-order-import-title">Upload massal (CSV)</h2>
            <button
              type="button"
              className="modal-close"
              onClick={closeImportModal}
              disabled={importRunning}
              aria-label="Tutup"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="modal-body" style={{ gap: "0.9rem" }}>


            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleImportFileSelected}
            />

            {importPending?.rows?.length ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--dash-border, #e9ecef)",
                  background: "#f8fafc",
                  fontSize: "0.8125rem",
                  color: "var(--dash-text-dark, #252f40)",
                  lineHeight: 1.5,
                }}
              >
                <strong>{importPending.fileName}</strong> — {importPending.rows.length} baris siap dikirim.
                {importPending.localFailures?.length ? (
                  <span style={{ color: "var(--dash-muted-strong)" }}>
                    {" "}
                    ({importPending.localFailures.length} baris dilewati karena tidak valid.)
                  </span>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--dash-muted, #67748e)" }}>
                Belum ada file: pilih CSV dulu, lalu klik <strong>Proses upload</strong> untuk membuat order.
              </p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => downloadQuickOrderCsvTemplate()}
                disabled={importRunning}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--dash-border, #e9ecef)",
                  background: "#fff",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: importRunning ? "not-allowed" : "pointer",
                  color: "var(--dash-text-dark, #252f40)",
                }}
              >
                Unduh template CSV
              </button>
              <button
                type="button"
                onClick={handlePickImportFile}
                disabled={importRunning || loadingList}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--dash-border, #e9ecef)",
                  background: "#fff",
                  color: "var(--dash-text-dark, #252f40)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: importRunning || loadingList ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Upload size={16} aria-hidden />
                Pilih file CSV
              </button>
              <button
                type="button"
                onClick={handleProcessImportUpload}
                disabled={importRunning || loadingList || !importPending?.rows?.length}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--accent-primary, #fb8500)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: importRunning || loadingList || !importPending?.rows?.length ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {importRunning ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                {importRunning ? "Memproses…" : "Proses upload"}
              </button>
              {importProgress ? (
                <span style={{ fontSize: "0.8125rem", color: "var(--dash-muted-strong)" }}>
                  Baris {importProgress.done}/{importProgress.total}
                </span>
              ) : null}
            </div>

            {/* Switch notif WA */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--dash-border, #e9ecef)",
                background: "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--dash-text-dark, #252f40)" }}>Kirim notif WhatsApp</div>
                <div style={{ fontSize: "0.78rem", color: "var(--dash-muted, #67748e)", lineHeight: 1.4 }}>
                  Jika aktif sistem akan mengirim WA sesuai template follow up ke customer.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportSendWa((v) => !v)}
                disabled={importRunning}
                aria-pressed={importSendWa}
                style={{
                  width: 54,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: importSendWa ? "#22c55e" : "#e5e7eb",
                  padding: 3,
                  cursor: importRunning ? "not-allowed" : "pointer",
                  transition: "background 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: importSendWa ? "flex-end" : "flex-start",
                }}
                title={importSendWa ? "Aktif" : "Nonaktif"}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  }}
                />
              </button>
            </div>

            {importSummary ? (
              <div
                style={{
                  marginTop: "0.25rem",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--dash-border, #e9ecef)",
                  background: "#f8fafc",
                  fontSize: "0.8125rem",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--dash-text-dark)" }}>Hasil import terakhir</div>
                <div style={{ color: "var(--dash-muted-strong)", marginBottom: importSummary.fail.length ? 8 : 0 }}>
                  Berhasil: <strong style={{ color: "#15803d" }}>{importSummary.ok}</strong>
                  {importSummary.fail.length ? (
                    <>
                      {" "}
                      · Gagal: <strong style={{ color: "#b91c1c" }}>{importSummary.fail.length}</strong>
                    </>
                  ) : null}
                </div>
                {importSummary.fail.length ? (
                  <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#64748b", maxHeight: 180, overflow: "auto" }}>
                    {importSummary.fail.slice(0, 40).map((f, fi) => (
                      <li key={`${f.line}-${fi}-${String(f.reason).slice(0, 40)}`}>
                        Baris {f.line}: {f.reason}
                      </li>
                    ))}
                    {importSummary.fail.length > 40 ? <li>… dan {importSummary.fail.length - 40} lainnya</li> : null}
                  </ul>
                ) : null}
                <button
                  type="button"
                  onClick={() => setImportSummary(null)}
                  style={{
                    marginTop: 10,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    borderRadius: 8,
                    border: "1px solid var(--dash-border)",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Tutup ringkasan
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>,
      document.body
    );

  const confirmModal =
    portalReady &&
    confirmState &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="modal-overlay"
        role="presentation"
        onClick={closeConfirmOrder}
        style={{
          padding: "max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px)) max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <div
          className="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-order-confirm-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(440px, calc(100vw - 2rem))",
            maxWidth: "100%",
            margin: "auto",
          }}
        >
          <div className="modal-header">
            <h2 id="quick-order-confirm-title">Konfirmasi order</h2>
            <button
              type="button"
              className="modal-close"
              onClick={closeConfirmOrder}
              disabled={confirmSubmitting}
              aria-label="Tutup"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="modal-body" style={{ gap: "1.25rem" }}>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--gray-text, #67748e)", lineHeight: 1.5 }}>
              Periksa kembali data berikut sebelum order dikirim ke sistem.
            </p>

            <div
              style={{
                border: "1px solid var(--gray-border, #e9ecef)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderBottom: "1px solid var(--gray-border, #e9ecef)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--gray-text, #64748b)",
                }}
              >
                <User size={14} aria-hidden />
                Pembeli
              </div>
              <dl style={{ margin: 0, padding: "14px 14px 12px", display: "grid", gap: 12 }}>
                <div>
                  <dt style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-text)", marginBottom: 4 }}>Nama</dt>
                  <dd style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "var(--dark-text, #252f40)", wordBreak: "break-word" }}>
                    {nama.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-text)", marginBottom: 4 }}>WhatsApp / telepon</dt>
                  <dd style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 500, color: "var(--dark-text)", fontVariantNumeric: "tabular-nums" }}>
                    {wa.trim() || "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div
              style={{
                border: "1px solid var(--gray-border, #e9ecef)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderBottom: "1px solid var(--gray-border, #e9ecef)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--gray-text, #64748b)",
                }}
              >
                <Package size={14} aria-hidden />
                Produk & pembayaran
              </div>
              <dl style={{ margin: 0, padding: "14px 14px 12px", display: "grid", gap: 12 }}>
                <div>
                  <dt style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-text)", marginBottom: 4 }}>Produk</dt>
                  <dd style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "var(--dark-text)", wordBreak: "break-word" }}>
                    {confirmState.product?.nama || "—"}
                  </dd>
                </div>
                {confirmState.kategori ? (
                  <div>
                    <dt style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-text)", marginBottom: 4 }}>Kategori</dt>
                    <dd style={{ margin: 0, fontSize: "0.875rem", color: "var(--dark-text)" }}>{confirmState.kategori}</dd>
                  </div>
                ) : null}
                <div>
                  <dt style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-text)", marginBottom: 4 }}>Paket / harga</dt>
                  <dd style={{ margin: 0, fontSize: "0.875rem", color: "var(--dark-text)", lineHeight: 1.45 }}>{confirmState.bundleLabel}</dd>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 12,
                    borderTop: "1px dashed var(--gray-border, #e9ecef)",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <dt style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "var(--gray-text)" }}>Total</dt>
                  <dd style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--primary, #ea580c)", fontVariantNumeric: "tabular-nums" }}>
                    {formatRp(confirmState.harga)}
                  </dd>
                </div>
              </dl>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sumber-input" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--dash-text-dark, #252f40)" }}>
                Sumber / Keterangan (Opsional)
              </label>
              <select
                id="sumber-input"
                value={sumberOrder}
                onChange={(e) => setSumberOrder(e.target.value)}
                disabled={confirmSubmitting}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--gray-border, #e9ecef)",
                  fontSize: "0.875rem",
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#fff",
                }}
              >
                <option value="">-- Pilih Sumber --</option>
                <option value="leadig">sosmedtp</option>
                <option value="leadig">sosmedda</option>
                <option value="lpwa">lpwa</option>
                <option value="lainnya">Lainnya (Input manual)</option>
              </select>
              {sumberOrder === "lainnya" && (
                <input
                  type="text"
                  value={sumberManual}
                  onChange={(e) => setSumberManual(e.target.value)}
                  placeholder="Ketik sumber di sini..."
                  disabled={confirmSubmitting}
                  style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--gray-border, #e9ecef)",
                    fontSize: "0.875rem",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={closeConfirmOrder} disabled={confirmSubmitting}>
              Batal
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={submitConfirmedOrder}
              disabled={confirmSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minWidth: 160,
                justifyContent: "center",
              }}
            >
              {confirmSubmitting ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null}
              {confirmSubmitting ? "Memproses…" : "Ya, buat order"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <Layout title="Order Cepat" description="Input nama & WA, lalu buat order per produk">
      <div
        ref={topAnchorRef}
        className="sales-page-root quick-order-root"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1rem 2rem" }}
      >
        <header className="quick-order-header" style={{ marginBottom: "1.5rem" }}>
          <div
            className="quick-order-header-row"
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--accent-primary-light, rgba(251, 133, 0, 0.12))",
                display: "grid",
                placeItems: "center",
                color: "var(--accent-primary, #fb8500)",
              }}
            >
              <Zap size={22} />
            </div>
            <div className="quick-order-title-block">
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--dash-text-dark, #252f40)", margin: 0 }}>
                Order Cepat
              </h1>
              <p style={{ margin: "4px 0 0", color: "var(--dash-muted, #67748e)", fontSize: "0.875rem" }}>
                Produk aktif, harga mengikuti produk atau paket bundle yang dipilih.
              </p>
            </div>
          </div>
        </header>

        <section style={{ marginBottom: "1.35rem" }}>
          <h2
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              margin: "0 0 0.65rem",
              color: "var(--dash-muted-strong, #495057)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Data pembeli
          </h2>
          <div
            className="quick-order-buyer-row"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "1rem 1.25rem",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: "0.8125rem",
                fontWeight: 500,
                flex: "1 1 240px",
                minWidth: 0,
              }}
            >
              Nama
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap"
                autoComplete="name"
                disabled={importRunning}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--dash-border, #e9ecef)",
                  fontSize: "0.9375rem",
                  width: "100%",
                  boxSizing: "border-box",
                  opacity: importRunning ? 0.7 : 1,
                }}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: "0.8125rem",
                fontWeight: 500,
                flex: "1 1 240px",
                minWidth: 0,
              }}
            >
              No. telepon / WhatsApp
              <input
                type="tel"
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                placeholder="08…"
                autoComplete="tel"
                disabled={importRunning}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--dash-border, #e9ecef)",
                  fontSize: "0.9375rem",
                  width: "100%",
                  boxSizing: "border-box",
                  opacity: importRunning ? 0.7 : 1,
                }}
              />
            </label>
          </div>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "0.85rem",
            }}
          >
            <Package size={18} color="var(--dash-muted-strong, #495057)" aria-hidden />
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--dash-text-dark, #252f40)" }}>
              Produk aktif
            </h2>
          </div>

          <section className="quick-order-toolbar" style={{ marginBottom: "1rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="quick-order-search-wrap" role="search" style={{ flex: "1 1 280px" }}>
              <Search className="quick-order-search-icon" size={18} strokeWidth={2} aria-hidden />
              <input
                type="search"
                className="quick-order-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama produk…"
                aria-label="Cari produk"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              disabled={importRunning}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--dash-border, #e9ecef)",
                background: "#fff",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: importRunning ? "not-allowed" : "pointer",
                color: "var(--dash-text-dark, #252f40)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
              title="Upload massal via CSV"
            >
              <Upload size={16} aria-hidden />
              Upload massal
            </button>
          </section>

          {loadingList ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--dash-muted)", padding: "2rem 0", justifyContent: "center" }}>
              <Loader2 className="animate-spin" size={22} />
              Memuat produk…
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ color: "var(--dash-muted)", margin: 0, padding: "1.5rem 0", textAlign: "center" }}>
              Tidak ada produk aktif yang cocok.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((prod) => {
                const bundles = getBundles(prod);
                const pid = String(prod.id);
                const sel = bundleByProduct[pid] || "";
                const price = priceForProduct(prod, sel);
                const submittingThis = orderingId === prod.id;
                const listDisabled = Boolean(confirmState) || submittingThis || importRunning;

                return (
                  <div
                    key={prod.id}
                    className="quick-order-product-card"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "12px 16px",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "1px solid var(--dash-border, #e9ecef)",
                      background: "var(--dash-surface, #fff)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--dash-text-dark)", marginBottom: 4 }}>{prod.nama}</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--dash-muted)" }}>
                        Harga order: <strong style={{ color: "var(--dash-text)" }}>{formatRp(price)}</strong>
                        {prod.kategori_rel?.nama ? ` · ${prod.kategori_rel.nama}` : ""}
                      </div>
                      {bundles.length > 0 && (
                        <label style={{ display: "block", marginTop: 10, fontSize: "0.75rem", fontWeight: 500, color: "var(--dash-muted-strong)" }}>
                          Paket bundle
                          <select
                            value={sel}
                            onChange={(e) => setBundleFor(prod.id, e.target.value)}
                            disabled={listDisabled}
                            style={{
                              display: "block",
                              width: "100%",
                              maxWidth: 360,
                              marginTop: 6,
                              padding: "8px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--dash-border)",
                              fontSize: "0.875rem",
                              background: "#fff",
                            }}
                          >
                            <option value="">Harga dasar produk</option>
                            {bundles.map((b) => (
                              <option key={b.id} value={String(b.id)}>
                                {b.nama} — {formatRp(b.harga)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <button
                      type="button"
                      className="quick-order-order-btn"
                      onClick={() => openConfirmOrder(prod)}
                      disabled={listDisabled}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 10,
                        border: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        cursor: submittingThis ? "wait" : listDisabled ? "not-allowed" : "pointer",
                        background: "var(--accent-primary, #fb8500)",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        alignSelf: "center",
                        opacity: listDisabled ? 0.72 : 1,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {submittingThis ? <Loader2 className="animate-spin" size={16} /> : null}
                      Buat order
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {confirmModal}
      {importModal}

      <button
        type="button"
        className="quick-order-scroll-fab"
        onClick={scrollToTopSmooth}
        aria-label="Kembali ke atas"
        title="Kembali ke atas"
        style={{
          position: "fixed",
          right: "max(1rem, env(safe-area-inset-right, 0px))",
          bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
          zIndex: 90,
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          background: "var(--accent-primary, #fb8500)",
          color: "#fff",
          boxShadow: "0 10px 28px rgba(251, 133, 0, 0.35)",
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? "auto" : "none",
          transform: showScrollTop ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        <ChevronUp size={24} strokeWidth={2.5} aria-hidden />
      </button>
    </Layout>
  );
}
