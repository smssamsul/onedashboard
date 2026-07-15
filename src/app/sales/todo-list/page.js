"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Edit,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function SalesTodoListPage() {
  const router = useRouter();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    status: "pending",
    due_date: "",
    is_reminder: false,
  });
  const [filters, setFilters] = useState({
    filter: "my_todos",
    priority: "",
    status: "",
    search: "",
  });
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // Check authentication
  useEffect(() => {
    // Try both token keys for compatibility
    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      setIsAuthorized(true);
    } else {
      router.push("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadTodos();
      loadUsers();
    }
  }, [isAuthorized, filters, pagination.current_page]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(getApiUrl("admin/users"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUsers(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadTodos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        return;
      }

      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...filters,
      });

      const response = await fetch(getApiUrl(`todo-list?${params}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
        localStorage.removeItem("user");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        return;
      }
      const url = editingTodo
        ? getApiUrl(`todo-list/${editingTodo.id}`)
        : getApiUrl("todo-list");
      const method = editingTodo ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Todo berhasil disimpan");
        setShowModal(false);
        resetForm();
        loadTodos();
      } else {
        toast.error(result.message || "Gagal menyimpan todo");
      }
    } catch (error) {
      console.error("Error saving todo:", error);
      toast.error("Gagal menyimpan todo");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus todo ini?")) return;

    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        return;
      }
      const response = await fetch(getApiUrl(`todo-list/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Todo berhasil dihapus");
        loadTodos();
      } else {
        toast.error(result.message || "Gagal menghapus todo");
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast.error("Gagal menghapus todo");
    }
  };

  const handleComplete = async (id) => {
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        return;
      }
      const response = await fetch(getApiUrl(`todo-list/${id}/complete`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Todo berhasil diselesaikan");
        loadTodos();
      } else {
        toast.error(result.message || "Gagal menyelesaikan todo");
      }
    } catch (error) {
      console.error("Error completing todo:", error);
      toast.error("Gagal menyelesaikan todo");
    }
  };

  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title || "",
      description: todo.description || "",
      assigned_to: todo.assigned_to || "",
      priority: todo.priority || "medium",
      status: todo.status || "pending",
      due_date: todo.due_date ? todo.due_date.split("T")[0] : "",
      is_reminder: todo.is_reminder || false,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assigned_to: "",
      priority: "medium",
      status: "pending",
      due_date: "",
      is_reminder: false,
    });
    setEditingTodo(null);
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

  return (
    <Layout title="Todo List Saya | Sales Dashboard">
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
              Todo List Saya
            </h1>
            <p style={{ color: "#6b7280", margin: 0 }}>Kelola tugas dan aktivitas harian Anda</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            <Plus size={18} />
            Tambah Todo
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={filters.filter}
            onChange={(e) => setFilters({ ...filters, filter: e.target.value })}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="my_todos">Todo Saya</option>
            <option value="created_by_me">Dibuat Oleh Saya</option>
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

          <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
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

        {/* Todo List */}
        {!isAuthorized ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p>Memeriksa autentikasi...</p>
          </div>
        ) : loading ? (
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
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <button
                  onClick={() => handleComplete(todo.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {todo.status === "completed" ? (
                    <CheckCircle2 size={24} color="#10b981" />
                  ) : (
                    <Circle size={24} color="#9ca3af" />
                  )}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
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
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => openEditModal(todo)}
                        style={{
                          padding: "0.5rem",
                          background: "none",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        <Edit size={16} color="#6b7280" />
                      </button>
                      <button
                        onClick={() => handleDelete(todo.id)}
                        style={{
                          padding: "0.5rem",
                          background: "none",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
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
                  </div>
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
              zIndex: 1000,
            }}
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "2rem",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600" }}>
                  {editingTodo ? "Edit Todo" : "Tambah Todo"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5rem",
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                    Judul *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                      Prioritas
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
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
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="">Pilih User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.is_reminder}
                      onChange={(e) => setFormData({ ...formData, is_reminder: e.target.checked })}
                    />
                    <span>Set Reminder</span>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    style={{
                      padding: "0.75rem 1.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "0.75rem 1.5rem",
                      border: "none",
                      borderRadius: "6px",
                      background: "#4f46e5",
                      color: "white",
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
