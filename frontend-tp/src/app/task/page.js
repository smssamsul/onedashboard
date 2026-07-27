"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import {
  getMyTasks,
  getTeamTasks,
  getPendingApprovals,
  createTask,
  updateTask,
  approveTask,
  rejectTask,
  getTaskDetail,
} from "@/lib/task";
import { getApiUrl } from "@/config/api";
import { toastSuccess, toastError } from "@/lib/toast";
import { Plus, Check, X, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/admin.css";

const CreateTaskModal = dynamic(() => import("./createTaskModal"), { ssr: false });
const TimelineView = dynamic(() => import("./timelineView"), { ssr: false });
const ReportView = dynamic(() => import("./reportView"), { ssr: false });

const STATUS_LABEL = { belum_mulai: "Belum Mulai", berjalan: "Berjalan", selesai: "Selesai" };

function StatusBadge({ status }) {
  const colors = {
    belum_mulai: { bg: "#f3f4f6", text: "#374151" },
    berjalan: { bg: "#e4ecf7", text: "#1e4576" },
    selesai: { bg: "#dff0e7", text: "#2e7d5b" },
  };
  const c = colors[status] || colors.belum_mulai;
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: c.bg, color: c.text }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function PersetujuanBanner({ task }) {
  if (!task.status_persetujuan || task.status_persetujuan === "disetujui") return null;

  if (task.status_persetujuan === "ditolak") {
    return (
      <div style={{ fontSize: 12.5, color: "#a85a22", background: "#f3e4d5", padding: "6px 10px", borderRadius: 8, marginTop: 8 }}>
        Task ditolak dalam rantai persetujuan.
      </div>
    );
  }

  const jenjangAktif = (task.persetujuan || []).find((p) => p.status === "menunggu");
  return (
    <div style={{ fontSize: 12.5, color: "#a85a22", background: "#f3e4d5", padding: "6px 10px", borderRadius: 8, marginTop: 8 }}>
      Menunggu persetujuan {jenjangAktif?.approver?.nama || "atasan"} (jenjang {jenjangAktif?.jenjang || "?"}
      {task.persetujuan?.length ? ` dari ${task.persetujuan.length}` : ""})
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, borderRadius: 4, background: "#e7ecf2", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: "#2b5fa8", borderRadius: 4 }} />
      </div>
      <p style={{ fontSize: 11.5, color: "#8695a6", margin: "4px 0 0" }}>{value}% selesai</p>
    </div>
  );
}

