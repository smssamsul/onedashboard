"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { useRouter } from "next/navigation";
import { ListTodo, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const DIVISI_MAP = {
  1: "Admin Super",
  2: "Owner",
  3: "Sales",
  4: "Finance",
  5: "HR",
  6: "Marketing",
  7: "Multimedia",
  8: "IT",
  9: "Direksi",
  11: "Trainer",
};

const getDivisiName = (divisi) => {
  if (!divisi) return "-";
  const divisiKey = String(divisi);
  return DIVISI_MAP[divisiKey] || DIVISI_MAP[divisi] || divisi || "-";
};

export default function DireksiTaskListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [karyawanList, setKaryawanList] = useState([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState(null);
  const [todoList, setTodoList] = useState([]);
  const [loadingTodos, setLoadingTodos] = useState(false);

  useEffect(() => {
    loadKaryawanList();
  }, []);

  const loadKaryawanList = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(getApiUrl("hr/karyawan?all=true&status=1"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setKaryawanList(result.data || []);
        }
      }
    } catch (e) {
      console.error("Error loading karyawan:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadTodoList = async (karyawanId) => {
    try {
      setLoadingTodos(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(getApiUrl(`hr/todo-list?karyawan_id=${karyawanId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setTodoList(result.data || []);
        }
      }
    } catch (e) {
      console.error("Error loading todo list:", e);
    } finally {
      setLoadingTodos(false);
    }
  };

  const handleKaryawanClick = (karyawan) => {
    setSelectedKaryawan(karyawan);
    if (karyawan.user_id) {
      loadTodoList(karyawan.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-green-600" />;
      case "in_progress":
        return <Clock size={16} className="text-blue-600" />;
      case "pending":
        return <AlertCircle size={16} className="text-yellow-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  return (
    <Layout title="Task List Karyawan | Direksi">
      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
            Task List Karyawan
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Pilih karyawan untuk melihat todo list mereka
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
          {/* Karyawan List */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#1f2937" }}>
              Daftar Karyawan
            </h2>
            {loading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>Memuat...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {karyawanList.map((karyawan) => (
                  <button
                    key={karyawan.id}
                    onClick={() => handleKaryawanClick(karyawan)}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      background: selectedKaryawan?.id === karyawan.id ? "#eef2ff" : "transparent",
                      border: selectedKaryawan?.id === karyawan.id ? "1px solid #4f46e5" : "1px solid #e5e7eb",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedKaryawan?.id !== karyawan.id) {
                        e.target.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedKaryawan?.id !== karyawan.id) {
                        e.target.style.background = "transparent";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <User size={16} />
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                        {karyawan.nama || "-"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      {karyawan.user_rel?.divisi ? (
                        <span>{getDivisiName(karyawan.user_rel.divisi)}</span>
                      ) : karyawan.departemen_rel?.nama ? (
                        <span>{karyawan.departemen_rel.nama}</span>
                      ) : karyawan.departemen ? (
                        <span>{karyawan.departemen}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Todo List */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
            {selectedKaryawan ? (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
                    Todo List - {selectedKaryawan.nama}
                  </h2>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>
                    {selectedKaryawan.user_rel?.divisi ? (
                      <span>Divisi: {getDivisiName(selectedKaryawan.user_rel.divisi)}</span>
                    ) : selectedKaryawan.departemen_rel?.nama ? (
                      <span>Departemen: {selectedKaryawan.departemen_rel.nama}</span>
                    ) : selectedKaryawan.departemen ? (
                      <span>Departemen: {selectedKaryawan.departemen}</span>
                    ) : (
                      <span>-</span>
                    )}
                  </p>
                </div>

                {loadingTodos ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Memuat todo list...</div>
                ) : todoList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                    Tidak ada todo list untuk karyawan ini
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {todoList.map((todo) => (
                      <div
                        key={todo.id}
                        style={{
                          padding: "16px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "start",
                          gap: "12px",
                        }}
                      >
                        {getStatusIcon(todo.status)}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                              {todo.title || "-"}
                            </h3>
                            <span
                              style={{
                                fontSize: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background:
                                  todo.status === "completed"
                                    ? "#d1fae5"
                                    : todo.status === "in_progress"
                                    ? "#dbeafe"
                                    : "#fef3c7",
                                color:
                                  todo.status === "completed"
                                    ? "#065f46"
                                    : todo.status === "in_progress"
                                    ? "#1e40af"
                                    : "#92400e",
                              }}
                            >
                              {todo.status === "completed"
                                ? "Selesai"
                                : todo.status === "in_progress"
                                ? "Sedang Dikerjakan"
                                : "Pending"}
                            </span>
                          </div>
                          {todo.description && (
                            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>{todo.description}</p>
                          )}
                          <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#9ca3af" }}>
                            {todo.due_date && (
                              <span>Due: {formatDate(todo.due_date)}</span>
                            )}
                            {todo.priority && (
                              <span
                                style={{
                                  color:
                                    todo.priority === "high"
                                      ? "#dc2626"
                                      : todo.priority === "medium"
                                      ? "#f59e0b"
                                      : "#6b7280",
                                }}
                              >
                                Priority: {todo.priority === "high" ? "Tinggi" : todo.priority === "medium" ? "Sedang" : "Rendah"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
                <ListTodo size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <p>Pilih karyawan untuk melihat todo list mereka</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
