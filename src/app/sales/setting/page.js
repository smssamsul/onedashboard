"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { LogIn, LogOut, CheckCircle, XCircle, Settings, MonitorPlay, Smartphone, Wifi, WifiOff, QrCode } from "lucide-react";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";

const BaileysQRModal = dynamic(() => import("../sales-list/BaileysQRModal"), { ssr: false });

export default function SalesSettingPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [woowaUtama, setWoowaUtama] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Baileys Engine State
  const [waEngine, setWaEngine] = useState("woowa"); // 'woowa' | 'baileys'
  const [engineSaveLoading, setEngineSaveLoading] = useState(false);
  const [baileysGlobalStatus, setBaileysGlobalStatus] = useState(null); // null | 'open' | 'qr' | 'connecting' | 'not_found'
  const [baileysStatusLoading, setBaileysStatusLoading] = useState(false);
  const [showGlobalQR, setShowGlobalQR] = useState(false);

  // Check Sales access
  useEffect(() => {
    const checkAccess = () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(userData);
        const userDivisi = user?.divisi || localStorage.getItem("division");

        if (userDivisi !== 3 && userDivisi !== "3") {
          alert("Akses ditolak. Hanya Sales yang dapat mengakses halaman ini.");
          router.push("/sales/dashboard");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking access:", error);
        router.push("/login");
      }
    };

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    checkGoogleStatus();
    fetchSettings();
  }, [isAuthorized]);

  const checkGoogleStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("sales/google-sync/status"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setIsConnected(result.connected);
      }
    } catch (error) {
      console.error("Error checking status:", error);
      toast.error("Gagal memeriksa status sinkronisasi Google");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("sales/setting"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setWoowaUtama(result.data.woowa_utama || "");
          setWaEngine(result.data.wa_engine || "woowa");
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Gagal memuat pengaturan");
    }
  };

  const fetchBaileysGlobalStatus = useCallback(async () => {
    try {
      setBaileysStatusLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/sales/baileys/status/global", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBaileysGlobalStatus(data.status || "not_found");
    } catch {
      setBaileysGlobalStatus("error");
    } finally {
      setBaileysStatusLoading(false);
    }
  }, []);

  // Fetch Baileys global status saat engine = baileys
  useEffect(() => {
    if (waEngine === "baileys" && isAuthorized) {
      fetchBaileysGlobalStatus();
    }
  }, [waEngine, isAuthorized, fetchBaileysGlobalStatus]);

  const handleSaveWoowa = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("sales/setting"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          woowa_utama: woowaUtama,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("Pengaturan Woowa berhasil disimpan");
        } else {
          toast.error(result.message || "Gagal menyimpan pengaturan");
        }
      } else {
        toast.error("Gagal menyimpan pengaturan");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveEngine = async () => {
    try {
      setEngineSaveLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("sales/setting"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ wa_engine: waEngine }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Engine WA berhasil diubah ke ${waEngine === "baileys" ? "Baileys" : "Woowa"}`);
        if (waEngine === "baileys") {
          fetchBaileysGlobalStatus();
        }
      } else {
        toast.error(result.message || "Gagal menyimpan engine");
      }
    } catch (error) {
      console.error("Error saving engine:", error);
      toast.error("Terjadi kesalahan saat menyimpan engine");
    } finally {
      setEngineSaveLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("sales/google-sync/url"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.url) {
          window.location.href = result.url;
        } else {
          toast.error("Gagal mendapatkan URL otorisasi");
        }
      }
    } catch (error) {
      console.error("Error getting URL:", error);
      toast.error("Terjadi kesalahan saat menghubungi server");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan sinkronisasi dengan Google Contacts?")) {
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("sales/google-sync/disconnect"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || "Berhasil logout dari Google");
        setIsConnected(false);
      } else {
        toast.error("Gagal memutuskan sinkronisasi");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Terjadi kesalahan saat memutuskan sinkronisasi");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthorized || loading) {
    return (
      <Layout title="Setting | Sales">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>{loading ? "Memuat data..." : "Memeriksa akses..."}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Setting | Sales">
      <div className="sales-setting-page">
        {/* Card 1: Google Contacts Synchronization */}
        <div className="setting-card">
          <h3 style={{ margin: "0 0 1.5rem 0", color: "#111827", fontSize: "1.25rem" }}>
            Sinkronisasi Google Contacts
          </h3>

          <div className="status-container">
            <div className="status-indicator">
              <span style={{ fontWeight: "500", color: "#374151", marginRight: "1rem" }}>
                Status:
              </span>
              {isConnected ? (
                <span className="badge badge-success">
                  <CheckCircle size={16} /> Connected
                </span>
              ) : (
                <span className="badge badge-error">
                  <XCircle size={16} /> Not Connected
                </span>
              )}
            </div>

            <p className="description">
              Hubungkan akun Google untuk mensinkronisasi data customer secara otomatis ke Google Contacts Anda.
              Ini memudahkan Anda ketika ingin melakukan follow up melalui WhatsApp.
            </p>

            <div className="action-buttons">
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="btn btn-danger"
                >
                  <LogOut size={18} />
                  {actionLoading ? "Memproses..." : "Logout & Hapus Token"}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  <LogIn size={18} />
                  {actionLoading ? "Memproses..." : "Connect to Google"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Pengaturan Analitik & Pixel */}
        <div className="setting-card" style={{ marginTop: "2rem" }}>
          <h3 style={{ margin: "0 0 1.5rem 0", color: "#111827", fontSize: "1.25rem" }}>
            Pengaturan Akun Analitik (Pixel)
          </h3>
          <div className="status-container">
            <p className="description">
              Kelola daftar Facebook Pixel, Conversion API, dan kode tracking lainnya. Pixel ini akan dapat dipilih ketika Anda membuat atau mengedit produk.
            </p>
            <div className="action-buttons">
              <button
                onClick={() => router.push('/sales/setting/pixel')}
                className="btn btn-outline"
                style={{ color: "#4f46e5", borderColor: "#4f46e5" }}
              >
                <MonitorPlay size={18} />
                Kelola Akun Analitik
              </button>
            </div>
          </div>
        </div>

        {/* Card NEW: Engine WhatsApp */}
        <div className="setting-card" style={{ marginTop: "2rem", border: "1px solid #e0e7ff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ background: "#4f46e5", borderRadius: "10px", padding: "0.5rem", display: "flex" }}>
              <Smartphone size={20} color="white" />
            </div>
            <h3 style={{ margin: 0, color: "#111827", fontSize: "1.25rem" }}>Engine WhatsApp</h3>
          </div>

          <div className="status-container">
            <p className="description">
              Pilih engine yang digunakan untuk mengirim pesan WhatsApp di seluruh sistem (broadcast, follow-up, notifikasi order).
            </p>

            {/* Radio: Engine selection */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {/* Woowa Option */}
              <label style={{
                flex: 1, minWidth: "200px", cursor: "pointer",
                border: waEngine === "woowa" ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                borderRadius: "12px", padding: "1rem 1.25rem",
                background: waEngine === "woowa" ? "#eef2ff" : "white",
                transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: "0.75rem"
              }}>
                <input
                  type="radio" name="wa_engine" value="woowa"
                  checked={waEngine === "woowa"}
                  onChange={() => setWaEngine("woowa")}
                  style={{ marginTop: "3px", accentColor: "#4f46e5" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#1e1b4b", marginBottom: "0.25rem" }}>Woowa Gateway</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Kirim via notifapi.com menggunakan Woowa Key per-sales</div>
                </div>
              </label>

              {/* Baileys Option */}
              <label style={{
                flex: 1, minWidth: "200px", cursor: "pointer",
                border: waEngine === "baileys" ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                borderRadius: "12px", padding: "1rem 1.25rem",
                background: waEngine === "baileys" ? "#eef2ff" : "white",
                transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: "0.75rem"
              }}>
                <input
                  type="radio" name="wa_engine" value="baileys"
                  checked={waEngine === "baileys"}
                  onChange={() => setWaEngine("baileys")}
                  style={{ marginTop: "3px", accentColor: "#4f46e5" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#1e1b4b", marginBottom: "0.25rem" }}>Baileys</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Kirim via server Baileys lokal. Setiap sales punya session WA sendiri.</div>
                </div>
              </label>
            </div>

            <div className="action-buttons">
              <button
                onClick={handleSaveEngine}
                disabled={engineSaveLoading}
                className="btn btn-primary"
                id="btn-save-engine"
              >
                {engineSaveLoading ? "Menyimpan..." : "Simpan Engine"}
              </button>
            </div>

            {/* Baileys Status Panel — hanya tampil jika engine = baileys */}
            {waEngine === "baileys" && (
              <div style={{
                marginTop: "0.5rem", padding: "1.25rem",
                background: "#f8fafc", borderRadius: "10px",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ fontWeight: 600, color: "#1e1b4b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Wifi size={16} /> Status WA Global (Session: global)
                </div>

                {baileysStatusLoading ? (
                  <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Memeriksa status...</p>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.375rem 0.875rem", borderRadius: "9999px",
                      fontWeight: 600, fontSize: "0.875rem",
                      background: (baileysGlobalStatus === "open" || baileysGlobalStatus === "connected") ? "#d1fae5" : "#fee2e2",
                      color: (baileysGlobalStatus === "open" || baileysGlobalStatus === "connected") ? "#065f46" : "#991b1b",
                    }}>
                      {(baileysGlobalStatus === "open" || baileysGlobalStatus === "connected") ? (
                        <><Wifi size={14} /> Connected</>
                      ) : (
                        <><WifiOff size={14} /> {baileysGlobalStatus === "not_found" ? "Disconnected" : "Disconnected"}</>
                      )}
                    </span>

                    {(baileysGlobalStatus !== "open" && baileysGlobalStatus !== "connected") && (
                      <button
                        onClick={() => setShowGlobalQR(true)}
                        className="btn btn-outline"
                        style={{ color: "#4f46e5", borderColor: "#4f46e5", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                        id="btn-generate-global-qr"
                      >
                        <QrCode size={16} /> Generate QR
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <button
                        onClick={fetchBaileysGlobalStatus}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "0.8rem", textDecoration: "underline" }}
                      >
                        Refresh
                      </button>

                      {baileysGlobalStatus === "open" || baileysGlobalStatus === "connected" ? (
                        <button
                          onClick={async () => {
                            if (!confirm("Yakin ingin logout WA Global?")) return;
                            try {
                              const token = localStorage.getItem("token");
                              await fetch("/api/sales/baileys/session-by-sales/global", {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              fetchBaileysGlobalStatus();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "0.8rem", textDecoration: "underline" }}
                        >
                          Logout
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Woowa Gateway Configuration */}
        <div className="setting-card" style={{ marginTop: "2rem" }}>
          <h3 style={{ margin: "0 0 1.5rem 0", color: "#111827", fontSize: "1.25rem" }}>
            Konfigurasi Woowa Gateway
          </h3>

          <form onSubmit={handleSaveWoowa} className="status-container">
            <div className="form-group">
              <label htmlFor="woowa_utama" style={{ fontWeight: "500", color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                Woowa Key Utama (Global)
              </label>
              <input
                id="woowa_utama"
                type="text"
                value={woowaUtama}
                onChange={(e) => setWoowaUtama(e.target.value)}
                placeholder="Masukkan Woowa Key Utama"
                className="input-field"
              />
              <p className="description" style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
                Woowa Key Utama digunakan sebagai cadangan (fallback) global ketika Woowa Key pada masing-masing akun Sales tidak dikonfigurasi.
              </p>
            </div>

            <div className="action-buttons">
              <button
                type="submit"
                disabled={saveLoading}
                className="btn btn-primary"
              >
                {saveLoading ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Baileys QR Modal untuk Global Session */}
      {showGlobalQR && (
        <BaileysQRModal
          salesId="global"
          salesName="WA Global (Setting)"
          onClose={() => setShowGlobalQR(false)}
          onConnected={() => {
            setBaileysGlobalStatus("open");
            setShowGlobalQR(false);
          }}
        />
      )}

      <style jsx>{`
        .sales-setting-page {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .setting-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .status-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #f3f4f6;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .badge-success {
          background-color: #d1fae5;
          color: #065f46;
        }

        .badge-error {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .description {
          color: #4b5563;
          line-height: 1.6;
          font-size: 0.95rem;
          margin: 0;
        }

        .action-buttons {
          margin-top: 0.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-field {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .input-field:focus {
          border-color: #4f46e5 !important;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #4f46e5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #4338ca;
          transform: translateY(-1px);
        }

        .btn-danger {
          background-color: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #dc2626;
          transform: translateY(-1px);
        }

        .btn-outline {
          background-color: transparent;
          border: 1.5px solid currentColor !important;
        }

        .btn-outline:hover:not(:disabled) {
          background-color: #eef2ff;
          transform: translateY(-1px);
        }
      `}</style>
    </Layout>
  );
}
