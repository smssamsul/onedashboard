"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { Mail, Link2, Trash2 } from "lucide-react";
import { getInvitations, createInvitation, deleteInvitation } from "@/lib/sales/invitation";
import { getQuickOrderProducts } from "@/lib/sales/products";
import { toastSuccess, toastError } from "@/lib/toast";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

const AddInvitationModal = dynamic(() => import("./addInvitation"), { ssr: false });
const GenerateLinkModal = dynamic(() => import("./generateLinkModal"), { ssr: false });

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function InvitationPage() {
  const [invitations, setInvitations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [produkList, setProdukList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerateLink, setShowGenerateLink] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [filterProduk, setFilterProduk] = useState("");
  const hasActiveFilter = Boolean(debouncedSearch.trim() || filterProduk);

  const loadInvitations = useCallback(async (pageNum = 1, filters = {}) => {
    setLoading(true);
    const result = await getInvitations(pageNum, 15, filters);
    setInvitations(result.data);
    setMeta(result.meta);
    setLoading(false);
  }, []);

  const activeFilters = {
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    ...(filterProduk ? { produk: filterProduk } : {}),
  };

  useEffect(() => {
    loadInvitations(page, activeFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loadInvitations, debouncedSearch, filterProduk]);

  // Setiap filter berubah, balik ke halaman 1 supaya tidak nyangkut di halaman kosong
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterProduk]);

  const resetFilters = () => {
    setSearchInput("");
    setFilterProduk("");
  };

  useEffect(() => {
    getQuickOrderProducts().then((list) => setProdukList(Array.isArray(list) ? list : [])).catch(() => setProdukList([]));
  }, []);

  const handleSaveAdd = async (payload) => {
    try {
      await createInvitation(payload);
      toastSuccess("Invitation berhasil ditambahkan");
      setShowAdd(false);
      setPage(1);
      loadInvitations(1, activeFilters);
    } catch (err) {
      toastError(err.message || "Gagal menambahkan invitation");
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Hapus invitation untuk ${inv.customer_rel?.nama || "peserta ini"}?`)) return;
    try {
      await deleteInvitation(inv.id);
      toastSuccess("Invitation dihapus");
      loadInvitations(page, activeFilters);
    } catch (err) {
      toastError(err.message || "Gagal menghapus invitation");
    }
  };

  return (
    <Layout title="Invitation">
      <div className="dashboard-shell customers-shell table-shell">
        <section className="dashboard-summary kategori-summary">
          <article className="summary-card summary-card--combined summary-card--two-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Mail size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total invitation</p>
                <p className="summary-card__value">{meta?.total ?? invitations.length}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="panel users-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Daftar Invitation</h3>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="customers-button customers-button--secondary" onClick={() => setShowGenerateLink(true)}>
                <Link2 size={16} /> Generate Link
              </button>
              <button className="customers-button customers-button--primary" onClick={() => setShowAdd(true)}>
                + Tambah Manual
              </button>
            </div>
          </div>

          <div className="customers-toolbar" style={{ padding: "0 1.5rem 1rem" }}>
            <div className="customers-search">
              <input
                type="search"
                placeholder="Cari nama, WA, atau email peserta"
                className="customers-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="customers-search__icon pi pi-search" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <select
                value={filterProduk}
                onChange={(e) => setFilterProduk(e.target.value)}
                style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--dash-border)", fontSize: "0.85rem" }}
              >
                <option value="">Semua Produk</option>
                {produkList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
              {hasActiveFilter && (
                <button className="customers-button customers-button--secondary" onClick={resetFilters}>
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Customer</th>
                  <th>Produk</th>
                  <th>Referral</th>
                  <th>Sumber</th>
                  <th>Kode</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="table-empty">Memuat data...</td></tr>
                ) : invitations.length > 0 ? (
                  invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.create_at ? new Date(inv.create_at).toLocaleDateString("id-ID") : "-"}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{inv.customer_rel?.nama || "-"}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{inv.customer_rel?.wa || "-"}</div>
                      </td>
                      <td>{inv.produk_rel?.nama || "-"}</td>
                      <td>{inv.referral_rel?.nama || "-"}</td>
                      <td>{inv.sumber || "-"}</td>
                      <td>{inv.kode_invitation}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="action-btn action-btn--danger"
                          title="Hapus invitation"
                          onClick={() => handleDelete(inv)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="table-empty">Belum ada invitation.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="customers-pagination">
              <button
                className="customers-pagination__btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <i className="pi pi-chevron-left" />
              </button>
              <span className="customers-pagination__info">
                Page {meta.current_page} of {meta.last_page} ({meta.total} total)
              </span>
              <button
                className="customers-pagination__btn"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
              >
                <i className="pi pi-chevron-right" />
              </button>
            </div>
          )}
        </section>

        {showAdd && (
          <AddInvitationModal
            produkList={produkList}
            onClose={() => setShowAdd(false)}
            onSave={handleSaveAdd}
          />
        )}

        {showGenerateLink && (
          <GenerateLinkModal
            produkList={produkList}
            onClose={() => setShowGenerateLink(false)}
          />
        )}
      </div>
    </Layout>
  );
}
