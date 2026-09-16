"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Plus, Search, X, User, Package, Loader2 } from "lucide-react";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads.css";
import "@/styles/sales/shared-table.css";
import { toastSuccess, toastError } from "@/lib/toast";

const BASE_URL = "/api";
const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const STATUS_PEMBAYARAN_MAP = {
  0: { label: "Unpaid", className: "bg-gray-100 text-gray-600" },
  null: { label: "Unpaid", className: "bg-gray-100 text-gray-600" },
  1: { label: "Waiting Approval", className: "bg-amber-100 text-amber-700" },
  2: { label: "Paid", className: "bg-green-100 text-green-700" },
  3: { label: "Rejected", className: "bg-red-100 text-red-700" },
  4: { label: "Partial Payment", className: "bg-sky-100 text-sky-700" },
};

function useDebouncedValue(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

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

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString).slice(0, 10);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function paymentBadge(status) {
  const key = status === null || status === undefined || status === "" ? null : Number(status);
  return STATUS_PEMBAYARAN_MAP[key] ?? STATUS_PEMBAYARAN_MAP[0];
}

export default function LeadUnpaidPage() {
  const tahunIni = new Date().getFullYear();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[1]);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 500);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/produk`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setProducts(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchCustomers = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({ tahun: String(tahunIni), page: String(pageNumber), per_page: String(perPage) });
        if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());

        const res = await fetch(`${BASE_URL}/sales/order/unpaid-leads-tahun-ini?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
          setPaginationInfo(data.pagination);
        }
      } catch (err) {
        toastError("Gagal mengambil data lead unpaid");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, tahunIni, perPage]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
    fetchCustomers(1);
  }, [debouncedSearch, perPage, fetchCustomers]);

  useEffect(() => {
    if (page > 1) fetchCustomers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openOrderConfirm = (customer) => {
    setSelectedCustomer(customer);
    setProductSearch("");
    setConfirmState({ product: null, harga: 0, bundleId: "" });
  };

  const selectOrderProduct = (prod) => {
    setConfirmState((prev) => ({ ...prev, product: prod, harga: productBasePrice(prod), bundleId: "" }));
  };

  const handleBundleChange = (e) => {
    const bId = e.target.value;
    const newHarga = priceForProduct(confirmState.product, bId);
    setConfirmState({ ...confirmState, bundleId: bId, harga: newHarga });
  };

  const handleOrderConfirm = async () => {
    if (!selectedCustomer || !confirmState || !confirmState.product) return;
    setConfirmSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/order-admin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          customer: selectedCustomer.id,
          produk: confirmState.product.id,
          harga: String(confirmState.harga),
          ongkir: "0",
          total_harga: String(confirmState.harga),
          sumber: "sales_quick_order",
          bundling: confirmState.bundleId || "",
          notif: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess(data.message || "Order berhasil dibuat");
        setConfirmState(null);
        setSelectedCustomer(null);
        fetchCustomers(page);
      } else {
        toastError(data.message || "Gagal membuat order");
      }
    } catch (err) {
      toastError("Terjadi kesalahan saat membuat order");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  return (
    <Layout title={`Lead Unpaid ${tahunIni}`}>
      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Lead Unpaid {tahunIni}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customer yang sudah pernah order tahun ini tapi belum Paid / Waiting Approval - perlu di-follow-up untuk bayar.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 mb-4 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama / nomor WA..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Tampilkan</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>data</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Memuat...</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Tidak ada lead unpaid untuk tahun {tahunIni}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2.5 px-4 font-medium">Customer</th>
                    <th className="py-2.5 px-4 font-medium">Sales</th>
                    <th className="py-2.5 px-4 font-medium">Histori Pembelian</th>
                    <th className="py-2.5 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-50 align-top">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{customer.nama || "Tanpa nama"}</div>
                        <div className="text-xs text-gray-500">{customer.wa || "-"}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{customer.sales_nama || "-"}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {(customer.orders_history || []).map((o, idx) => {
                          const badge = paymentBadge(o.status_pembayaran);
                          return (
                            <span key={o.id} className="inline-block whitespace-nowrap mr-2">
                              {idx > 0 && <span className="text-gray-300 mr-2">|</span>}
                              {o.produk_nama} · {formatRp(o.total_harga)} · {formatDate(o.tanggal)}{" "}
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
                            </span>
                          );
                        })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openOrderConfirm(customer)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors"
                        >
                          <Plus size={14} /> Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {paginationInfo && paginationInfo.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>
                Halaman {paginationInfo.current_page} dari {paginationInfo.last_page} ({paginationInfo.total} customer)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= paginationInfo.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Confirm Modal - sama seperti di menu Leads */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => !confirmSubmitting && setConfirmState(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Konfirmasi order</h2>
              <button onClick={() => !confirmSubmitting && setConfirmState(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="bg-gray-50/80 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                  <User size={14} className="text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">Pembeli</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Nama</label>
                    <p className="font-semibold text-gray-900">{selectedCustomer?.nama || "-"}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">WhatsApp / telepon</label>
                    <p className="font-medium text-gray-900">{selectedCustomer?.wa || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="bg-gray-50/80 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                  <Package size={14} className="text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">Produk & Pembayaran</span>
                </div>

                {!confirmState.product ? (
                  <div className="p-4 space-y-3">
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Cari & pilih produk</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ketik nama produk..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                      {products
                        .filter((p) => !productSearch.trim() || p.nama.toLowerCase().includes(productSearch.trim().toLowerCase()))
                        .slice(0, 50)
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => selectOrderProduct(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-3"
                          >
                            <span className="text-sm text-gray-800">{p.nama}</span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{formatRp(productBasePrice(p))}</span>
                          </button>
                        ))}
                      {products.filter((p) => !productSearch.trim() || p.nama.toLowerCase().includes(productSearch.trim().toLowerCase())).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">Produk tidak ditemukan</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Produk</label>
                        <p className="font-semibold text-gray-900 leading-tight mt-0.5">{confirmState.product?.nama || "-"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmState((prev) => ({ ...prev, product: null, bundleId: "", harga: 0 }))}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                      >
                        Ganti produk
                      </button>
                    </div>

                    {getBundles(confirmState.product).length > 0 && (
                      <div className="pt-2">
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Pilihan Bundling</label>
                        <select
                          value={confirmState.bundleId}
                          onChange={handleBundleChange}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        >
                          <option value="">Harga dasar produk</option>
                          {getBundles(confirmState.product).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nama} - {formatRp(b.harga)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="border-t border-dashed border-gray-200 mt-3 pt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">Total</span>
                      <span className="text-lg font-bold text-[var(--color-primary-main)]">{formatRp(confirmState.harga)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                disabled={confirmSubmitting}
                onClick={() => setConfirmState(null)}
                className="px-5 py-2.5 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
              >
                Batal
              </button>
              <button
                disabled={confirmSubmitting || !confirmState.product}
                onClick={handleOrderConfirm}
                className="px-6 py-2.5 flex items-center justify-center gap-2 text-white bg-[var(--color-primary-main)] hover:bg-[var(--color-primary-dark)] rounded-xl font-medium transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {confirmSubmitting && <Loader2 size={16} className="animate-spin" />}
                Ya, buat order
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
