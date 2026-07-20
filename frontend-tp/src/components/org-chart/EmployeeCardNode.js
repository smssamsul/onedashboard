"use client";

import { Handle, Position } from "@xyflow/react";
import { getJabatanLabel } from "@/lib/jabatanLabels";

function getInitials(nama) {
  if (!nama) return "?";
  const parts = nama.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
}

export default function EmployeeCardNode({ data }) {
  const { nama, jabatan, avatar_url, departemenNama, isDireksi, canEdit } = data;

  return (
    <div
      style={{
        background: "#fff",
        border: isDireksi ? "2px solid #7c3aed" : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "12px 16px",
        minWidth: 200,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {canEdit && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: "#6b7280", width: 8, height: 8 }}
        />
      )}

      {avatar_url ? (
        <img
          src={avatar_url}
          alt={nama}
          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: isDireksi ? "#7c3aed" : "#2563eb",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {getInitials(nama)}
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {nama || "-"}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{getJabatanLabel(jabatan)}</div>
        {departemenNama && (
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{departemenNama}</div>
        )}
        {isDireksi && (
          <span
            style={{
              display: "inline-block",
              marginTop: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "#7c3aed",
              background: "#f3e8ff",
              borderRadius: 999,
              padding: "1px 8px",
            }}
          >
            Direksi
          </span>
        )}
      </div>

      {canEdit && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: "#6b7280", width: 8, height: 8 }}
        />
      )}
    </div>
  );
}
