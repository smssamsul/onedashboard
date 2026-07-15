"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Film, Image as ImageIcon, Video, Palette, Zap, TrendingUp, Eye } from "lucide-react";

export default function DireksiMultimediaKontenPage() {
  const [data, setData] = useState({
    konten: {
      total: 156,
      images: 89,
      videos: 12,
      designs: 45,
      animations: 10,
    },
    insight: {
      projects_active: 8,
      projects_completed: 24,
      engagement_rate: 12.5,
      views_total: 125000,
    },
  });

  return (
    <Layout title="Konten & Insight Multimedia | Direksi">
      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
            Konten & Insight Multimedia
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Ringkasan konten dan insight multimedia
          </p>
        </div>

        {/* Konten Section */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
            Jumlah Konten
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Film size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Total Konten</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.konten.total}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <ImageIcon size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Images</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.konten.images}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Video size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Videos</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.konten.videos}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Palette size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Designs</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.konten.designs}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Zap size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Animations</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.konten.animations}</div>
            </div>
          </div>
        </div>

        {/* Insight Section */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
            Insight
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Zap size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Projects Aktif</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.insight.projects_active}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <TrendingUp size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Projects Completed</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.insight.projects_completed}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <TrendingUp size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Engagement Rate</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>{data.insight.engagement_rate}%</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Eye size={20} />
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Total Views</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>
                {new Intl.NumberFormat("id-ID").format(data.insight.views_total)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
