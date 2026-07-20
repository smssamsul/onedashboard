"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import EmployeeCardNode from "@/components/org-chart/EmployeeCardNode";
import DeletableEdge from "@/components/org-chart/DeletableEdge";
import { JABATAN_MAP } from "@/lib/jabatanLabels";

const EMPTY_ADD_FORM = {
  nama: "",
  email: "",
  jabatan: "",
  departemen: "",
  tanggal_join: new Date().toISOString().slice(0, 10),
};

const NODE_TYPES = { employeeCard: EmployeeCardNode };
const EDGE_TYPES = { atasanEdge: DeletableEdge };
const NODE_WIDTH = 220;
const NODE_HEIGHT = 76;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function layoutMissingPositions(rawKaryawan) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 90 });

  rawKaryawan.forEach((k) => g.setNode(String(k.id), { width: NODE_WIDTH, height: NODE_HEIGHT }));
  rawKaryawan.forEach((k) => {
    if (k.approval) g.setEdge(String(k.approval), String(k.id));
  });

  dagre.layout(g);

  const positions = {};
  rawKaryawan.forEach((k) => {
    const pos = g.node(String(k.id));
    positions[k.id] = pos
      ? { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 }
      : { x: 0, y: 0 };
  });
  return positions;
}

function buildNodesAndEdges(rawKaryawan, canEdit, onDeleteEdge) {
  const dagrePositions = layoutMissingPositions(rawKaryawan);

  const nodes = rawKaryawan.map((k) => {
    const hasSavedPosition = k.posisi_x !== null && k.posisi_x !== undefined && k.posisi_y !== null && k.posisi_y !== undefined;
    const position = hasSavedPosition ? { x: k.posisi_x, y: k.posisi_y } : dagrePositions[k.id];

    return {
      id: String(k.id),
      type: "employeeCard",
      position,
      draggable: canEdit,
      connectable: canEdit,
      deletable: false,
      data: {
        karyawanId: k.id,
        nama: k.nama,
        jabatan: k.jabatan,
        avatar_url: k.avatar_url,
        departemenNama: k.departemen_rel?.nama || null,
        isDireksi: String(k.user_rel?.divisi) === "9",
        canEdit,
      },
    };
  });

  const edges = rawKaryawan
    .filter((k) => k.approval)
    .map((k) => ({
      id: `e-${k.approval}-${k.id}`,
      source: String(k.approval),
      target: String(k.id),
      type: "atasanEdge",
      deletable: canEdit,
      reconnectable: canEdit,
      style: { stroke: "#9ca3af", strokeWidth: 1.5 },
      data: { canEdit, onDelete: onDeleteEdge },
    }));

  return { nodes, edges };
}

