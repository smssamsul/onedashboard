"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { toast } from "react-hot-toast";
import { Plus, Pause, Play, DollarSign, X } from "lucide-react";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function fmtRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function fmt(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

const OBJECTIVES = [
  { value: "OUTCOME_LEADS", label: "Leads" },
  { value: "OUTCOME_SALES", label: "Sales" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic" },
  { value: "OUTCOME_AWARENESS", label: "Awareness" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
];

const CTA_OPTIONS = ["LEARN_MORE", "SIGN_UP", "SHOP_NOW", "CONTACT_US", "SUBSCRIBE", "GET_OFFER"];

const emptyWizard = {
  campaign: { name: "", objective: "OUTCOME_LEADS" },
  ad_set: {
    name: "",
    daily_budget: "",
    billing_event: "IMPRESSIONS",
    optimization_goal: "REACH",
    targeting: { geo_countries: ["ID"], age_min: 18, age_max: 65, genders: [] },
  },
  ad: { name: "", page_id: "", link: "", primary_text: "", headline: "", image_url: "", call_to_action: "LEARN_MORE" },
};

export default function MetaAdsCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  // Konfirmasi pause/resume - inline card, bukan window.confirm
  const [confirmAction, setConfirmAction] = useState(null); // { campaign, type: 'pause'|'resume' }
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Edit budget modal
  const [budgetTarget, setBudgetTarget] = useState(null); // campaign object
  const [newBudget, setNewBudget] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Wizard create campaign
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 campaign, 2 ad set, 3 ad, 4 review
  const [wizardData, setWizardData] = useState(emptyWizard);
  const [wizardLoading, setWizardLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/meta-ads/performance/campaigns`, {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      const json = await res.json();
      setConnected(json.connected !== false);
      setCampaigns(json.data || []);
    } catch (e) {
      console.error("[META ADS] Gagal memuat campaign:", e);
      toast.error("Gagal memuat daftar campaign");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Pause / Resume ──────────────────────────────────────────────
  const confirmPauseResume = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      const { campaign, type } = confirmAction;
      const res = await fetch(`/api/sales/meta-ads/campaigns/${campaign.campaign_id}/${type}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setConfirmAction(null);
        load();
      } else {
        toast.error(json.message || "Gagal memproses aksi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Edit budget ──────────────────────────────────────────────────
  const submitBudget = async () => {
    if (!budgetTarget || !newBudget) return;
    setBudgetLoading(true);
    try {
      const res = await fetch(`/api/sales/meta-ads/campaigns/${budgetTarget.campaign_id}/budget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        body: JSON.stringify({ daily_budget: Number(newBudget) }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setBudgetTarget(null);
        setNewBudget("");
        load();
      } else {
        toast.error(json.message || "Gagal update budget");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan");
    } finally {
      setBudgetLoading(false);
    }
  };

  // ── Wizard ───────────────────────────────────────────────────────
  const resetWizard = () => {
    setWizardData(emptyWizard);
    setWizardStep(1);
    setShowWizard(false);
  };

  const submitWizard = async () => {
    setWizardLoading(true);
    try {
      const res = await fetch(`/api/sales/meta-ads/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        body: JSON.stringify(wizardData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        resetWizard();
        load();
      } else {
        toast.error(json.message || "Gagal membuat campaign", { duration: 8000 });
      }
    } catch (e) {
      toast.error("Terjadi kesalahan saat membuat campaign");
    } finally {
      setWizardLoading(false);
    }
  };

  if (!loading && !connected) {
    return (
      <Layout title="Meta Ads - Kelola Campaign">
        <div style={{ padding: 24 }}>
          <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 48, textAlign: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Belum ada akun Meta Ads yang terhubung</h3>
            <a href="/marketing/meta-ads/accounts" style={{ display: "inline-block", padding: "8px 16px", background: "#111827", color: "#fff", borderRadius: 8, fontSize: 14, textDecoration: "none" }}>
              Buka Setting Akun
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Meta Ads - Kelola Campaign">
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Kelola Campaign</h1>
          <button onClick={() => setShowWizard(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
            <Plus size={16} /> Buat Campaign Baru
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", background: "#f9fafb" }}>
                <th style={{ padding: "10px 14px" }}>Campaign</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Budget Harian</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Spend</th>
                <th style={{ padding: "10px 14px", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>{loading ? "Memuat..." : "Belum ada campaign."}</td></tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 14px" }}>{c.name || c.campaign_id}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: c.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: c.status === "ACTIVE" ? "#166534" : "#6b7280" }}>
                        {c.status || "-"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>{c.daily_budget ? fmtRp(c.daily_budget) : "-"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmtRp(c.spend)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {c.status === "ACTIVE" ? (
                          <button onClick={() => setConfirmAction({ campaign: c, type: "pause" })} title="Pause" style={{ padding: 6, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}>
                            <Pause size={14} />
                          </button>
                        ) : (
                          <button onClick={() => setConfirmAction({ campaign: c, type: "resume" })} title="Resume" style={{ padding: 6, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}>
                            <Play size={14} />
                          </button>
                        )}
                        <button onClick={() => { setBudgetTarget(c); setNewBudget(String(c.daily_budget || "")); }} title="Edit Budget" style={{ padding: 6, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}>
                          <DollarSign size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Konfirmasi Pause/Resume - kartu, bukan window.confirm */}
      {confirmAction && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {confirmAction.type === "pause" ? "Pause campaign ini?" : "Aktifkan lagi campaign ini?"}
            </h3>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}><strong>{confirmAction.campaign.name || confirmAction.campaign.campaign_id}</strong></p>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              Spend sejauh ini (rentang yang ditampilkan): {fmtRp(confirmAction.campaign.spend)}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setConfirmAction(null)} style={btnOutline}>Batal</button>
              <button onClick={confirmPauseResume} disabled={confirmLoading} style={btnPrimary}>
                {confirmLoading ? "Memproses..." : confirmAction.type === "pause" ? "Ya, pause campaign ini" : "Ya, aktifkan campaign ini"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget */}
      {budgetTarget && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 420 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit Budget Harian</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{budgetTarget.name || budgetTarget.campaign_id}</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Budget baru (Rp/hari)</label>
              <input type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13 }}>
              Sekarang: <strong>{fmtRp(budgetTarget.daily_budget)}</strong> → Baru: <strong style={{ color: "#111827" }}>{fmtRp(newBudget)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => { setBudgetTarget(null); setNewBudget(""); }} style={btnOutline}>Batal</button>
              <button onClick={submitBudget} disabled={budgetLoading || !newBudget} style={btnPrimary}>
                {budgetLoading ? "Menyimpan..." : "Konfirmasi Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Buat Campaign Baru */}
      {showWizard && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Buat Campaign Baru ({wizardStep}/4)</h3>
              <button onClick={resetWizard} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {wizardStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nama Campaign</label>
                  <input style={inputStyle} value={wizardData.campaign.name} onChange={(e) => setWizardData((d) => ({ ...d, campaign: { ...d.campaign, name: e.target.value } }))} placeholder="Contoh: Seminar Jakarta Agustus" />
                </div>
                <div>
                  <label style={labelStyle}>Objective</label>
                  <select style={inputStyle} value={wizardData.campaign.objective} onChange={(e) => setWizardData((d) => ({ ...d, campaign: { ...d.campaign, objective: e.target.value } }))}>
                    {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nama Ad Set</label>
                  <input style={inputStyle} value={wizardData.ad_set.name} onChange={(e) => setWizardData((d) => ({ ...d, ad_set: { ...d.ad_set, name: e.target.value } }))} placeholder="Contoh: Ad Set - Semua Umur" />
                </div>
                <div>
                  <label style={labelStyle}>Budget Harian (Rp)</label>
                  <input type="number" style={inputStyle} value={wizardData.ad_set.daily_budget} onChange={(e) => setWizardData((d) => ({ ...d, ad_set: { ...d.ad_set, daily_budget: e.target.value } }))} placeholder="100000" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Usia Min</label>
                    <input type="number" style={inputStyle} value={wizardData.ad_set.targeting.age_min} onChange={(e) => setWizardData((d) => ({ ...d, ad_set: { ...d.ad_set, targeting: { ...d.ad_set.targeting, age_min: Number(e.target.value) } } }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Usia Max</label>
                    <input type="number" style={inputStyle} value={wizardData.ad_set.targeting.age_max} onChange={(e) => setWizardData((d) => ({ ...d, ad_set: { ...d.ad_set, targeting: { ...d.ad_set.targeting, age_max: Number(e.target.value) } } }))} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Target lokasi default: Indonesia. Pengaturan targeting lanjutan (interest, custom audience, dll) belum tersedia di v1 ini.</p>
              </div>
            )}

            {wizardStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nama Ad</label>
                  <input style={inputStyle} value={wizardData.ad.name} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, name: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Facebook Page ID</label>
                  <input style={inputStyle} value={wizardData.ad.page_id} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, page_id: e.target.value } }))} placeholder="ID Page yang mempublish iklan" />
                </div>
                <div>
                  <label style={labelStyle}>Link Tujuan</label>
                  <input style={inputStyle} value={wizardData.ad.link} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, link: e.target.value } }))} placeholder="https://ternakproperti.com/..." />
                </div>
                <div>
                  <label style={labelStyle}>Teks Utama</label>
                  <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={wizardData.ad.primary_text} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, primary_text: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>Headline</label>
                  <input style={inputStyle} value={wizardData.ad.headline} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, headline: e.target.value } }))} />
                </div>
                <div>
                  <label style={labelStyle}>URL Gambar</label>
                  <input style={inputStyle} value={wizardData.ad.image_url} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, image_url: e.target.value } }))} placeholder="https://..." />
                </div>
                <div>
                  <label style={labelStyle}>Call to Action</label>
                  <select style={inputStyle} value={wizardData.ad.call_to_action} onChange={(e) => setWizardData((d) => ({ ...d, ad: { ...d.ad, call_to_action: e.target.value } }))}>
                    {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div>
                <p style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: 10, borderRadius: 8, marginBottom: 16 }}>
                  Cek sekali lagi sebelum kirim ke Meta. Campaign akan dibuat berstatus <strong>PAUSED</strong> (belum jalan/belum makan budget) - Anda perlu aktifkan manual lewat tombol Resume setelah ini.
                </p>
                <ReviewBlock title="Campaign">
                  <ReviewRow label="Nama" value={wizardData.campaign.name} />
                  <ReviewRow label="Objective" value={wizardData.campaign.objective} />
                </ReviewBlock>
                <ReviewBlock title="Ad Set">
                  <ReviewRow label="Nama" value={wizardData.ad_set.name} />
                  <ReviewRow label="Budget harian" value={fmtRp(wizardData.ad_set.daily_budget)} />
                  <ReviewRow label="Usia" value={`${wizardData.ad_set.targeting.age_min} - ${wizardData.ad_set.targeting.age_max} tahun`} />
                </ReviewBlock>
                <ReviewBlock title="Ad">
                  <ReviewRow label="Nama" value={wizardData.ad.name} />
                  <ReviewRow label="Link" value={wizardData.ad.link} />
                  <ReviewRow label="Headline" value={wizardData.ad.headline} />
                  <ReviewRow label="CTA" value={wizardData.ad.call_to_action} />
                </ReviewBlock>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => (wizardStep === 1 ? resetWizard() : setWizardStep((s) => s - 1))} style={btnOutline}>
                {wizardStep === 1 ? "Batal" : "Kembali"}
              </button>
              {wizardStep < 4 ? (
                <button onClick={() => setWizardStep((s) => s + 1)} style={btnPrimary}>Lanjut</button>
              ) : (
                <button onClick={submitWizard} disabled={wizardLoading} style={btnPrimary}>
                  {wizardLoading ? "Membuat..." : "Buat Campaign"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ReviewBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "#9ca3af", marginBottom: 6 }}>{title}</h4>
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 10 }}>{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{value || "-"}</span>
    </div>
  );
}

const overlayStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
};
const modalStyle = { background: "#fff", borderRadius: 12, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" };
const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" };
const labelStyle = { fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 };
const btnOutline = { padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer" };
const btnPrimary = { padding: "8px 16px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 14, cursor: "pointer" };
