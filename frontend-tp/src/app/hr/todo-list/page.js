"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import {
  Search,
  Calendar,
  User,
  Plus,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function HrTodoListPage() {
  const router = useRouter();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [karyawanList, setKaryawanList] = useState([]);
  const [filters, setFilters] = useState({
    karyawan_id: "",
    status: "",
    priority: "",
    due_date: "",
    tanggal_mulai: "",
    tanggal_akhir: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    due_date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [userList, setUserList] = useState([]);

  useEffect(() => {
    checkAccess();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      loadKaryawanList();
      loadTodos();
      loadUserList();
    }
  }, [isAuthorized, filters, pagination.current_page]);

  const checkAccess = () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/login");
        return;
      }

      const user = JSON.parse(userData);
      const userDivisi = user?.divisi;

      // Divisi 5 = HR
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

  const loadKaryawanList = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl("hr/karyawan?all=true&status=1"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setKaryawanList(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error loading karyawan:", error);
    }
  };

  const loadUserList = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl("user?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUserList(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      if (!newTodo.assigned_to) {
        toast.error("Pilih karyawan terlebih dahulu");
        return;
      }

      // Find user_id from karyawan
      const karyawan = karyawanList.find((k) => k.id.toString() === newTodo.assigned_to);
      if (!karyawan || !karyawan.user_id) {
        toast.error("Karyawan tidak memiliki user ID");
        return;
      }

      const response = await fetch(getApiUrl("todo-list"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTodo.title,
          description: newTodo.description || null,
          assigned_to: karyawan.user_id,
          priority: newTodo.priority,
          due_date: newTodo.due_date || null,
          status: "pending",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("Todo list berhasil ditambahkan ke karyawan");
          setShowAddModal(false);
          setNewTodo({
            title: "",
            description: "",
            assigned_to: "",
            priority: "medium",
            due_date: "",
          });
          loadTodos();
        } else {
          toast.error(result.message || "Gagal menambahkan todo list");
        }
      } else {
        toast.error("Gagal menambahkan todo list");
      }
    } catch (error) {
      console.error("Error adding todo:", error);
      toast.error("Gagal menambahkan todo list");
    } finally {
      setSubmitting(false);
    }
  };

  const loadTodos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        return;
      }

      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        ),
      });

      const response = await fetch(getApiUrl(`hr/todo-list?${params}`), {
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
        setTodos(result.data || []);
        if (result.pagination) {
          setPagination((prev) => ({
            ...prev,
            current_page: result.pagination.current_page,
            last_page: result.pagination.last_page,
            total: result.pagination.total,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading todos:", error);
      toast.error("Gagal memuat todo list");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "in_progress":
        return "#3b82f6";
      case "pending":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  if (!isAuthorized) return null;

  return (
    <Layout title="Todo List Karyawan | HR Dashboard">
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
              Todo List Karyawan
            </h1>
            <p style={{ color: "#6b7280", margin: 0 }}>Kelola dan monitor todo list semua karyawan</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
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
            Tambah Todo ke Karyawan
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <select
              value={filters.karyawan_id}
              onChange={(e) => setFilters({ ...filters, karyawan_id: e.target.value })}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="">Semua Karyawan</option>
              {karyawanList.map((karyawan) => (
                <option key={karyawan.id} value={karyawan.id}>
                  {karyawan.nama}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="">Semua Prioritas</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <input
              type="date"
              value={filters.due_date}
              onChange={(e) => setFilters({ ...filters, due_date: e.target.value })}
              placeholder="Due Date"
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />

            <div style={{ position: "relative", gridColumn: "1 / -1" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                type="text"
                placeholder="Cari todo..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem 0.5rem 2.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              />
            </div>
          </div>
        </div>

        {/* Todo List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p>Memuat data...</p>
          </div>
        ) : todos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280" }}>Tidak ada todo list</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {todos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "1.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 0.5rem 0",
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        textDecoration: todo.status === "completed" ? "line-through" : "none",
                        color: todo.status === "completed" ? "#9ca3af" : "#111827",
                      }}
                    >
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p
                        style={{
                          margin: "0 0 0.75rem 0",
                          color: "#6b7280",
                          fontSize: "0.875rem",
                          textDecoration: todo.status === "completed" ? "line-through" : "none",
                        }}
                      >
                        {todo.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      backgroundColor: getPriorityColor(todo.priority) + "20",
                      color: getPriorityColor(todo.priority),
                    }}
                  >
                    {todo.priority === "high" ? "High" : todo.priority === "medium" ? "Medium" : "Low"}
                  </span>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      backgroundColor: getStatusColor(todo.status) + "20",
                      color: getStatusColor(todo.status),
                    }}
                  >
                    {todo.status === "completed" ? "Completed" : todo.status === "in_progress" ? "In Progress" : "Pending"}
                  </span>
                  {todo.due_date && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#6b7280", fontSize: "0.875rem" }}>
                      <Calendar size={14} />
                      {new Date(todo.due_date).toLocaleDateString("id-ID")}
                    </span>
                  )}
                  {todo.assignee && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#6b7280", fontSize: "0.875rem" }}>
                      <User size={14} />
                      {todo.assignee.nama}
                    </span>
                  )}
                  {todo.creator && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Dibuat oleh: {todo.creator.nama}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
            <button
              onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
              disabled={pagination.current_page === 1}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: pagination.current_page === 1 ? "not-allowed" : "pointer",
                opacity: pagination.current_page === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
              disabled={pagination.current_page === pagination.last_page}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: pagination.current_page === pagination.last_page ? "not-allowed" : "pointer",
                opacity: pagination.current_page === pagination.last_page ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* Add Todo Modal */}
        {showAddModal && (
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
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "100%",
                maxWidth: "500px",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Tambah Todo ke Karyawan</h2>
                <button
                  onClick={() => setShowAddModal(false)}
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

              <form onSubmit={handleAddTodo}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Karyawan *
                  </label>
                  <select
                    value={newTodo.assigned_to}
                    onChange={(e) => setNewTodo({ ...newTodo, assigned_to: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="">Pilih Karyawan</option>
                    {karyawanList.map((karyawan) => (
                      <option key={karyawan.id} value={karyawan.id}>
                        {karyawan.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Judul *
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
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

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Keterangan
                  </label>
                  <textarea
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                      Prioritas
                    </label>
                    <select
                      value={newTodo.priority}
                      onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.625rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTodo.due_date}
                      onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.625rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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
                    disabled={submitting}
                    style={{
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting ? "Menyimpan..." : "Simpan"}
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
