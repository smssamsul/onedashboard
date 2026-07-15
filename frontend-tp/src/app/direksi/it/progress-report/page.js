"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Code, CheckCircle2, Clock, AlertCircle, Server } from "lucide-react";

export default function DireksiITProgressReportPage() {
  const [data, setData] = useState({
    projects_total: 12,
    projects_completed: 8,
    projects_in_progress: 3,
    projects_pending: 1,
    tickets_resolved: 45,
    tickets_pending: 7,
    systems_uptime: 99.8,
  });

  return (
    <Layout title="Progress Report IT | Direksi">
      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
            Progress Report IT
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Ringkasan progress proyek dan tiket IT
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {/* Projects */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <Code size={24} />
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>Projects</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Total</span>
                <span style={{ fontWeight: "600", color: "#1f2937" }}>{data.projects_total}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span style={{ color: "#6b7280" }}>Completed</span>
                </div>
                <span style={{ fontWeight: "600", color: "#059669" }}>{data.projects_completed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={16} className="text-blue-600" />
                  <span style={{ color: "#6b7280" }}>In Progress</span>
                </div>
                <span style={{ fontWeight: "600", color: "#2563eb" }}>{data.projects_in_progress}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} className="text-yellow-600" />
                  <span style={{ color: "#6b7280" }}>Pending</span>
                </div>
                <span style={{ fontWeight: "600", color: "#d97706" }}>{data.projects_pending}</span>
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <AlertCircle size={24} />
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>Tickets</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span style={{ color: "#6b7280" }}>Resolved</span>
                </div>
                <span style={{ fontWeight: "600", color: "#059669" }}>{data.tickets_resolved}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={16} className="text-yellow-600" />
                  <span style={{ color: "#6b7280" }}>Pending</span>
                </div>
                <span style={{ fontWeight: "600", color: "#d97706" }}>{data.tickets_pending}</span>
              </div>
            </div>
          </div>

          {/* System Uptime */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <Server size={24} />
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>System Uptime</h2>
            </div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "48px", fontWeight: "700", color: "#059669", marginBottom: "8px" }}>
                {data.systems_uptime}%
              </div>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>Availability</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
