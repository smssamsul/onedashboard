"use client";

import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { Building2, Search } from "lucide-react";
import useUnitBisnis from "@/hooks/sales/useUnitBisnis";
import { toastSuccess, toastError } from "@/lib/toast";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

const AddUnitBisnisModal = dynamic(() => import("./addUnitBisnis"), { ssr: false });
const EditUnitBisnisModal = dynamic(() => import("./editUnitBisnis"), { ssr: false });
const DeleteUnitBisnisModal = dynamic(() => import("./deleteUnitBisnis"), { ssr: false });

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function UnitBisnisPage() {
  const { unitBisnis, addUnitBisnis, updateUnitBisnis, deleteUnitBisnis, loading } = useUnitBisnis();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const filteredList = unitBisnis.filter((u) => {
      if (!term) return true;
      return u.nama?.toLowerCase().includes(term) || u.slug?.toLowerCase().includes(term);
    });
    return filteredList.sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [unitBisnis, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleAdd = () => setShowAdd(true);

  const handleSaveAdd = async (newData) => {
    try {
      const result = await addUnitBisnis(newData.nama);
      setShowAdd(false);
      if (result) {
        toastSuccess("Unit bisnis berhasil ditambahkan!");
      } else {
        toastError("Gagal menambah unit bisnis!");
      }
    } catch (err) {
      toastError("Gagal menambah unit bisnis!");
    }
  };

  const handleEdit = (u) => {
    setSelected(u);
    setShowEdit(true);
  };

  const handleSaveEdit = async (updated) => {
    try {
      const result = await updateUnitBisnis(selected.id, updated.nama);
      setShowEdit(false);
      setSelected(null);
      if (result) {
        toastSuccess("Unit bisnis berhasil diperbarui!");
      } else {
        toastError("Gagal mengedit unit bisnis!");
      }
    } catch (err) {
      toastError("Gagal mengedit unit bisnis!");
    }
  };

  const handleDelete = (u) => {
    setSelected(u);
    setShowDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const result = await deleteUnitBisnis(selected.id);
      setShowDelete(false);
      setSelected(null);
      if (result) {
        toastSuccess("Unit bisnis berhasil dihapus!");
      } else {
        toastError("Gagal menghapus unit bisnis!");
      }
    } catch (err) {
      toastError("Gagal menghapus unit bisnis!");
    }
  };

  if (loading)
    return (
      <Layout title="Loading...">
        <div className="dashboard-shell">
          <p className="products-empty">Memuat data unit bisnis...</p>
        </div>
      </Layout>
    );

  return (
    <Layout title="Unit Bisnis">
      <div className="dashboard-shell customers-shell table-shell">
        <section className="dashboard-summary kategori-summary">
          <article className="summary-card summary-card--combined summary-card--two-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Building2 size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total unit bisnis</p>
                <p className="summary-card__value">{unitBisnis.length}</p>
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
                placeholder="Cari unit bisnis..."
                className="customers-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="customers-search__icon pi pi-search" />
            </div>
          </div>
        </section>

        <section className="panel users-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Unit bisnis roster</h3>
              <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
                Dipakai untuk filter halaman jadwal seminar publik per unit bisnis
                (/product/jadwal-seminar/slug-nya).
              </p>
            </div>
            <button className="customers-button customers-button--primary" onClick={handleAdd}>
              + Tambah Unit Bisnis
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table" style={{ minWidth: "auto" }}>
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>#</th>
                  <th>NAMA UNIT BISNIS</th>
                  <th>SLUG (URL)</th>
                  <th style={{ width: "160px", textAlign: "right" }}>JUMLAH PRODUK</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((u, i) => (
                    <tr key={u.id}>
                      <td>{startIndex + i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{u.nama}</td>
                      <td>
                        <code style={{ fontSize: "0.8rem", color: "#6b7280" }}>{u.slug}</code>
                      </td>
                      <td style={{ textAlign: "right" }}>{u.produk_count ?? 0}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button className="action-btn" title="Edit unit bisnis" onClick={() => handleEdit(u)}>
                            <i className="pi pi-pencil" />
                          </button>
                          <button
                            className="action-btn action-btn--danger"
                            title="Hapus unit bisnis"
                            onClick={() => handleDelete(u)}
                          >
                            <i className="pi pi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      {unitBisnis.length ? "Tidak ada hasil pencarian." : "Belum ada unit bisnis."}
                    </td>
                  </tr>
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

        {showAdd && <AddUnitBisnisModal onClose={() => setShowAdd(false)} onSave={handleSaveAdd} />}
        {showEdit && (
          <EditUnitBisnisModal unitBisnis={selected} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} />
        )}
        {showDelete && (
          <DeleteUnitBisnisModal
            unitBisnis={selected}
            onClose={() => setShowDelete(false)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    </Layout>
  );
}
