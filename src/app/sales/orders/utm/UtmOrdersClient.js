"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { getOrdersUtm } from "@/lib/sales/orders";
import { api } from "@/lib/api";
import "@/styles/sales/utm-orders.css";

const ViewOrdersLeader = dynamic(() => import("../viewOrders"), { ssr: false });
const ViewOrdersStaff = dynamic(() => import("../../staff/orders/viewOrders"), { ssr: false });

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatOrderDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}.${minutes}`;
  } catch {
    return "-";
  }
}

export default function UtmOrdersClient({ staffView = false }) {
  const ViewOrders = staffView ? ViewOrdersStaff : ViewOrdersLeader;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [selected, setSelected] = useState(() => new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showView, setShowView] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const menuRef = useRef(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getOrdersUtm(p, perPage, debouncedSearch);
      setRows(res.data || []);
      setPagination({
        current_page: res.current_page || p,
        last_page: res.last_page || 1,
        total: res.total ?? 0,
      });
      setPage(res.current_page || p);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [perPage, debouncedSearch]);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const allOnPageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected =
    allOnPageIds.length > 0 && allOnPageIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(allOnPageIds));
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDetail = async (id) => {
    setLoadingDetail(true);
    setOpenMenuId(null);
    try {
      const res = await api(`/sales/order/${id}`, { method: "GET", disableToast: true });
      const order = res.data;
      if (order) {
        setSelectedOrder(order);
        setShowView(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const hasMore = pagination.current_page < pagination.last_page;
  const canPrev = pagination.current_page > 1;

  return (
    <Layout title="UTM">
      <div className="utm-shell">
        <div className="utm-toolbar">
          <h1>Order &amp; UTM</h1>
          <input
            type="search"
            className="utm-search"
            placeholder="Cari order ID, UTM, atau custom value…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari"
          />
        </div>

        <div className="utm-table-wrap">
          <table className="utm-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="utm-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Pilih semua di halaman ini"
                  />
                </th>
                <th>Order ID</th>
                <th>UTM Source</th>
                <th>UTM Medium</th>
                <th>UTM Campaign</th>
                <th>UTM Term</th>
                <th style={{ width: 56 }} aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Memuat data…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Tidak ada order dengan data UTM.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="utm-checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Pilih order ${row.order_ref}`}
                      />
                    </td>
                    <td>
                      <div className="utm-order-cell">
                        <div>
                          <button
                            type="button"
                            className="utm-order-ref"
                            onClick={() => openDetail(row.id)}
                            disabled={loadingDetail}
                          >
                            {row.order_ref || row.id}
                          </button>
                          <p className="utm-order-date">{formatOrderDate(row.create_at)}</p>
                        </div>
                        <button
                          type="button"
                          className="utm-external-btn"
                          title="Lihat detail"
                          aria-label="Lihat detail order"
                          onClick={() => openDetail(row.id)}
                          disabled={loadingDetail}
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </td>
                    <td>{row.utm_source || <span className="utm-muted">—</span>}</td>
                    <td>{row.utm_medium || <span className="utm-muted">—</span>}</td>
                    <td>{row.utm_campaign || <span className="utm-muted">—</span>}</td>
                    <td>{row.utm_term || <span className="utm-muted">—</span>}</td>
                    <td className="utm-actions-wrap" ref={openMenuId === row.id ? menuRef : null}>
                      <button
                        type="button"
                        className="utm-actions-trigger"
                        aria-label="Menu aksi"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((id) => (id === row.id ? null : row.id));
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {openMenuId === row.id && (
                        <div className="utm-actions-menu">
                          <button type="button" onClick={() => openDetail(row.id)}>
                            Lihat detail
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="utm-pagination">
          <button type="button" disabled={!canPrev || loading} onClick={() => load(page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.current_page} of {pagination.last_page}
            {pagination.total ? ` (${pagination.total} total)` : ""}
          </span>
          <button type="button" disabled={!hasMore || loading} onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {showView && selectedOrder && (
        <ViewOrders
          order={{
            ...selectedOrder,
            customer: selectedOrder.customer_rel?.nama || "-",
          }}
          onClose={() => {
            setShowView(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </Layout>
  );
}
