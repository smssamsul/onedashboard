"use client";

import { useEffect, useMemo, useState, useCallback, memo } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { FileText, CheckCircle, Settings } from "lucide-react";
import { getFollowupTemplates } from "@/lib/followup";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/followup.css";

// Lazy load modals
const AddFollowupModal = dynamic(() => import("./addFollowup"), { ssr: false });
const EditFollowupModal = dynamic(() => import("./editFollowup"), { ssr: false });
const DeleteFollowupModal = dynamic(() => import("./deleteFollowup"), { ssr: false });
const ViewFollowup = dynamic(() => import("./viewFollowup"), { ssr: false });

export default function AdminFollowupPage() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showView, setShowView] = useState(false);
  const [searchInput, setSearchInput] = useState("");

useEffect(() => {
  const loadFollowups = async () => {
    try {
      const res = await getFollowupTemplates();
      if (res.success && Array.isArray(res.data)) {
        // Map data API ke struktur lokal yang dipakai komponen
        const mapped = res.data.map((f) => ({
          id: f.id,
          kode: f.nama,
          event: f.event,
          text: f.text,
          status: f.status,
        }));
        setTemplates(mapped);
      }
    } catch (err) {
      console.error("Gagal memuat data followup:", err);
    }
  };
  loadFollowups();
}, []);

  // === Handlers ===
  const handleAdd = () => setShowAdd(true);
  const handleSaveAdd = (newData) => {
    setTemplates((prev) => [
      ...prev,
      { ...newData, id: prev.length + 1, status: "1" },
    ]);
    setShowAdd(false);
  };
  const handleCloseAdd = () => setShowAdd(false);

  const handleView = (data) => {
    setSelected(data);
    setShowView(true);
  };
  const handleCloseView = () => {
    setShowView(false);
    setSelected(null);
  };

  const handleEdit = (data) => {
    setSelected(data);
    setShowEdit(true);
  };
  const handleSaveEdit = (updated) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, ...updated } : t))
    );
    setShowEdit(false);
    setSelected(null);
  };
  const handleCloseEdit = () => {
    setShowEdit(false);
    setSelected(null);
  };

  const handleDelete = (data) => {
    setSelected(data);
    setShowDelete(true);
  };
  const handleConfirmDelete = () => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selected.id ? { ...t, status: "0" } : t
      )
    );
    setShowDelete(false);
    setSelected(null);
  };
  const handleCloseDelete = () => {
    setShowDelete(false);
    setSelected(null);
  };

  const filteredTemplates = useMemo(() => {
    const active = templates.filter(
      (t) => t.status === "1" || t.status === "A" || t.status === "active"
    );
    if (!searchInput.trim()) return active;
    const term = searchInput.trim().toLowerCase();
    return active.filter((t) =>
      [t.kode, t.event, t.text].some((field) =>
        field?.toLowerCase().includes(term)
      )
    );
  }, [templates, searchInput]);

  const summaryCards = [
    {
      label: "Total templates",
      value: templates.length,
      accent: "accent-indigo",
      icon: <FileText size={22} />,
    },
    {
      label: "Active templates",
      value: filteredTemplates.length,
      accent: "accent-emerald",
      icon: <CheckCircle size={22} />,
    },
    {
      label: "Pending edits",
      value: templates.filter((t) => t.status !== "1").length,
      accent: "accent-amber",
      icon: <Settings size={22} />,
    },
  ];

  const COLUMNS = ["#", "Template", "Detail", "Actions"];

  return (
    <Layout title="Follow Up | One Dashboard">
      <div className="dashboard-shell followup-shell">
        <section className="dashboard-hero followup-hero">
          <div className="dashboard-hero__copy">
            <p className="dashboard-hero__eyebrow">Follow-up</p>
            <h2 className="dashboard-hero__title">Follow Up Templates</h2>
            <span className="dashboard-hero__meta">
              Kelola template broadcast WhatsApp dengan cepat dan konsisten.
            </span>
          </div>

          <div className="orders-toolbar">
            <div className="orders-search">
              <input
                type="search"
                placeholder="Cari template, event, atau konten"
                className="orders-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="orders-search__icon pi pi-search" />
            </div>
            <button
              className="orders-button orders-button--primary"
              onClick={handleAdd}
            >
              + Tambah Template
            </button>
          </div>
        </section>

        <section className="dashboard-summary orders-summary">
          {summaryCards.map((card) => (
            <article className="summary-card" key={card.label}>
              <div className={`summary-card__icon ${card.accent}`}>
                {card.icon}
              </div>
              <div>
                <p className="summary-card__label">{card.label}</p>
                <p className="summary-card__value">{card.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="panel orders-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Templates</p>
              <h3 className="panel__title">Daftar follow up aktif</h3>
            </div>
            <span className="panel__meta">{filteredTemplates.length} aktif</span>
          </div>

          <div className="orders-table__wrapper">
            <div className="orders-table followup-table">
              <div className="orders-table__head">
                {COLUMNS.map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </div>

              <div className="orders-table__body">
                {filteredTemplates.length ? (
                  filteredTemplates.map((t, index) => (
                    <div className="orders-table__row" key={t.id}>
                      <div className="orders-table__cell" data-label="#">
                        {index + 1}
                      </div>
                      <div
                        className="orders-table__cell orders-table__cell--strong"
                        data-label="Template"
                      >
                        <p className="followup-template__name">{t.kode}</p>
                        <p className="followup-template__event">{t.event}</p>
                      </div>
                      <div className="orders-table__cell" data-label="Detail">
                        <p className="followup-template__text">{t.text}</p>
                      </div>
                      <div
                        className="orders-table__cell orders-table__cell--actions"
                        data-label="Actions"
                      >
                        <button
                          className="orders-action-btn"
                          title="Lihat"
                          onClick={() => handleView(t)}
                        >
                          <i className="pi pi-eye" />
                        </button>
                        <button
                          className="orders-action-btn orders-action-btn--ghost"
                          title="Edit"
                          onClick={() => handleEdit(t)}
                        >
                          <i className="pi pi-pencil" />
                        </button>
                        <button
                          className="orders-action-btn orders-action-btn--danger"
                          title="Nonaktifkan"
                          onClick={() => handleDelete(t)}
                        >
                          <i className="pi pi-trash" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="orders-empty">
                    {templates.length
                      ? "Tidak ada template yang cocok."
                      : "Belum ada data."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* === MODALS === */}
        {showAdd && (
          <AddFollowupModal onClose={handleCloseAdd} onSave={handleSaveAdd} />
        )}
        {showEdit && (
          <EditFollowupModal
            template={selected}
            onClose={handleCloseEdit}
            onSave={handleSaveEdit}
          />
        )}
        {showDelete && (
          <DeleteFollowupModal
            template={selected}
            onClose={handleCloseDelete}
            onConfirm={handleConfirmDelete}
          />
        )}
        {showView && (
          <ViewFollowup template={selected} onClose={handleCloseView} />
        )}
      </div>
    </Layout>
  );
}
