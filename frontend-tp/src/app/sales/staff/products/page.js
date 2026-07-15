"use client";

import { useEffect, useMemo, useState, memo, useCallback } from "react";
import Layout from "@/components/Layout";
import { useProducts } from "@/hooks/sales/useProducts";
import { useRouter } from "next/navigation";
import { Package, CheckCircle, Search } from "lucide-react";
import DeleteProductModal from "./deleteProductModal";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";

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

  // State untuk modal hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

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
    return products.filter((p) => {
      if (!term) return true;
      return (
        p.nama?.toLowerCase().includes(term) ||
        p.kategori_rel?.nama?.toLowerCase().includes(term) ||
        p.user_rel?.nama?.toLowerCase().includes(term)
      );
    });
  }, [products, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const formatPrice = useCallback((price) => {
    if (!price) return "Rp 0";
    return `Rp ${parseInt(price).toLocaleString("id-ID")}`;
  }, []);

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
      return <span className="customers-verif-tag is-verified">Active</span>;
    }
    return <span className="customers-verif-tag is-unverified">Inactive</span>;
  }, []);

  return (
    <Layout title="Manage Products">
      <div className="dashboard-shell customers-shell">
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

        <section className="dashboard-summary products-summary">
          <article className="summary-card summary-card--combined summary-card--three-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Package size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total products</p>
                <p className="summary-card__value">{products.length}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="summary-card__label">Active products</p>
                <p className="summary-card__value">{products.filter((p) => p.status === "1").length}</p>
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

          <div className="products-table__wrapper">
            <div className="products-table">
              <div className="products-table__head">
                <span>Product</span>
                <span>Price</span>
                <span>Revenue</span>
                <span>Category</span>
                <span>Status</span>
                <span>Event Date</span>
                <span>Created By</span>
                <span>Assign By</span>
                <span>Created At</span>
              </div>
              <div className="products-table__body">
                {loading ? (
                  <p className="products-empty">Loading data...</p>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((p, i) => (
                    <div className="products-table__row" key={p.id}>

                      <div className="products-table__cell products-table__cell--strong" data-label="Product">
                        <div className="product-table__info">
                          <span
                            className="product-table__name"
                            onClick={() => router.push(`/sales/staff/products/view/${p.id}`)}
                          >
                            {p.nama || "-"}
                          </span>
                          <div className="product-table__actions">
                            <button
                              className="product-table__action-link"
                              onClick={() => {
                                // Generate slug dari nama jika kode tidak ada atau tidak valid
                                const generateSlug = (text) =>
                                  (text || "")
                                    .toString()
                                    .toLowerCase()
                                    .trim()
                                    .replace(/[^a-z0-9 -]/g, "")
                                    .replace(/\s+/g, "-")
                                    .replace(/-+/g, "-");
                                
                                let kodeProduk = p.kode || (p.url ? p.url.replace(/^\//, '') : null);
                                
                                // Jika kode mengandung spasi atau karakter tidak valid, generate ulang dari nama
                                if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
                                  kodeProduk = generateSlug(p.nama);
                                }
                                
                                if (kodeProduk) {
                                  window.open(`/landing/${kodeProduk}`, '_blank');
                                } else {
                                  alert('Kode produk tidak tersedia');
                                }
                              }}
                            >
                              Review
                            </button>
                            <button
                              className="product-table__action-link"
                              onClick={() => router.push(`/sales/staff/products/view/${p.id}`)}
                            >
                              Detail
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="products-table__cell" data-label="Price">
                        {formatPrice(p.harga_asli)}
                      </div>
                      <div
                        className="products-table__cell products-table__cell--revenue"
                        data-label="Revenue"
                      >
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
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  color: "#0f172a",
                                }}
                              >
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
                      </div>
                      <div className="products-table__cell" data-label="Category">
                        {p.kategori_rel?.nama || "-"}
                      </div>
                      <div className="products-table__cell" data-label="Status">
                        {getStatusBadge(p.status)}
                      </div>
                      <div className="products-table__cell" data-label="Event Date">
                        {(() => {
                          const jadwalArr = p.jadwal_rel || [];
                          if (jadwalArr.length > 0) {
                            const firstJadwal = jadwalArr[0];
                            return formatDate(firstJadwal.waktu_mulai);
                          }
                          return formatDate(p.tanggal_event);
                        })()}
                      </div>
                      <div className="products-table__cell" data-label="Created By">
                        {p.user_rel?.nama || "-"}
                      </div>
                      <div className="products-table__cell" data-label="Assign By">
                        {p.assign_rel && p.assign_rel.length > 0
                          ? p.assign_rel.map((u) => u.nama).join(", ")
                          : "-"}
                      </div>
                      <div className="products-table__cell" data-label="Created At">
                        {formatDate(p.create_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="products-empty">
                    {products.length ? "Tidak ada hasil pencarian." : "Belum ada produk."}
                  </p>
                )}
              </div>
            </div>
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
