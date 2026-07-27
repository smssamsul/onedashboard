"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import {
  getDepartemenList,
  getJabatanList,
  getMenuAkses,
  saveMenuAkses,
} from "@/lib/menuAccess";
import { Save, ShieldCheck } from "lucide-react";

export default function HakAksesMenuPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [departemenList, setDepartemenList] = useState([]);
  const [jabatanList, setJabatanList] = useState([]);
  const [departemenId, setDepartemenId] = useState("");
  const [jabatanId, setJabatanId] = useState("");
  const [menuList, setMenuList] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(userData);
      const userDivisi = String(user?.divisi ?? "");
      if (userDivisi !== "1" && userDivisi !== "2" && userDivisi !== "admin") {
        alert("Akses ditolak. Hanya Admin yang dapat mengakses halaman ini.");
        router.push("/admin");
        return;
      }
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error checking access:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    getDepartemenList().then(setDepartemenList).catch(() => setDepartemenList([]));
    getJabatanList().then(setJabatanList).catch(() => setJabatanList([]));
  }, [isAuthorized]);

  useEffect(() => {
    if (!departemenId || !jabatanId) {
      setMenuList([]);
      setCheckedIds(new Set());
      return;
    }

    let cancelled = false;
    setLoadingMenu(true);
    getMenuAkses(departemenId, jabatanId)
      .then((result) => {
        if (cancelled) return;
        setMenuList(Array.isArray(result) ? result : []);
        const granted = new Set(
          (Array.isArray(result) ? result : []).filter((m) => m.granted).map((m) => m.id)
        );
        setCheckedIds(granted);
      })
      .catch((error) => {
        console.error("Error loading menu akses:", error);
        setMenuList([]);
        setCheckedIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoadingMenu(false);
      });

    return () => {
      cancelled = true;
    };
  }, [departemenId, jabatanId]);

  const toggleMenu = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = (checked) => {
    setCheckedIds(checked ? new Set(menuList.map((m) => m.id)) : new Set());
  };

  const handleSave = async () => {
    if (!departemenId || !jabatanId) return;

    setSaving(true);
    try {
      await saveMenuAkses({
        departemen_id: departemenId,
        jabatan_id: jabatanId,
        menu_ids: Array.from(checkedIds),
      });
    } catch (error) {
      console.error("Error saving menu akses:", error);
      // api() sudah menampilkan toast error
    } finally {
      setSaving(false);
    }
  };

  // Group menu by section untuk tampilan yang rapi
  const groupedMenu = menuList.reduce((acc, item) => {
    const section = item.section || "Lainnya";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  if (!isAuthorized) {
    return (
      <Layout title="Hak Akses Menu | Admin">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Hak Akses Menu | Admin">
      <div className="hak-akses-page">
        <div className="page-header">
          <div>
            <h1>
              <ShieldCheck size={24} style={{ marginRight: "0.5rem", verticalAlign: "-4px" }} />
              Hak Akses Menu
            </h1>
            <p>Atur menu apa saja yang boleh diakses untuk kombinasi Divisi + Jabatan tertentu</p>
          </div>
        </div>

        <div className="selector-bar">
          <div className="form-group">
            <label>Divisi</label>
            <select value={departemenId} onChange={(e) => setDepartemenId(e.target.value)}>
              <option value="">Pilih Divisi</option>
              {departemenList.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Jabatan</label>
            <select value={jabatanId} onChange={(e) => setJabatanId(e.target.value)}>
              <option value="">Pilih Jabatan</option>
              {jabatanList.map((jab) => (
                <option key={jab.id} value={jab.id}>
                  {jab.nama}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!departemenId || !jabatanId || saving}
          >
            <Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>

        <div className="menu-container">
          {!departemenId || !jabatanId ? (
            <div className="empty-state">Pilih Divisi dan Jabatan terlebih dahulu untuk mengatur hak akses menu.</div>
          ) : loadingMenu ? (
            <div className="empty-state">Memuat daftar menu...</div>
          ) : menuList.length === 0 ? (
            <div className="empty-state">
              Belum ada menu yang terdaftar. Tambahkan menu di halaman <a href="/admin/menu">Menu Master</a> terlebih dahulu.
            </div>
          ) : (
            <>
              <div className="select-all-row">
                <label>
                  <input
                    type="checkbox"
                    checked={checkedIds.size === menuList.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  Pilih Semua ({checkedIds.size}/{menuList.length})
                </label>
              </div>

              {Object.entries(groupedMenu).map(([section, items]) => (
                <div className="section-group" key={section}>
                  <h3>{section}</h3>
                  <div className="checklist">
                    {items.map((item) => (
                      <label className="checklist-item" key={item.id}>
                        <input
                          type="checkbox"
                          checked={checkedIds.has(item.id)}
                          onChange={() => toggleMenu(item.id)}
                        />
                        <span>
                          {item.label}
                          {item.href && <span className="href-hint"> ({item.href})</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .hak-akses-page {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .page-header {
          background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%);
          border-radius: 12px;
          padding: 1.5rem 2rem;
          color: white;
          margin-bottom: 1.5rem;
        }
        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.875rem;
          font-weight: 700;
          display: flex;
          align-items: center;
        }
        .page-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.875rem;
        }
        .selector-bar {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          min-width: 220px;
        }
        .form-group label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }
        .form-group select {
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
        }
        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: fit-content;
        }
        .btn-primary {
          background: #6366f1;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .menu-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .empty-state {
          padding: 3rem 1rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .select-all-row {
          padding-bottom: 1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .select-all-row label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
        }
        .section-group {
          margin-bottom: 1.5rem;
        }
        .section-group h3 {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin: 0 0 0.75rem 0;
        }
        .checklist {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.5rem;
        }
        .checklist-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #111827;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
        }
        .checklist-item:hover {
          background: #f9fafb;
        }
        .href-hint {
          color: #9ca3af;
          font-size: 0.75rem;
        }
        @media (max-width: 768px) {
          .hak-akses-page {
            padding: 1rem;
          }
          .selector-bar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </Layout>
  );
}
