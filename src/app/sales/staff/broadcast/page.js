"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

// Lazy load modals
const ViewPenerima = dynamic(() => import("./viewPenerima"), { ssr: false });
const AddBroadcast = dynamic(() => import("./addBroadcast"), { ssr: false });
const SendBroadcast = dynamic(() => import("./sendBroadcast"), { ssr: false });

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showViewPenerima, setShowViewPenerima] = useState(false);
  const [showAddBroadcast, setShowAddBroadcast] = useState(false);
  const [showSendBroadcast, setShowSendBroadcast] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [products, setProducts] = useState([]);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token tidak ditemukan");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/sales/broadcast", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      if (json.success && json.data) {
        setBroadcasts(Array.isArray(json.data) ? json.data : []);
      } else {
        setError(json.message || "Gagal memuat data broadcast");
      }
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("/api/sales/produk", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProducts(Array.isArray(json.data) ? json.data : []);
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };

    fetchProducts();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusLabel = (status, broadcast) => {
    if (status?.trim() === "1" && broadcast?.sent_to_queue > 0) {
      return "Sedang Diproses";
    }

    const statusMap = {
      "1": "Draft",
      "2": "Terjadwal",
      "3": "Terkirim",
      "4": "Dibatalkan",
    };
    return statusMap[status?.trim()] || status || "-";
  };

  const getStatusClass = (status, broadcast) => {
    if (status?.trim() === "1" && broadcast?.sent_to_queue > 0) {
      return "status-badge status-processing";
    }

    const statusMap = {
      "1": "status-badge status-draft",
      "2": "status-badge status-draft",
      "3": "status-badge status-success",
      "4": "status-badge status-failed",
    };
    return statusMap[status?.trim()] || "status-badge";
  };

  const STATUS_ORDER_MAP = {
    "1": "Proses",
    "2": "Processing",
    "3": "Failed",
    "4": "Upselling",
    "N": "Dihapus",
  };

  const STATUS_PEMBAYARAN_MAP = {
    0: { label: "Unpaid", class: "unpaid" },
    null: { label: "Unpaid", class: "unpaid" },
    1: { label: "Waiting Approval", class: "pending" },
    2: { label: "Paid", class: "paid" },
    3: { label: "Rejected", class: "rejected" },
    4: { label: "Partial Payment", class: "partial" },
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.nama || `Produk ID: ${productId}`;
  };

  const formatTarget = (targetData) => {
    if (!targetData || Object.keys(targetData).length === 0) {
      return "-";
    }

    if (targetData.tipe === "excel") {
      return (
        <div key="excel">
          <strong>Sumber:</strong>
          <span style={{ marginLeft: "0.5rem" }}>Excel File ({targetData.excel_data?.length || 0} kontak)</span>
        </div>
      );
    }

    const parts = [];

    if (targetData.produk) {
      const produkList = Array.isArray(targetData.produk) ? targetData.produk : [targetData.produk];
      const validProduk = produkList.filter(id => id !== null && id !== undefined && id !== "");
      if (validProduk.length > 0) {
        const produkNames = validProduk.map(id => getProductName(id));
        parts.push(
          <div key="produk" style={{ marginBottom: produkNames.length > 1 ? "0.5rem" : "0.25rem" }}>
            <strong>Produk:</strong>
            {produkNames.length === 1 ? (
              <span style={{ marginLeft: "0.5rem" }}>{produkNames[0]}</span>
            ) : (
              produkNames.map((name, idx) => (
                <div key={idx} style={{ marginLeft: "1rem", marginTop: idx === 0 ? "0.25rem" : "0.125rem" }}>
                  {name}
                </div>
              ))
            )}
          </div>
        );
      }
    }

    if (targetData.status_order !== undefined && targetData.status_order !== null && targetData.status_order !== "") {
      const statusOrderList = Array.isArray(targetData.status_order)
        ? targetData.status_order
        : [targetData.status_order];
      const validStatus = statusOrderList.filter(s => s !== null && s !== undefined && s !== "");
      if (validStatus.length > 0) {
        const statusLabels = validStatus.map(s => STATUS_ORDER_MAP[s] || s);
        parts.push(
          <div key="status_order" style={{ marginBottom: statusLabels.length > 1 ? "0.5rem" : "0.25rem" }}>
            <strong>Status Order:</strong>
            {statusLabels.length === 1 ? (
              <span style={{ marginLeft: "0.5rem" }}>{statusLabels[0]}</span>
            ) : (
              statusLabels.map((label, idx) => (
                <div key={idx} style={{ marginLeft: "1rem", marginTop: idx === 0 ? "0.25rem" : "0.125rem" }}>
                  {label}
                </div>
              ))
            )}
          </div>
        );
      }
    }

    if (targetData.status_pembayaran !== undefined && targetData.status_pembayaran !== null && targetData.status_pembayaran !== "") {
      const statusPembayaranList = Array.isArray(targetData.status_pembayaran)
        ? targetData.status_pembayaran
        : [targetData.status_pembayaran];
      const validStatus = statusPembayaranList.filter(s => s !== null && s !== undefined && s !== "");
      if (validStatus.length > 0) {
        const statusLabels = validStatus.map(s => STATUS_PEMBAYARAN_MAP[s]?.label || s || "Unpaid");
        parts.push(
          <div key="status_pembayaran" style={{ marginBottom: statusLabels.length > 1 ? "0.5rem" : "0.25rem" }}>
            <strong>Status Pembayaran:</strong>
            {statusLabels.length === 1 ? (
              <span style={{ marginLeft: "0.5rem" }}>{statusLabels[0]}</span>
            ) : (
              statusLabels.map((label, idx) => (
                <div key={idx} style={{ marginLeft: "1rem", marginTop: idx === 0 ? "0.25rem" : "0.125rem" }}>
                  {label}
                </div>
              ))
            )}
          </div>
        );
      }
    }

    return parts.length > 0 ? parts : "-";
  };

  const handleDelete = async (broadcastId, broadcastNama) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus broadcast "${broadcastNama}"?`)) {
      return;
    }

    setDeletingId(broadcastId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/broadcast/${broadcastId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus broadcast");
      }

      fetchBroadcasts();
    } catch (err) {
      console.error("Error deleting broadcast:", err);
      setError(err.message || "Terjadi kesalahan saat menghapus broadcast");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSend = async (broadcastId) => {
    setSendingId(broadcastId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/broadcast/${broadcastId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim broadcast");
      }

      alert(`Broadcast berhasil dikirim!\nTotal Target: ${json.data?.total_target || 0}\nSent to Queue: ${json.data?.sent_to_queue || 0}\nFailed: ${json.data?.failed || 0}`);
      fetchBroadcasts();
    } catch (err) {
      console.error("Error sending broadcast:", err);
      setError(err.message || "Terjadi kesalahan saat mengirim broadcast");
      throw err;
    } finally {
      setSendingId(null);
    }
  };

  const handleOpenSend = (broadcast) => {
    setSelectedBroadcast(broadcast);
    setShowSendBroadcast(true);
  };

  return (
    <Layout title="Broadcast">
      <style>{`
        :root {
            --primary: #F1A124;
            --primary-light: #f7c376;
            --secondary: #3b82f6;
            --accent: #F1A124;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --bg: #f8fafc;
            --surface: #ffffff;
            --text: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --radius-sm: 0.375rem;
            --radius: 0.5rem;
            --radius-lg: 0.75rem;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        }

        .bc-container {
            padding: 1.5rem;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: var(--text);
            background: var(--bg);
            min-height: 100vh;
        }

        .page-header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            border-radius: var(--radius-lg);
            padding: 1.5rem 2rem;
            color: white;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow);
        }

        .page-header h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
        }

        .page-header p {
            margin: 0.25rem 0 0 0;
            opacity: 0.9;
            font-size: 0.875rem;
        }

        .btn-create {
            background: white;
            color: var(--primary);
            border: none;
            padding: 0.625rem 1.25rem;
            border-radius: var(--radius);
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s;
        }

        .btn-create:hover {
            box-shadow: var(--shadow);
            transform: translateY(-1px);
        }

        .card-table {
            background: var(--surface);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow);
            overflow: hidden;
        }

        .card-table-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-table-header h3 {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text);
        }

        .table-responsive {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            background: #f8fafc;
            padding: 0.75rem 1.5rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-weight: 600;
            border-bottom: 1px solid var(--border);
        }

        td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            font-size: 0.875rem;
        }

        tbody tr:hover {
            background: #fcfcfc;
        }

        .action-group {
            display: flex;
            gap: 0.375rem;
            flex-wrap: wrap;
        }

        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.4rem 0.6rem;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }

        .action-btn i {
            font-size: 0.8rem;
        }

        .action-btn.send { background: #ccfbf1; color: #0d9488; }
        .action-btn.send:hover { background: #99f6e4; }
        .action-btn.send:disabled { opacity: 0.5; cursor: not-allowed; }

        .action-btn.view { background: #dbeafe; color: #2563eb; }
        .action-btn.view:hover { background: #bfdbfe; }

        .action-btn.delete { background: #fee2e2; color: #dc2626; }
        .action-btn.delete:hover { background: #fecaca; }
        .action-btn.delete:disabled { opacity: 0.5; cursor: not-allowed; }

        .status-badge {
            display: inline-flex;
            padding: 0.25rem 0.625rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            background: #f1f5f9;
            color: #64748b;
        }

        .status-success { background: #d1fae5; color: #059669; }
        .status-failed { background: #fee2e2; color: #dc2626; }
        .status-processing { background: #fef3c7; color: #d97706; }
        .status-draft { background: #e0e7ff; color: #4f46e5; }
      `}</style>
      
      <div className="bc-container">
        <div className="page-header">
          <div>
            <h1>Manajemen Broadcast</h1>
            <p>Kirim pesan broadcast ke customer</p>
          </div>
          <button className="btn-create" onClick={() => setShowAddBroadcast(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat Broadcast
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <div className="card-table">
          <div className="card-table-header">
            <h3>Daftar Broadcast</h3>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>Nama</th>
                  <th style={{ width: "25%" }}>Pesan</th>
                  <th>Waktu Kirim</th>
                  <th>Target Penerima</th>
                  <th style={{ textAlign: "center" }}>Jml Target</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : broadcasts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Belum ada data broadcast.
                    </td>
                  </tr>
                ) : (
                  broadcasts.map((broadcast, i) => {
                    let targetData = {};
                    try {
                      if (broadcast.target) {
                        targetData = typeof broadcast.target === "string"
                          ? JSON.parse(broadcast.target)
                          : broadcast.target;
                      }
                    } catch (e) {
                      console.error("Error parsing target:", e);
                    }

                    return (
                      <tr key={broadcast.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{broadcast.nama || "-"}</td>
                        <td>
                          <div style={{ maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                            {broadcast.pesan || "-"}
                          </div>
                        </td>
                        <td>{formatDate(broadcast.tanggal_kirim)}</td>
                        <td>{formatTarget(targetData)}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{broadcast.total_target || "0"}</td>
                        <td>
                          <span className={getStatusClass(broadcast.status, broadcast)}>
                            {getStatusLabel(broadcast.status, broadcast)}
                          </span>
                        </td>
                        <td>
                          <div className="action-group">
                            <button
                              className="action-btn view"
                              onClick={() => {
                                setSelectedBroadcast(broadcast);
                                setShowViewPenerima(true);
                              }}
                              title="Lihat Penerima"
                            >
                              <i className="pi pi-eye" /> View
                            </button>
                            <button
                              className="action-btn send"
                              onClick={() => handleOpenSend(broadcast)}
                              disabled={sendingId === broadcast.id}
                              title="Kirim Broadcast"
                            >
                              <i className="pi pi-send" /> Send
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDelete(broadcast.id, broadcast.nama)}
                              disabled={deletingId === broadcast.id}
                              title="Hapus Broadcast"
                            >
                              <i className="pi pi-trash" /> {deletingId === broadcast.id ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showViewPenerima && selectedBroadcast && (
        <ViewPenerima
          broadcast={selectedBroadcast}
          onClose={() => {
            setShowViewPenerima(false);
            setSelectedBroadcast(null);
          }}
        />
      )}

      {showAddBroadcast && (
        <AddBroadcast
          onClose={() => setShowAddBroadcast(false)}
          onAdd={(newBroadcast) => {
            fetchBroadcasts();
            setShowAddBroadcast(false);
          }}
        />
      )}

      {showSendBroadcast && selectedBroadcast && (
        <SendBroadcast
          broadcast={selectedBroadcast}
          onClose={() => {
            setShowSendBroadcast(false);
            setSelectedBroadcast(null);
          }}
          onSend={handleSend}
        />
      )}
    </Layout>
  );
}
