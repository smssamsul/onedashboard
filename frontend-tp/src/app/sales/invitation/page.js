"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { Mail, Copy, Search, Trash2 } from "lucide-react";
import { getInvitations, createInvitation, deleteInvitation } from "@/lib/sales/invitation";
import { getQuickOrderProducts } from "@/lib/sales/products";
import { getCustomers } from "@/lib/sales/customer";
import { toastSuccess, toastError } from "@/lib/toast";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

const AddInvitationModal = dynamic(() => import("./addInvitation"), { ssr: false });

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

  // Link generator state
  const [genProdukId, setGenProdukId] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const debouncedRefSearch = useDebouncedValue(refSearch);
  const [refResults, setRefResults] = useState([]);
  const [refCustomer, setRefCustomer] = useState(null);
  const [searchingRef, setSearchingRef] = useState(false);

  const loadInvitations = useCallback(async (pageNum = 1) => {
    setLoading(true);
    const result = await getInvitations(pageNum, 15);
    setInvitations(result.data);
    setMeta(result.meta);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvitations(page);
  }, [page, loadInvitations]);

  useEffect(() => {
    getQuickOrderProducts().then((list) => setProdukList(Array.isArray(list) ? list : [])).catch(() => setProdukList([]));
  }, []);

  useEffect(() => {
    if (!debouncedRefSearch.trim()) {
      setRefResults([]);
      return;
    }
    setSearchingRef(true);
    getCustomers(1, 5, { search: debouncedRefSearch.trim() })
      .then((res) => setRefResults(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setRefResults([]))
      .finally(() => setSearchingRef(false));
  }, [debouncedRefSearch]);

  const selectedProdukForLink = produkList.find((p) => String(p.id) === String(genProdukId));
  const invitationLink = selectedProdukForLink?.kode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invitation/${selectedProdukForLink.kode}${refCustomer ? `?ref=${refCustomer.memberID}` : ""}`
    : "";

  const handleCopyLink = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    toastSuccess("Link undangan disalin ke clipboard");
  };

  const handleSaveAdd = async (payload) => {
    try {
      await createInvitation(payload);
      toastSuccess("Invitation berhasil ditambahkan");
      setShowAdd(false);
      loadInvitations(1);
      setPage(1);
    } catch (err) {
      toastError(err.message || "Gagal menambahkan invitation");
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Hapus invitation untuk ${inv.customer_rel?.nama || "peserta ini"}?`)) return;
    try {
      await deleteInvitation(inv.id);
      toastSuccess("Invitation dihapus");
      loadInvitations(page);
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
              <p className="panel__eyebrow">Link Generator</p>
              <h3 className="panel__title">Buat link undangan</h3>
            </div>
          </div>
          <div className="modal-body" style={{ padding: "0 1.5rem 1.5rem" }}>
            <div className="form-group full-width">
              <label>Produk</label>
              <select value={genProdukId} onChange={(e) => setGenProdukId(e.target.value)}>
                <option value="">-- Pilih Produk --</option>
                {produkList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width" style={{ position: "relative" }}>
              <label>Referral (opsional) — cari nama/WA customer</label>
              <input
                type="text"
                value={refCustomer ? `${refCustomer.nama} (${refCustomer.wa})` : refSearch}
                onChange={(e) => {
                  setRefCustomer(null);
                  setRefSearch(e.target.value);
                }}
                placeholder="Ketik nama atau nomor WA..."
              />
              {!refCustomer && refResults.length > 0 && (
                <div className="customers-search__dropdown" style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%", maxHeight: 200, overflowY: "auto" }}>
                  {refResults.map((c) => (
                    <div
                      key={c.id}
                      style={{ padding: "8px 12px", cursor: "pointer" }}
                      onClick={() => {
                        setRefCustomer(c);
                        setRefSearch("");
                        setRefResults([]);
                      }}
                    >
                      {c.nama} — {c.wa} {c.memberID ? `(${c.memberID})` : "(belum punya memberID)"}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {invitationLink && (
              <div className="form-group full-width">
                <label>Link Undangan</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" readOnly value={invitationLink} style={{ flex: 1 }} />
                  <button type="button" className="customers-button customers-button--primary" onClick={handleCopyLink}>
                    <Copy size={16} /> Copy
                  </button>
                </div>
                {refCustomer && !refCustomer.memberID && (
                  <p style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>
                    Customer ini belum punya memberID, referral tidak akan tercatat.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="panel users-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Daftar Invitation</h3>
            </div>
            <button className="customers-button customers-button--primary" onClick={() => setShowAdd(true)}>
              + Tambah Manual
            </button>
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
      </div>
    </Layout>
  );
}
