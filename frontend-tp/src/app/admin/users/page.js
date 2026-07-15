"use client";

import Layout from "@/components/Layout";
import { useEffect, useMemo, useState, memo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Users2, FolderOpen, Pause } from "lucide-react";
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/users";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";

// Lazy load modals
const AddUserModal = dynamic(() => import("./addUsers"), { ssr: false });
const EditUserModal = dynamic(() => import("./editUsers"), { ssr: false });
const DeleteUserModal = dynamic(() => import("./deleteUsers"), { ssr: false });
const ViewUserModal = dynamic(() => import("./viewUsers"), { ssr: false });
const EmailSyncWarningModal = dynamic(() => import("./emailSyncWarning"), { ssr: false });

const DIVISI_MAP = {
  1: "Admin Super",
  2: "Owner",
  3: "Sales",
  4: "Finance",
  5: "HR",
  11: "Trainer",
};

const LEVEL_MAP = {
  1: "Leader",
  2: "Staff",
};

const DIVISION_PILL_MAP = {
  1: "users-pill--gold",
  2: "users-pill--gold",
  3: "users-pill--gold",
  4: "users-pill--gold",
};

const TABLE_COLUMNS = ["#", "Member", "Division", "Contact", "Timeline", "Actions"];

const DEFAULT_TOAST = { show: false, message: "", type: "success" };

const formatDate = (value) => {
  if (!value) return "-";
  
  // Handle format dd-mm-yyyy dari backend
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  
  // Handle format lain (ISO, dll)
  const normalized = value.toString().replace(/-/g, "/");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

const getDivisionClass = (divisi) => DIVISION_PILL_MAP[String(divisi)] || "users-pill--muted";
const getAddressPreview = (value) => (value ? value.slice(0, 80) + (value.length > 80 ? "…" : "") : "Address not provided");

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showView, setShowView] = useState(false);
  const [toast, setToast] = useState(DEFAULT_TOAST);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [emailWarningData, setEmailWarningData] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      if (user.status !== "1") return false;
      if (!term) return true;

      return (
        user.nama?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.divisi?.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

const summaryCards = useMemo(
    () => [
      {
        label: "Active users",
        value: filteredUsers.length,
        accent: "accent-emerald",
        icon: <Users2 size={22} />,
      },
      {
        label: "Directory size",
        value: users.length,
        accent: "accent-indigo",
        icon: <FolderOpen size={22} />,
      },
      {
        label: "Inactive",
        value: Math.max(users.length - filteredUsers.length, 0),
        accent: "accent-amber",
        icon: <Pause size={22} />,
      },
    ],
    [filteredUsers.length, users.length]
  );

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(DEFAULT_TOAST), 2500);
  };

  const refreshUsers = async () => {
    const data = await getUsers();
    setUsers(data);
  };

  const handleSaveAdd = async (newUser) => {
    try {
      console.log("[CREATE_USER] Creating user with payload:", newUser);
      const result = await createUser(newUser);
      console.log("[CREATE_USER] Create result:", result);
      
      if (!result.success) {
        throw new Error(result.message || "Gagal menambahkan user");
      }
      
      await refreshUsers();
      showToast("User berhasil ditambahkan!");
    } catch (err) {
      console.error("[CREATE_USER] Error creating user:", err);
      console.error("[CREATE_USER] Error details:", {
        message: err.message,
        status: err.status,
        data: err.data,
        validationErrors: err.validationErrors
      });
      
      // Re-throw error dengan detail untuk ditampilkan di modal
      throw err;
    } finally {
      setShowAdd(false);
    }
  };

  const handleSaveEdit = async (updatedData) => {
    if (!selectedUser) return;

    try {
      console.log("[UPDATE_USER] Updating user:", {
        id: selectedUser.id,
        oldEmail: selectedUser.email,
        newEmail: updatedData.email,
        data: updatedData
      });
      
      const result = await updateUser(selectedUser.id, updatedData);
      
      console.log("[UPDATE_USER] Update result:", result);
      
      // ⚠️ PERINGATAN: Jika email berubah, backend harus update email di tabel authentication juga
      if (selectedUser.email !== updatedData.email) {
        // Set warning modal data
        setEmailWarningData({
          userId: selectedUser.id,
          oldEmail: selectedUser.email,
          newEmail: updatedData.email,
        });
        setShowEmailWarning(true);
        
        showToast(
          `Email berubah! User harus login dengan email lama sampai backend di-fix.`,
          "warning"
        );
        
        // Log untuk debugging
        console.warn("[EMAIL_CHANGE] Email changed but backend must update authentication table:", {
          userId: selectedUser.id,
          oldEmail: selectedUser.email,
          newEmail: updatedData.email,
          note: "Backend harus sync email ke tabel authentication/login",
          sqlFix: `UPDATE auth_table SET email = '${updatedData.email}' WHERE user_id = ${selectedUser.id};`
        });
      } else {
        showToast("Perubahan berhasil disimpan!");
      }
      
      await refreshUsers();
    } catch (err) {
      console.error("[UPDATE_USER] Error updating user:", err);
      showToast("Gagal menyimpan perubahan", "error");
    } finally {
      setShowEdit(false);
      setSelectedUser(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.id);
      await refreshUsers();
      showToast("User berhasil dinonaktifkan!", "warning");
    } catch (err) {
      console.error("Error deleting user:", err);
      showToast("Gagal menonaktifkan user", "error");
    } finally {
      setShowDelete(false);
      setSelectedUser(null);
    }
  };

