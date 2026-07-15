"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { getAiSetting } from "@/lib/aiSetting";
import { getApiUrl } from "@/config/api";
import { toast } from "react-hot-toast";
import { Save, Loader2 } from "lucide-react";
import "@/styles/sales/dashboard.css";

export default function AiSettingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [prompt, setPrompt] = useState("");
  const [promptCold, setPromptCold] = useState("");
  const [promptWarm, setPromptWarm] = useState("");
  const [woowaKey, setWoowaKey] = useState("");
  const [isOn, setIsOn] = useState(true);
  const [currentSetting, setCurrentSetting] = useState(null);

  useEffect(() => {
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      setLoading(true);
      const result = await getAiSetting();
      if (result.data) {
        setCurrentSetting(result.data);
        setPrompt(result.data.prompt || "");
        setPromptCold(result.data.prompt_cold || "");
        setPromptWarm(result.data.prompt_warm || "");
        setWoowaKey(result.data.woowa_key || "");
        setIsOn(result.data.is_on !== undefined ? result.data.is_on : true);
      }
    } catch (error) {
      console.error("Error fetching AI setting:", error);
      toast.error("Gagal mengambil setting");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const settingData = {
        woowa_key: woowaKey,
        is_on: isOn,
      };

      if (prompt.trim()) {
        settingData.prompt = prompt;
      }
      if (promptCold.trim()) {
        settingData.prompt_cold = promptCold;
      }
      if (promptWarm.trim()) {
        settingData.prompt_warm = promptWarm;
      }

      const url = currentSetting
        ? getApiUrl(`sales/ai-setting/${currentSetting.id}`)
        : getApiUrl("sales/ai-setting");
      const method = currentSetting ? "PUT" : "POST";

      const token = localStorage.getItem("token");
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingData),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentSetting(result.data);
        toast.success(result.message || "AI prompt berhasil disimpan");
      } else {
        toast.error(result.message || "Gagal menyimpan prompt");
      }
    } catch (error) {
      console.error("Error saving AI setting:", error);
      toast.error("Gagal menyimpan prompt");
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <Layout title="AI Setting | One Dashboard">
        <div className="dashboard-shell">
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <Loader2 className="animate-spin" size={32} />
            <p style={{ marginTop: "1rem" }}>Memuat data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="AI Setting | One Dashboard">
      <div className="dashboard-shell">
        <section className="dashboard-hero">
          <div className="dashboard-hero__copy">
            <p className="dashboard-hero__eyebrow">Configuration</p>
            <h2 className="dashboard-hero__title">AI Prompt Setting</h2>
            <span className="dashboard-hero__meta">
              Kelola prompt yang digunakan untuk AI chatbot WhatsApp
            </span>
          </div>
        </section>

        <section className="panel" style={{ marginTop: "2rem" }}>
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Prompt Configuration</p>
              <h3 className="panel__title">AI Prompt Setting</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
            <div style={{ marginBottom: "2rem" }}>
              <label
                htmlFor="woowa_key"
                style={{
                  display: "block",
                  marginBottom: "0.75rem",
                  fontWeight: "600",
                  fontSize: "16px",
                  color: "var(--text-primary)",
                }}
              >
                Woowa API Key
              </label>
              <input
                id="woowa_key"
                type="text"
                value={woowaKey}
                onChange={(e) => setWoowaKey(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1rem 1.25rem",
                  border: "2px solid var(--accent-primary)",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "500",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
                placeholder="Masukkan Woowa API Key..."
              />
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.75rem",
                  fontWeight: "600",
                  fontSize: "16px",
                  color: "var(--text-primary)",
                }}
              >
                Status AI
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    fontWeight: "500",
                  }}
                >
                  {isOn ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOn(!isOn)}
                  style={{
                    position: "relative",
                    width: "56px",
                    height: "32px",
                    borderRadius: "16px",
                    border: "none",
                    background: isOn ? "#10b981" : "#d1d5db",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    outline: "none",
                    boxShadow: isOn
                      ? "0 2px 8px rgba(16, 185, 129, 0.3)"
                      : "0 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "4px",
                      left: isOn ? "28px" : "4px",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "white",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    }}
                  />
                </button>
              </div>
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                {isOn
                  ? "AI chatbot aktif dan akan merespons pesan masuk secara otomatis"
                  : "AI chatbot nonaktif, pesan masuk tidak akan diproses oleh AI"}
              </p>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  borderBottom: "2px solid var(--border-color)",
                  marginBottom: "1.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => switchTab("basic")}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: activeTab === "basic" ? "#f97316" : "transparent",
                    color: activeTab === "basic" ? "white" : "var(--text-primary)",
                    border: "none",
                    borderBottom: activeTab === "basic" ? "2px solid #f97316" : "2px solid transparent",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    marginBottom: "-2px",
                  }}
                >
                  Basic (New - Lead)
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("cold")}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: activeTab === "cold" ? "#f97316" : "transparent",
                    color: activeTab === "cold" ? "white" : "var(--text-primary)",
                    border: "none",
                    borderBottom: activeTab === "cold" ? "2px solid #f97316" : "2px solid transparent",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    marginBottom: "-2px",
                  }}
                >
                  Cold
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("warm")}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: activeTab === "warm" ? "#f97316" : "transparent",
                    color: activeTab === "warm" ? "white" : "var(--text-primary)",
                    border: "none",
                    borderBottom: activeTab === "warm" ? "2px solid #f97316" : "2px solid transparent",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    marginBottom: "-2px",
                  }}
                >
                  Warm
                </button>
              </div>

              {activeTab === "basic" && (
                <div>
                  <label
                    htmlFor="prompt"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                      color: "var(--text-primary)",
                    }}
                  >
                    AI System Prompt (Status New/Lead) *
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={20}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "monospace",
                      resize: "vertical",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Masukkan system prompt untuk AI dengan status New atau Lead..."
                  />
                </div>
              )}

              {activeTab === "cold" && (
                <div>
                  <label
                    htmlFor="prompt_cold"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                      color: "var(--text-primary)",
                    }}
                  >
                    AI Prompt (Status Cold)
                  </label>
                  <textarea
                    id="prompt_cold"
                    value={promptCold}
                    onChange={(e) => setPromptCold(e.target.value)}
                    rows={20}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "monospace",
                      resize: "vertical",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Masukkan prompt untuk AI dengan status Cold..."
                  />
                </div>
              )}

              {activeTab === "warm" && (
                <div>
                  <label
                    htmlFor="prompt_warm"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                      color: "var(--text-primary)",
                    }}
                  >
                    AI Prompt (Status Warm)
                  </label>
                  <textarea
                    id="prompt_warm"
                    value={promptWarm}
                    onChange={(e) => setPromptWarm(e.target.value)}
                    rows={20}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "monospace",
                      resize: "vertical",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Masukkan prompt untuk AI dengan status Warm..."
                  />
                </div>
              )}
            </div>

            <div style={{ 
              display: "flex", 
              gap: "1rem", 
              justifyContent: "flex-end",
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border-color)"
            }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: saving ? "#9ca3af" : "#f97316",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontWeight: "500",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = "#ea580c";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = "#f97316";
                  }
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan Prompt
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Layout>
  );
}
