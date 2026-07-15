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
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function FinanceTodoListSayaPage() {
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

      // Divisi 4 = Finance
      if (userDivisi !== 4 && userDivisi !== "4" && userDivisi !== "finance") {
        alert("Akses ditolak. Hanya Finance yang dapat mengakses halaman ini.");
        router.push("/finance");
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

  if (!isAuthorized) {
    return (
      <Layout title="Todo List Saya | Finance">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Todo List Saya | Finance">
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
            Todo List Saya
          </h1>
          <p style={{ color: "#6b7280", margin: 0 }}>Kelola todo list pribadi Anda</p>
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
                  {todo.created_by && todo.created_by !== todo.assigned_to && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Dari: {todo.created_by?.nama || "Atasan"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
