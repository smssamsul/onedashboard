"use client";

import { useEffect, useMemo, useState, memo, useCallback } from "react";
import Layout from "@/components/Layout";
import { useProducts } from "@/hooks/sales/useProducts";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/config/api";
import { Package, CheckCircle, Search } from "lucide-react";
import DeleteProductModal from "./deleteProductModal";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminProductsPage() {
  const { products, loading, error, handleDelete, handleDuplicate, setProducts } = useProducts();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const router = useRouter();

  // localStorage.user.id itu ID user_login (tabel auth), BUKAN User.id yang
  // dipakai di produk.assign - harus ambil dari /user/profile biar cocok.
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("user/profile"), {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const json = await res.json();
        if (json.success) setCurrentUserId(json.data.id);
      } catch (e) {
        console.error("Gagal memuat profile user:", e);
      }
    }
    loadProfile();
  }, []);

  // State untuk modal hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Staff sales cuma boleh lihat produk yang sign ke dirinya sendiri
  const myProducts = useMemo(() => {
    if (!currentUserId) return [];
    return products.filter((p) =>
      Array.isArray(p.assign_users) && p.assign_users.some((u) => Number(u.id) === Number(currentUserId))
    );
  }, [products, currentUserId]);

  // Handler untuk buka modal hapus
  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Handler setelah produk berhasil dihapus
  const handleProductDeleted = (deletedId) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return myProducts.filter((p) => {
      if (!term) return true;
      return (
        p.nama?.toLowerCase().includes(term) ||
        p.kategori_rel?.nama?.toLowerCase().includes(term) ||
        p.user_rel?.nama?.toLowerCase().includes(term)
      );
    });
  }, [myProducts, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const formatListRupiah = useCallback((value) => {
    const n = Math.round(Number(value ?? 0));
    if (Number.isNaN(n)) return "Rp 0";
    return `Rp ${n.toLocaleString("id-ID")}`;
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  }, []);

  const getStatusBadge = useCallback((status) => {
    if (status === "1") {
      return (
        <span style={{
          background: '#ecfdf5', color: '#059669', border: '1px solid #34d399',
          padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600
        }}>Active</span>
      );
    }
    return (
      <span style={{
        background: '#fef2f2', color: '#dc2626', border: '1px solid #f87171',
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600
      }}>Inactive</span>
    );
  }, []);

  const getAssignNames = useCallback((assignUsers) => {
    if (!Array.isArray(assignUsers) || assignUsers.length === 0) return "-";
    return assignUsers.map((u) => u.nama).join(", ");
  }, []);

  return (
    <Layout title="Manage Products">
      <div className="dashboard-shell customers-shell table-shell">
        <section className="dashboard-summary products-summary">
          <article className="summary-card summary-card--combined summary-card--three-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Package size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total products</p>
                <p className="summary-card__value">{myProducts.length}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="summary-card__label">Active products</p>
                <p className="summary-card__value">{myProducts.filter((p) => p.status === "1").length}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Search size={22} />
              </div>
              <div>
                <p className="summary-card__label">Filtered</p>
                <p className="summary-card__value">{filtered.length}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-hero customers-hero">
          <div className="customers-toolbar">
            <div className="customers-search">
              <input
                type="search"
                placeholder="Cari produk, kategori, atau pembuat"
                className="customers-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="customers-search__icon pi pi-search" />
            </div>
          </div>
        </section>

        <section className="panel products-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Product roster</h3>
            </div>
          </div>

          {error && (
            <div className="customers-error">
              <p>{error}</p>
            </div>
          )}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left-1" style={{ width: '250px', minWidth: '250px' }}>PRODUCT</th>
                  <th className="sticky-left-2" style={{ left: '250px' }}>CATEGORY</th>
                  <th style={{ minWidth: "150px", maxWidth: "200px" }}>REVENUE</th>
                  <th>STATUS</th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>JADWAL</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>CREATED</span>
                      <span>BY</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>ASSIGN</span>
                      <span>BY</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>CREATED</span>
                      <span>AT</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="table-empty">Loading data...</td></tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((p) => (
                    <tr key={p.id}>
                      <td className="sticky-left-1" style={{ width: '250px', minWidth: '250px' }}>
                        <div className="product-table__info">
                          <span
                            className="product-table__name"
                            style={{ display: 'block', fontWeight: 600, color: '#0ea5e9', cursor: 'pointer', marginBottom: '0.25rem' }}
                            onClick={() => router.push(`/sales/staff/products/view/${p.id}`)}
                          >
                            {p.nama || "-"}
                          </span>
                          <div className="product-table__actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="action-btn"
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => {
                                const generateSlug = (text) => (text || "").toString().toLowerCase().trim().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
                                let kodeProduk = p.kode || (p.url ? p.url.replace(/^\//, '') : null);
                                if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
                                  kodeProduk = generateSlug(p.nama);
                                }
                                if (kodeProduk) window.open(`/landing/${kodeProduk}`, '_blank');
                                else alert('Kode produk tidak tersedia');
                              }}
                            >
                              Review
                            </button>
                            <button
                              className="action-btn"
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => router.push(`/sales/staff/products/editProducts/${p.id}`)}
                            >
                              Edit
                            </button>
                            <button
                              className="action-btn action-btn--danger"
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => openDeleteModal(p)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="sticky-left-2" style={{ left: '250px' }}>{p.kategori_rel?.nama || "-"}</td>
                      <td style={{ whiteSpace: "normal", verticalAlign: "top" }}>
                        {(() => {
                          const revenue = Number(p.total_revenue ?? 0);
                          const pctRaw = p.fee_trainer;
                          const pct = Number(pctRaw);
                          const showTrainerFee =
                            pctRaw != null &&
                            pctRaw !== "" &&
                            Number.isFinite(pct) &&
                            pct > 0;
                          const trainerFeeRp = showTrainerFee
                            ? Math.round(revenue * (pct / 100))
                            : null;
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>
                                {formatListRupiah(revenue)}
                              </span>
                              {showTrainerFee && (
                                <span style={{ fontSize: "0.7rem", color: "#64748b", lineHeight: 1.35 }}>
                                  fee trainer ({pct.toFixed(1)}%) = {formatListRupiah(trainerFeeRp)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td>
                        {(() => {
                          const jadwalArr = p.jadwal_rel || [];
                          if (jadwalArr.length === 0) {
                            return <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>;
                          }
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {jadwalArr.map((j, idx) => (
                                <div key={idx} style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  background: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  minWidth: '130px',
                                }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0369a1', lineHeight: 1.3 }}>
                                    {j.nama_jadwal || `Jadwal ${idx + 1}`}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: '1px' }}>
                                    {j.waktu_mulai ? formatDate(j.waktu_mulai) : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td>{p.user_rel?.nama || "-"}</td>
                      <td>{getAssignNames(p.assign_users)}</td>
                      <td>{formatDate(p.create_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="table-empty">{myProducts.length ? "Tidak ada hasil pencarian." : "Belum ada produk yang sign ke Anda."}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="customers-pagination">
              <button
                className="customers-pagination__btn"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <i className="pi pi-chevron-left" />
              </button>
              <span className="customers-pagination__info">
                Page {currentPage} of {totalPages} ({filtered.length} total)
              </span>
              <button
                className="customers-pagination__btn"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <i className="pi pi-chevron-right" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modal Hapus Produk */}
      {showDeleteModal && productToDelete && (
        <DeleteProductModal
          product={productToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setProductToDelete(null);
          }}
          onDeleted={handleProductDeleted}
        />
      )}
    </Layout>
  );
}