const handleCloseModals = () => {
    setShowAdd(false);
    setShowEdit(false);
    setShowDelete(false);
    setSelectedUser(null);
  };

  return (
    <Layout title="Users | One Dashboard">
      <div className="dashboard-shell admin-users-shell">
        <section className="dashboard-hero admin-users-hero">
          <div className="dashboard-hero__copy">
            <p className="dashboard-hero__eyebrow">Team</p>
            <h2 className="dashboard-hero__title">Manage Users</h2>
            <span className="dashboard-hero__meta">
              Keep your internal team directory aligned and searchable.
            </span>
          </div>

          <div className="users-toolbar">
            <div className="users-search">
              <input
                type="search"
                placeholder="Search name, email, division"
                className="users-search__input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="users-search__icon pi pi-search" />
            </div>
            <button className="users-button users-button--primary" onClick={() => setShowAdd(true)}>
              + Add User
            </button>
          </div>
        </section>

        <section className="dashboard-summary admin-users-summary">
          {summaryCards.map((card) => (
            <article className="summary-card" key={card.label}>
              <div className={`summary-card__icon ${card.accent}`}>{card.icon}</div>
              <div>
                <p className="summary-card__label">{card.label}</p>
                <p className="summary-card__value">{card.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="panel users-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Team roster</h3>
            </div>
            <span className="panel__meta">{filteredUsers.length} active members</span>
          </div>

          <div className="users-tables__wrapper">
            <div className="users-tables">
              <div className="users-tables__head">
                {TABLE_COLUMNS.map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </div>
              <div className="users-tables__body">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const divisionLabel = DIVISI_MAP[user.divisi] || user.divisi || "-";
                    const divisionClass = getDivisionClass(user.divisi);
                    const addressText = user.alamat?.trim() || "Address not provided";
                    const phoneText = user.no_telp?.trim() || "Phone not provided";

                    return (
                      <div className="users-tables__row" key={user.id || `${user.email}-${index}`}>
                        <div className="users-tables__cell" data-label="#">
                          {index + 1}
                        </div>
                        <div className="users-tables__cell users-tables__cell--strong" data-label="Member">
                          <div className="users-meta">
                            <p className="users-name">{user.nama || "Unnamed user"}</p>
                            <p className="users-email">{user.email || "Email unavailable"}</p>
                          </div>
                        </div>
                        <div className="users-tables__cell" data-label="Division">
                          <span className={`users-pill ${divisionClass}`}>{divisionLabel}</span>
                        </div>
                        <div className="users-tables__cell" data-label="Contact">
                          <p className="users-contact-line">{phoneText}</p>
                          <p className="users-contact-line">{getAddressPreview(addressText)}</p>
                          <span className="users-contact-line users-contact-line--muted">
                            Joined {formatDate(user.tanggal_join)}
                          </span>
                        </div>
                        <div className="users-tables__cell" data-label="Timeline">
                          <div className="users-timeline-item">
                            <span className="users-label">
                              <i className="pi pi-calendar" /> Birth
                            </span>
                            <span className="users-value">{formatDate(user.tanggal_lahir)}</span>
                          </div>
                        </div>
                        <div className="users-tables__cell users-tables__cell--actions" data-label="Actions">
                          <button
                            className="users-action-btn users-action-btn--ghost"
                            title="View user"
                            aria-label="View user"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowView(true);
                            }}
                          >
                            <i className="pi pi-eye" />
                          </button>
                          <button
                            className="users-action-btn users-action-btn--ghost"
                            title="Edit user"
                            aria-label="Edit user"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEdit(true);
                            }}
                          >
                            <i className="pi pi-pencil" />
                          </button>
                          <button
                            className="users-action-btn users-action-btn--danger"
                            title="Disable user"
                            aria-label="Disable user"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDelete(true);
                            }}
                          >
                            <i className="pi pi-trash" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="users-empty">
                    {users.length ? "No matching users." : "Loading data..."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSave={handleSaveAdd} />}

        {showEdit && (
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setShowEdit(false);
              setSelectedUser(null);
            }}
            onSave={handleSaveEdit}
          />
        )}

        {showDelete && (
          <DeleteUserModal
            user={selectedUser}
            onClose={() => {
              setShowDelete(false);
              setSelectedUser(null);
            }}
            onConfirm={handleConfirmDelete}
          />
        )}

        {showView && selectedUser && (
          <ViewUserModal
            user={selectedUser}
            onClose={() => {
              setShowView(false);
              setSelectedUser(null);
            }}
          />
        )}

        {toast.show && (
          <div className={`toast toast-${toast.type || "success"} toast-show`}>
            <div className="toast-icon">
              {toast.type === "error" ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : toast.type === "warning" ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
            </div>
            <button 
              className="toast-close"
              onClick={() => setToast({ show: false, message: "", type: "success" })}
              aria-label="Close"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="toast-progress"></div>
          </div>
        )}

        {/* Email Warning Modal */}
        {showEmailWarning && emailWarningData && (
          <EmailSyncWarningModal
            userId={emailWarningData.userId}
            oldEmail={emailWarningData.oldEmail}
            newEmail={emailWarningData.newEmail}
            onClose={() => {
              setShowEmailWarning(false);
              setEmailWarningData(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