function OrgChartCanvas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawKaryawan, setRawKaryawan] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving] = useState(false);
  const [confirmSummary, setConfirmSummary] = useState(null);
  const originalApprovalRef = useRef({});
  const [dirtyCount, setDirtyCount] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [departemenList, setDepartemenList] = useState([]);

  const currentUser = getCurrentUser();
  const divisi = String(currentUser?.divisi ?? "");
  const canEdit = divisi === "5" || divisi === "9";

  const recomputeDirty = useCallback((currentEdges, currentNodesMoved) => {
    const approvalMap = {};
    currentEdges.forEach((e) => {
      approvalMap[e.target] = e.source;
    });
    let count = 0;
    rawKaryawan.forEach((k) => {
      const currentApproval = approvalMap[String(k.id)] ? Number(approvalMap[String(k.id)]) : null;
      const original = originalApprovalRef.current[k.id] || null;
      if (currentApproval !== original) count++;
    });
    setDirtyCount(count + currentNodesMoved);
  }, [rawKaryawan]);

  const movedNodeIds = useRef(new Set());

  const deleteEdge = useCallback((edgeId) => {
    setEdges((eds) => {
      const next = eds.filter((e) => e.id !== edgeId);
      recomputeDirty(next, movedNodeIds.current.size);
      return next;
    });
  }, [setEdges, recomputeDirty]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(getApiUrl("hr/org-chart"), {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal memuat data");

      const list = json.data || [];
      originalApprovalRef.current = Object.fromEntries(list.map((k) => [k.id, k.approval || null]));

      const { nodes: n, edges: e } = buildNodesAndEdges(list, canEdit, deleteEdge);
      setRawKaryawan(list);
      setNodes(n);
      setEdges(e);
      setDirtyCount(0);
      movedNodeIds.current = new Set();
    } catch (e) {
      console.error("[ORG CHART] Gagal memuat:", e);
      setError("Gagal memuat data struktur organisasi.");
    } finally {
      setLoading(false);
    }
  }, [canEdit, setNodes, setEdges, deleteEdge]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNodeDragStop = useCallback((_evt, node) => {
    if (!canEdit) return;
    movedNodeIds.current.add(node.id);
    recomputeDirty(edges, movedNodeIds.current.size);
  }, [canEdit, edges, recomputeDirty]);

  const onConnect = useCallback((params) => {
    if (!canEdit || params.source === params.target) return;
    setEdges((eds) => {
      // approval scalar - satu target cuma boleh 1 garis masuk, ganti bukan nambah
      const filtered = eds.filter((e) => e.target !== params.target);
      const next = addEdge(
        {
          ...params,
          id: `e-${params.source}-${params.target}`,
          type: "atasanEdge",
          deletable: true,
          reconnectable: true,
          style: { stroke: "#2563eb", strokeWidth: 2 },
          data: { canEdit, onDelete: deleteEdge },
        },
        filtered
      );
      recomputeDirty(next, movedNodeIds.current.size);
      return next;
    });
  }, [canEdit, setEdges, recomputeDirty, deleteEdge]);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    if (!canEdit || newConnection.source === newConnection.target) return;
    setEdges((eds) => {
      // buang edge lama + edge lain yang sudah masuk ke target baru (approval scalar - 1 atasan saja)
      const filtered = eds.filter((e) => e.id !== oldEdge.id && e.target !== newConnection.target);
      const next = [
        ...filtered,
        {
          id: `e-${newConnection.source}-${newConnection.target}`,
          source: newConnection.source,
          target: newConnection.target,
          sourceHandle: newConnection.sourceHandle,
          targetHandle: newConnection.targetHandle,
          type: "atasanEdge",
          deletable: true,
          reconnectable: true,
          style: { stroke: "#2563eb", strokeWidth: 2 },
          data: { canEdit, onDelete: deleteEdge },
        },
      ];
      recomputeDirty(next, movedNodeIds.current.size);
      return next;
    });
  }, [canEdit, setEdges, recomputeDirty, deleteEdge]);

  const onEdgesDelete = useCallback((deleted) => {
    if (!canEdit) return;
    setEdges((eds) => {
      const remainingIds = new Set(deleted.map((d) => d.id));
      const next = eds.filter((e) => !remainingIds.has(e.id));
      recomputeDirty(next, movedNodeIds.current.size);
      return next;
    });
  }, [canEdit, setEdges, recomputeDirty]);

  useEffect(() => {
    if (!canEdit || dirtyCount === 0) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [canEdit, dirtyCount]);

  const nameById = useMemo(() => Object.fromEntries(rawKaryawan.map((k) => [String(k.id), k.nama])), [rawKaryawan]);

  const openAddModal = async () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddError("");
    setShowAddModal(true);
    if (departemenList.length === 0) {
      try {
        const res = await fetch(getApiUrl("hr/departemen"), {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        });
        const json = await res.json();
        setDepartemenList(json.data || []);
      } catch (e) {
        console.error("[ORG CHART] Gagal memuat departemen:", e);
      }
    }
  };

  const submitAddKaryawan = async () => {
    if (!addForm.nama.trim() || !addForm.jabatan || !addForm.tanggal_join) {
      setAddError("Nama, jabatan, dan tanggal join wajib diisi.");
      return;
    }
    setAddSaving(true);
    setAddError("");
    try {
      const res = await fetch(getApiUrl("hr/karyawan"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nama: addForm.nama.trim(),
          email: addForm.email.trim() || null,
          jabatan: Number(addForm.jabatan),
          departemen: addForm.departemen || null,
          tanggal_join: addForm.tanggal_join,
          status: "1",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Gagal menambah karyawan");
      }

      setShowAddModal(false);
      await load(); // kartu baru otomatis muncul (dagre auto-layout krn belum ada posisi tersimpan)
    } catch (e) {
      console.error("[ORG CHART] Gagal tambah karyawan:", e);
      setAddError(e.message || "Gagal menambah karyawan.");
    } finally {
      setAddSaving(false);
    }
  };

  const openConfirm = () => {
    const approvalMap = {};
    edges.forEach((e) => {
      approvalMap[e.target] = e.source;
    });

    const changes = [];
    rawKaryawan.forEach((k) => {
      const newApproval = approvalMap[String(k.id)] ? Number(approvalMap[String(k.id)]) : null;
      const oldApproval = originalApprovalRef.current[k.id] || null;
      if (newApproval !== oldApproval) {
        changes.push({
          nama: k.nama,
          from: oldApproval ? nameById[String(oldApproval)] || `#${oldApproval}` : "(tidak ada atasan)",
          to: newApproval ? nameById[String(newApproval)] || `#${newApproval}` : "(tidak ada atasan)",
        });
      }
    });

    setConfirmSummary({ changes, positionsMovedCount: movedNodeIds.current.size });
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const approvalMap = {};
      edges.forEach((e) => {
        approvalMap[e.target] = e.source;
      });
      const posById = Object.fromEntries(nodes.map((n) => [n.id, n.position]));

      const payload = {
        nodes: rawKaryawan.map((k) => ({
          id: k.id,
          posisi_x: posById[String(k.id)]?.x ?? k.posisi_x,
          posisi_y: posById[String(k.id)]?.y ?? k.posisi_y,
          approval: approvalMap[String(k.id)] ? Number(approvalMap[String(k.id)]) : null,
        })),
      };

      const res = await fetch(getApiUrl("hr/org-chart/save"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal menyimpan");

      setConfirmSummary(null);
      movedNodeIds.current = new Set();
      await load();
    } catch (e) {
      console.error("[ORG CHART] Gagal simpan:", e);
      alert(e.message || "Gagal menyimpan perubahan struktur organisasi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>Memuat struktur organisasi...</div>;
  }

  if (error) {
    return <div style={{ padding: 48, textAlign: "center", color: "#dc2626" }}>{error}</div>;
  }

  if (rawKaryawan.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "#6b7280", marginBottom: 12 }}>Belum ada data karyawan.</p>
        <a href="/hr/karyawan" style={{ color: "#2563eb", fontSize: 14 }}>Tambah karyawan dulu di halaman Karyawan &rarr;</a>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "calc(100vh - 140px)", minHeight: 500 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Struktur Organisasi</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            {canEdit
              ? "Drag kartu untuk atur posisi, tarik garis dari bawah kartu ke kartu lain untuk atur atasan."
              : "Mode lihat saja - hanya HR dan Direksi yang bisa mengubah struktur ini."}
          </p>
        </div>
        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {dirtyCount > 0 && (
              <span style={{ fontSize: 13, color: "#d97706" }}>{dirtyCount} perubahan belum disimpan</span>
            )}
            <button
              onClick={openAddModal}
              style={{
                padding: "8px 16px",
                background: "#fff",
                color: "#111827",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              + Tambah Karyawan
            </button>
            <button
              onClick={openConfirm}
              disabled={dirtyCount === 0 || saving}
              style={{
                padding: "8px 16px",
                background: dirtyCount === 0 ? "#e5e7eb" : "#111827",
                color: dirtyCount === 0 ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                cursor: dirtyCount === 0 ? "default" : "pointer",
              }}
            >
              Simpan Perubahan
            </button>
          </div>
        )}
      </div>

      <div style={{ height: "100%", border: "1px solid #1f2937", borderRadius: 12, overflow: "hidden" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgesDelete={onEdgesDelete}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={canEdit}
          edgesReconnectable={canEdit}
          edgesFocusable={canEdit}
          deleteKeyCode={["Backspace", "Delete"]}
          isValidConnection={(c) => c.source !== c.target}
          fitView
          style={{ background: "#1e2532" }}
        >
          <Background color="#3b4354" gap={18} size={1.5} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={{ background: "#111827" }} maskColor="rgba(15,23,42,0.6)" />
        </ReactFlow>
      </div>

      {showAddModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Tambah Karyawan</h3>

            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Nama</label>
            <input
              type="text"
              value={addForm.nama}
              onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 12 }}
            />

            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="Kosongkan untuk auto-generate"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 12 }}
            />

            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Jabatan</label>
            <select
              value={addForm.jabatan}
              onChange={(e) => setAddForm({ ...addForm, jabatan: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 12 }}
            >
              <option value="">Pilih jabatan...</option>
              {Object.entries(JABATAN_MAP).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Departemen</label>
            <select
              value={addForm.departemen}
              onChange={(e) => setAddForm({ ...addForm, departemen: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 12 }}
            >
              <option value="">- Tanpa departemen -</option>
              {departemenList.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
            </select>

            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Tanggal Join</label>
            <input
              type="date"
              value={addForm.tanggal_join}
              onChange={(e) => setAddForm({ ...addForm, tanggal_join: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 12 }}
            />

            {addError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{addError}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={submitAddKaryawan}
                disabled={addSaving}
                style={{ padding: "8px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
              >
                {addSaving ? "Menyimpan..." : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSummary && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 420, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Konfirmasi Perubahan</h3>
            {confirmSummary.changes.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Perubahan atasan:</p>
                {confirmSummary.changes.map((c, i) => (
                  <p key={i} style={{ fontSize: 13, color: "#374151", margin: "4px 0" }}>
                    <strong>{c.nama}</strong>: {c.from} &rarr; {c.to}
                  </p>
                ))}
              </div>
            )}
            {confirmSummary.positionsMovedCount > 0 && (
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                {confirmSummary.positionsMovedCount} posisi kartu juga akan disimpan.
              </p>
            )}
            {confirmSummary.changes.length === 0 && confirmSummary.positionsMovedCount === 0 && (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Tidak ada perubahan.</p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => setConfirmSummary(null)}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={doSave}
                disabled={saving}
                style={{ padding: "8px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
              >
                {saving ? "Menyimpan..." : "Ya, Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrukturOrganisasiPage() {
  return (
    <Layout title="Struktur Organisasi">
      <div style={{ padding: 24 }}>
        <ReactFlowProvider>
          <OrgChartCanvas />
        </ReactFlowProvider>
      </div>
    </Layout>
  );
}
