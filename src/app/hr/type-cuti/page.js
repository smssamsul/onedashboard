"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Plus, Edit, Trash2, X, Save } from "lucide-react";
import { toast } from "react-hot-toast";

export default function HrTypeCutiPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
    kuota: "",
  });

  useEffect(() => {
    const checkAccess = () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(userData);
        const userDivisi = user?.divisi;

        if (userDivisi !== 5 && userDivisi !== "5" && userDivisi !== "hr") {
          alert("Akses ditolak. Hanya HR yang dapat mengakses halaman ini.");
          router.push("/hr/dashboard");
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
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl("hr/type-cuti?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (id = null) => {
    if (id) {
      const item = data.find((d) => d.id === id);
      setFormData({
        nama: item.nama || "",
        kuota: item.kuota || "",
      });
      setEditingId(id);
    } else {
      setFormData({
        nama: "",
        kuota: "",
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      nama: "",
      kuota: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const url = editingId
        ? getApiUrl(`hr/type-cuti/${editingId}`)
        : getApiUrl("hr/type-cuti");
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: formData.nama,
          kuota: formData.kuota ? parseInt(formData.kuota) : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingId ? "Jenis cuti berhasil diperbarui" : "Jenis cuti berhasil ditambahkan");
        closeModal();
        loadData();
      } else {
        toast.error(result.message || "Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Gagal menyimpan data");
    }
  };

  const deleteType = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jenis cuti ini?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl(`hr/type-cuti/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Jenis cuti berhasil dihapus");
        loadData();
      } else {
        toast.error(result.message || "Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Gagal menghapus data");
    }
  };

  if (!isAuthorized) {
    return (
      <Layout title="Jenis Cuti | HR">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Jenis Cuti | HR">
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
              Jenis Cuti
            </h1>
            <p style={{ color: "#6b7280", margin: 0 }}>Kelola jenis cuti karyawan</p>
          </div>
          <button
            onClick={() => openModal()}
            style={{
              padding: "0.625rem 1.25rem",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Plus size={16} />
            Tambah Jenis Cuti
          </button>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "4rem", textAlign: "center" }}>Memuat data...</div>
          ) : data.length === 0 ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "#6b7280" }}>Tidak ada data</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>
                    #
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>
                    Nama Jenis Cuti
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>
                    Kuota (Hari)
                  </th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{index + 1}</td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{item.nama}</td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {item.kuota !== null && item.kuota !== undefined ? `${item.kuota} hari` : "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => openModal(item.id)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "#6366f1",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteType(item.id)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Trash2 size={14} />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "1rem",
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "100%",
                maxWidth: "500px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
                  {editingId ? "Edit Jenis Cuti" : "Tambah Jenis Cuti"}
                </h2>
                <button
                  onClick={closeModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Nama Jenis Cuti *
                  </label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Kuota (Hari)
                  </label>
                  <input
                    type="number"
                    value={formData.kuota}
                    onChange={(e) => setFormData({ ...formData, kuota: e.target.value })}
                    min="0"
                    placeholder="Kosongkan jika tidak ada batasan"
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  />
                  <small style={{ display: "block", marginTop: "0.25rem", color: "#6b7280", fontSize: "0.75rem" }}>
                    Kosongkan jika tidak ada batasan kuota
                  </small>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Save size={16} />
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
