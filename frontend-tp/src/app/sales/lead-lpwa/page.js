"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Plus, Edit2, Trash2, ShoppingCart, RefreshCw, X, Check, Loader2, ShoppingBag, User, Package } from "lucide-react";
import dynamic from "next/dynamic";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/leads.css";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";

const BASE_URL = "/api";

function cleanWaDigits(wa) {
  return String(wa || "").replace(/\D/g, "");
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

export default function LeadLpwaPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState(null);

  // Modals state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // Selected lead
  const [selectedLead, setSelectedLead] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nama: "",
    no_wa: "",
    produk_id: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch Products for dropdown
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/produk`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Leads LPWA
  const fetchLeads = useCallback(async (pageNumber = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      let salesId = "";
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.level !== "1" && user.level !== 1) { // If not leader, filter by own ID
          salesId = `&sales_id=${user.user}`;
        }
      }

      const res = await fetch(`${BASE_URL}/sales/lead-lpwa?page=${pageNumber}${salesId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
        setPaginationInfo(data.pagination);
      }
    } catch (err) {
      toastError("Gagal mengambil data Leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchLeads(1);
  }, [fetchLeads]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      let sales_id = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        sales_id = user.id;
      }
      const payload = { ...formData, sales_id };

      const res = await fetch(`${BASE_URL}/sales/lead-lpwa`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess("Leads berhasil ditambahkan");
        setShowAdd(false);
        setFormData({ nama: "", no_wa: "", produk_id: "" });
        fetchLeads(1);
      } else {
        toastError(data.message || "Gagal menambahkan data");
      }
    } catch (err) {
      toastError("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (lead) => {
    setSelectedLead(lead);
    setFormData({
      nama: lead.nama || "",
      no_wa: lead.no_wa || "",
      produk_id: lead.produk_id || ""
    });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/lead-lpwa/${selectedLead.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess("Leads berhasil diupdate");
        setShowEdit(false);
        fetchLeads(page);
      } else {
        toastError(data.message || "Gagal update data");
      }
    } catch (err) {
      toastError("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/lead-lpwa/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toastSuccess("Data berhasil dihapus");
        fetchLeads(page);
      } else {
        toastError("Gagal menghapus data");
      }
    } catch (err) {
      toastError("Terjadi kesalahan sistem");
    }
  };

  // ORDER FLOW
  const openOrderConfirm = (lead) => {
    setSelectedLead(lead);

    // Find product details
    const prod = products.find(p => p.id === lead.produk_id) || lead.produk;
    const harga = prod ? productBasePrice(prod) : 0;

    setConfirmState({
      product: prod,
      harga: harga,
      bundleId: ""
    });
  };

  const handleBundleChange = (e) => {
    const bId = e.target.value;
    const prod = confirmState.product;
    const newHarga = priceForProduct(prod, bId);
    setConfirmState({
      ...confirmState,
      bundleId: bId,
      harga: newHarga
    });
  };

  const handleOrderConfirm = async () => {
    if (!selectedLead || !confirmState) return;
    setConfirmSubmitting(true);

    try {
      const n = String(selectedLead.nama || "").trim();
      const w = String(selectedLead.no_wa || "").trim();
      const prodId = selectedLead.produk_id;
      const harga = confirmState.harga;
      const digits = cleanWaDigits(w);
      const email = `order_${digits || Date.now()}@quickorder.local`;

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/order-admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          nama: n,
          wa: w,
          email,
          alamat: "—",
          produk: prodId,
          harga: String(harga),
          ongkir: "0",
          total_harga: String(harga),
          sumber: "sales_quick_order",
          utm_source: "lpwa",
          bundling: confirmState.bundleId || "",
          notif: 1,
        })
      });

      const data = await res.json();
      if (data.success) {
        toastSuccess(data.message || "Order berhasil dibuat");
        setConfirmState(null);
        // Refresh leads to show order code
        fetchLeads(page);
      } else {
        toastError(data.message || "Gagal membuat order");
      }
    } catch (err) {
      toastError("Terjadi kesalahan sistem");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  return (
    <Layout role="sales">
      <div className="leads-shell p-4 md:p-6 lg:p-8 animate-fade-in pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 lg:mb-8 gap-4">
          <div className="flex items-center gap-4">
            {/* <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white shrink-0">
              <ShoppingBag size={24} />
            </div> */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight mb-1">
                Leads
              </h1>
              <p className="text-sm text-gray-500">
                Data calon customer yang berminat melalui chat WA
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => fetchLeads(1)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {/* <button
              onClick={() => setShowAdd(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-medium text-sm shadow-md shadow-indigo-600/20"
            >
              <Plus size={18} />
              <span>Tambah Lead</span>
            </button> */}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">No WA</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produk Diminati</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && leads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-500">
                      <Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={24} />
                      Memuat data...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-500">
                      Belum ada data Leads
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">{lead.nama || "-"}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{lead.no_wa || "-"}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {lead.produk ? lead.produk.nama : "-"}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {lead.sales ? lead.sales.nama : "-"}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(lead)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* Order Action */}
                          {lead.order_exists ? (
                            <button
                              onClick={() => router.push(`/sales/orders?search=${lead.order_code}`)}
                              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold border border-green-200 transition-colors"
                              title="Lihat Order"
                            >
                              {lead.order_code}
                            </button>
                          ) : (
                            <button
                              onClick={() => openOrderConfirm(lead)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors"
                            >
                              <ShoppingCart size={14} />
                              + Order
                            </button>
                          )}
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
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Menampilkan halaman {paginationInfo.current_page} dari {paginationInfo.last_page}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => { setPage(page - 1); fetchLeads(page - 1); }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={page === paginationInfo.last_page}
                  onClick={() => { setPage(page + 1); fetchLeads(page + 1); }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAdd || showEdit) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAdd(false); setShowEdit(false); }}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{showAdd ? "Tambah Leads" : "Edit Leads"}</h2>
              <button onClick={() => { setShowAdd(false); setShowEdit(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={showAdd ? handleAddSubmit : handleEditSubmit} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No WA</label>
                  <input
                    type="text"
                    name="no_wa"
                    value={formData.no_wa}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produk Diminati</label>
                  <select
                    name="produk_id"
                    value={formData.produk_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Pilih Produk</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setShowEdit(false); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirm Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => !confirmSubmitting && setConfirmState(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Konfirmasi order</h2>
              <button
                onClick={() => !confirmSubmitting && setConfirmState(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              {/* <p className="text-sm text-gray-500 mb-2">Periksa kembali data berikut sebelum order dikirim ke sistem.</p> */}

              {/* Pembeli Box */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="bg-gray-50/80 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                  <User size={14} className="text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">Pembeli</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Nama</label>
                    <p className="font-semibold text-gray-900">{selectedLead?.nama || "-"}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">WhatsApp / telepon</label>
                    <p className="font-medium text-gray-900">{selectedLead?.no_wa || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Produk & Pembayaran Box */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="bg-gray-50/80 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                  <Package size={14} className="text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">Produk & Pembayaran</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Produk</label>
                    <p className="font-semibold text-gray-900 leading-tight mt-0.5">{confirmState.product?.nama || "-"}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Kategori</label>
                    <p className="text-sm text-gray-800 mt-0.5">{confirmState.product?.kategori_rel?.nama || "Umum"}</p>
                  </div>

                  {/* Pilihan Bundling */}
                  {getBundles(confirmState.product).length > 0 && (
                    <div className="pt-2">
                      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Pilihan Bundling
                      </label>
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

                  {!getBundles(confirmState.product).length && (
                    <div>
                      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Paket / harga</label>
                      <p className="text-sm text-gray-800 mt-0.5">Harga dasar produk</p>
                    </div>
                  )}

                  <div className="border-t border-dashed border-gray-200 mt-3 pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-600">Total</span>
                    <span className="text-lg font-bold text-[#f26522]">{formatRp(confirmState.harga)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                disabled={confirmSubmitting}
                onClick={() => setConfirmState(null)}
                className="px-5 py-2.5 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
              >
                Batal
              </button>
              <button
                disabled={confirmSubmitting}
                onClick={handleOrderConfirm}
                className="px-6 py-2.5 flex items-center justify-center gap-2 text-white bg-[#f26522] hover:bg-[#d9561b] rounded-xl font-medium transition-colors disabled:opacity-50 text-sm shadow-sm"
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
