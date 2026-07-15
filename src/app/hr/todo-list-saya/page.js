"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import {
  Search,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Edit,
  Save,
  X,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function HrTodoListSayaPage() {
  const router = useRouter();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    due_date: "",
    search: "",
  });
  const [editingTodo, setEditingTodo] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      loadTodos();
    }
  }, [isAuthorized, filters]);

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

  const loadTodos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        return;
      }

      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.due_date) params.append("due_date", filters.due_date);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(getApiUrl(`todo-list/my-todos?${params}`), {
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

  const handleEditDescription = (todo) => {
    setEditingTodo(todo.id);
    setEditDescription(todo.description || "");
  };

  const handleSaveDescription = async (todoId) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl(`todo-list/${todoId}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: editDescription,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("Keterangan berhasil diperbarui");
          setEditingTodo(null);
          loadTodos();
        } else {
          toast.error(result.message || "Gagal memperbarui keterangan");
        }
      } else {
        toast.error("Gagal memperbarui keterangan");
      }
    } catch (error) {
      console.error("Error updating description:", error);
      toast.error("Gagal memperbarui keterangan");
    }
  };

  const handleUpdateStatus = async (todoId, newStatus) => {
    try {
      setUpdatingStatus({ ...updatingStatus, [todoId]: true });
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl(`todo-list/${todoId}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("Status berhasil diperbarui");
          loadTodos();
        } else {
          toast.error(result.message || "Gagal memperbarui status");
        }
      } else {
        toast.error("Gagal memperbarui status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdatingStatus({ ...updatingStatus, [todoId]: false });
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

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
          priority: newTodo.priority,
          due_date: newTodo.due_date || null,
          status: "pending",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("Todo list berhasil ditambahkan");
          setShowAddModal(false);
          setNewTodo({
            title: "",
            description: "",
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

  if (!isAuthorized) {
    return (
      <Layout title="Todo List Saya | HR">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Todo List Saya | HR">
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
              Todo List Saya
            </h1>
            <p style={{ color: "#6b7280", margin: 0 }}>Kelola todo list pribadi Anda</p>
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
            Tambah Todo
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
                    {editingTodo === todo.id ? (
                      <div style={{ marginBottom: "0.75rem" }}>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Keterangan..."
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            minHeight: "80px",
                            resize: "vertical",
                          }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <button
                            onClick={() => handleSaveDescription(todo.id)}
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
                            <Save size={14} />
                            Simpan
                          </button>
                          <button
                            onClick={() => {
                              setEditingTodo(null);
                              setEditDescription("");
                            }}
                            style={{
                              padding: "0.375rem 0.75rem",
                              backgroundColor: "#6b7280",
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
                            <X size={14} />
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <p
                          style={{
                            margin: 0,
                            color: "#6b7280",
                            fontSize: "0.875rem",
                            textDecoration: todo.status === "completed" ? "line-through" : "none",
                            flex: 1,
                          }}
                        >
                          {todo.description || "Tidak ada keterangan"}
                        </p>
                        <button
                          onClick={() => handleEditDescription(todo)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "transparent",
                            color: "#6366f1",
                            border: "1px solid #6366f1",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            marginLeft: "0.5rem",
                          }}
                        >
                          <Edit size={12} />
                          Edit
                        </button>
                      </div>
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
                  <select
                    value={todo.status}
                    onChange={(e) => handleUpdateStatus(todo.id, e.target.value)}
                    disabled={updatingStatus[todo.id]}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      backgroundColor: getStatusColor(todo.status) + "20",
                      color: getStatusColor(todo.status),
                      border: "1px solid " + getStatusColor(todo.status),
                      cursor: updatingStatus[todo.id] ? "not-allowed" : "pointer",
                      opacity: updatingStatus[todo.id] ? 0.6 : 1,
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  {todo.due_date && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#6b7280", fontSize: "0.875rem" }}>
                      <Calendar size={14} />
                      {new Date(todo.due_date).toLocaleDateString("id-ID")}
                    </span>
                  )}
                  {todo.creator && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <User size={14} />
                      Dibuat oleh: {todo.creator.nama || "Unknown"}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Tambah Todo List</h2>
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