function Timeline({ items }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: 13, color: "#8695a6" }}>Belum ada riwayat.</p>;
  }
  return (
    <div style={{ marginTop: 10, borderTop: "1px solid #e7ecf2", paddingTop: 10 }}>
      {items.map((r) => (
        <div key={r.id} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12.5 }}>
          <span style={{ color: "#8695a6", fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {new Date(r.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span>
            <b style={{ fontWeight: 600 }}>{r.pelaku?.nama || "?"}</b> — {r.keterangan || r.aksi}
          </span>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task, editable, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [statusEdit, setStatusEdit] = useState(task.status);
  const [progresEdit, setProgresEdit] = useState(task.persentase_penyelesaian);
  const [saving, setSaving] = useState(false);

  const bisaDiedit = editable && task.status_persetujuan !== "menunggu" && task.status_persetujuan !== "ditolak";

  const toggleExpand = async () => {
    if (!expanded && !detail) {
      try {
        const data = await getTaskDetail(task.id);
        setDetail(data);
      } catch (err) {
        toastError(err.message || "Gagal memuat riwayat");
      }
    }
    setExpanded((v) => !v);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateTask(task.id, { status: statusEdit, persentase_penyelesaian: Number(progresEdit) });
      toastSuccess("Task diperbarui");
      onUpdated(updated);
      setDetail(null);
    } catch (err) {
      toastError(err.message || "Gagal memperbarui task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>{task.judul}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#6b7280" }}>
            {task.pemilik?.nama ? `${task.pemilik.nama} · ` : ""}
            dibuat oleh {task.pembuat?.nama || "-"}
            {task.tenggat ? ` · target selesai ${new Date(task.tenggat).toLocaleDateString("id-ID")}` : ""}
          </p>
          {task.deskripsi && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#374151" }}>{task.deskripsi}</p>}
        </div>
        <StatusBadge status={task.status} />
      </div>

      <PersetujuanBanner task={task} />
      <ProgressBar value={task.persentase_penyelesaian} />

      {editable && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <select
            value={statusEdit}
            onChange={(e) => setStatusEdit(e.target.value)}
            disabled={!bisaDiedit}
            style={{ padding: "0.4rem 0.6rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
          >
            <option value="belum_mulai">Belum Mulai</option>
            <option value="berjalan">Berjalan</option>
            <option value="selesai">Selesai</option>
          </select>
          <input
            type="number"
            min={0}
            max={100}
            value={progresEdit}
            onChange={(e) => setProgresEdit(e.target.value)}
            disabled={!bisaDiedit}
            style={{ width: 70, padding: "0.4rem 0.6rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
          />
          <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
          <button
            className="customers-button customers-button--primary"
            onClick={handleSave}
            disabled={!bisaDiedit || saving}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      )}

      <button
        onClick={toggleExpand}
        style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, background: "none", border: "none", color: "#2b5fa8", fontSize: 12.5, cursor: "pointer", padding: 0 }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Riwayat
      </button>
      {expanded && <Timeline items={detail?.riwayat} />}
    </div>
  );
}

function ApprovalCard({ item, onDecided }) {
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  const handleDecide = async (keputusan) => {
    setSaving(true);
    try {
      if (keputusan === "disetujui") {
        await approveTask(item.task_id, catatan);
        toastSuccess("Task disetujui");
      } else {
        await rejectTask(item.task_id, catatan);
        toastSuccess("Task ditolak");
      }
      onDecided(item.id);
    } catch (err) {
      toastError(err.message || "Gagal memproses persetujuan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 }}>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>{item.task?.judul}</p>
      <p style={{ margin: "2px 0 10px", fontSize: 12.5, color: "#6b7280" }}>
        Untuk {item.task?.pemilik?.nama || "-"} &middot; dibuat oleh {item.task?.pembuat?.nama || "-"} &middot; jenjang {item.jenjang}
      </p>
      {item.task?.deskripsi && <p style={{ margin: "0 0 10px", fontSize: 13, color: "#374151" }}>{item.task.deskripsi}</p>}
      <textarea
        placeholder="Catatan (opsional)"
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        rows={2}
        style={{ width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="customers-button customers-button--primary" onClick={() => handleDecide("disetujui")} disabled={saving}>
          <Check size={16} /> Setujui
        </button>
        <button className="customers-button customers-button--secondary" onClick={() => handleDecide("ditolak")} disabled={saving}>
          <X size={16} /> Tolak
        </button>
      </div>
    </div>
  );
}

export default function TaskPage() {
  const router = useRouter();
  const [tab, setTab] = useState("saya");
  const [tasksSaya, setTasksSaya] = useState([]);
  const [tasksTim, setTasksTim] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [karyawanList, setKaryawanList] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
    }
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [saya, tim, appr] = await Promise.all([getMyTasks(), getTeamTasks(), getPendingApprovals()]);
      setTasksSaya(saya);
      setTasksTim(tim);
      setApprovals(appr);
    } catch (err) {
      console.error("Error loading task:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(getApiUrl("hr/karyawan?all=true&status=1"), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setKaryawanList(result.data || []);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (payload) => {
    try {
      await createTask(payload);
      toastSuccess("Task berhasil dibuat");
      setShowCreate(false);
      loadAll();
    } catch (err) {
      toastError(err.message || "Gagal membuat task");
    }
  };

  const handleUpdated = (updated) => {
    setTasksSaya((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDecided = (persetujuanId) => {
    setApprovals((prev) => prev.filter((a) => a.id !== persetujuanId));
    loadAll();
  };

  const tabs = [
    { key: "saya", label: "Task Saya", count: tasksSaya.length },
    { key: "tim", label: "Task Tim", count: tasksTim.length },
    { key: "approval", label: "Menunggu Approval Saya", count: approvals.length },
    { key: "timeline", label: "Timeline" },
    { key: "laporan", label: "Laporan" },
  ];

  return (
    <Layout title="Task">
      <div className="dashboard-shell customers-shell table-shell">
        <section className="panel users-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">
                <ListChecks size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />
                Task Lintas Divisi
              </p>
              <h3 className="panel__title">Kerjaan tim, satu tempat</h3>
            </div>
            <button className="customers-button customers-button--primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Buat Task
            </button>
          </div>

          <div style={{ display: "flex", gap: 4, padding: "0 1.5rem 1rem", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: 8,
                  border: "none",
                  background: tab === t.key ? "#e4ecf7" : "transparent",
                  color: tab === t.key ? "#1e4576" : "#6b7280",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
              </button>
            ))}
          </div>

          <div style={{ padding: "1.25rem 1.5rem" }}>
            {tab === "timeline" ? (
              <TimelineView />
            ) : tab === "laporan" ? (
              <ReportView />
            ) : loading ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Memuat data...</p>
            ) : tab === "saya" ? (
              tasksSaya.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>Belum ada task.</p>
              ) : (
                tasksSaya.map((t) => <TaskCard key={t.id} task={t} editable onUpdated={handleUpdated} />)
              )
            ) : tab === "tim" ? (
              tasksTim.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>Tidak ada task dari bawahan langsung Anda.</p>
              ) : (
                tasksTim.map((t) => <TaskCard key={t.id} task={t} editable={false} onUpdated={() => {}} />)
              )
            ) : approvals.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Tidak ada yang menunggu persetujuan Anda.</p>
            ) : (
              approvals.map((a) => <ApprovalCard key={a.id} item={a} onDecided={handleDecided} />)
            )}
          </div>
        </section>

        {showCreate && (
          <CreateTaskModal
            karyawanList={karyawanList}
            onClose={() => setShowCreate(false)}
            onSave={handleCreate}
          />
        )}
      </div>
    </Layout>
  );
}
