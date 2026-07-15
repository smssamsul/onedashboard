"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart
} from "recharts";
import styles from "./statistik.module.css";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function fmtRp(n) {
  return "Rp " + fmt(n);
}
function badgeClass(tier) {
  const t = (tier || "basic").toLowerCase();
  const map = {
    platinum: styles.badgePlatinum,
    gold: styles.badgeGold,
    silver: styles.badgeSilver,
    bronze: styles.badgeBronze,
    basic: styles.badgeBasic,
  };
  return map[t] || styles.badgeBasic;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0", fontSize: "0.8rem" }}>
          {entry.name}: <strong>{fmt(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ── WA Icon ──────────────────────────────────────────────────────────────────
function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="#25d366" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SalesCustomerStatistikPage() {
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [yearsReady, setYearsReady] = useState(false);

  // Premium modal
  const [showModal, setShowModal] = useState(false);
  const [premiumList, setPremiumList] = useState([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [filteredPremium, setFilteredPremium] = useState([]);

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  // ── Fetch stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(
    async (year = "all") => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sales/customer/statistics?tahun=${year}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: "application/json",
          },
        });

        if (res.status === 401) { router.replace("/sales/login"); return; }

        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          if (!yearsReady && json.data.years?.length) {
            setYears(json.data.years);
            setYearsReady(true);
          }
        } else {
          setError(json.message || "Gagal memuat data statistik");
        }
      } catch {
        setError("Terjadi kesalahan koneksi ke server");
      } finally {
        setLoading(false);
      }
    },
    [yearsReady, router]
  );

  useEffect(() => { fetchStats("all"); }, []); // eslint-disable-line

  function handleYearChange(year) {
    setSelectedYear(year);
    fetchStats(year);
  }

  // ── Premium modal ────────────────────────────────────────────────────────
  async function openPremiumModal() {
    setShowModal(true);
    setPremiumLoading(true);
    setModalSearch("");
    try {
      const yearParam = selectedYear !== "all" ? `&tahun=${selectedYear}` : "";
      const res = await fetch(`/api/sales/customer?all=true&keanggotaan=platinum,gold,silver${yearParam}`, {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const list = json.data.map((c) => ({ ...c, total_spent: parseFloat(c.total_spend || 0) }));
        setPremiumList(list);
        setFilteredPremium(list);
      }
    } catch {
      setPremiumList([]); setFilteredPremium([]);
    } finally {
      setPremiumLoading(false);
    }
  }

  function filterPremium(q) {
    setModalSearch(q);
    if (!q.trim()) { setFilteredPremium(premiumList); return; }
    const lq = q.toLowerCase();
    setFilteredPremium(
      premiumList.filter((c) =>
        (c.nama || "").toLowerCase().includes(lq) ||
        (c.memberID || "").toLowerCase().includes(lq) ||
        (c.wa || "").toLowerCase().includes(lq) ||
        (c.email || "").toLowerCase().includes(lq)
      )
    );
  }

  // ── Prepare chart data ───────────────────────────────────────────────────
  // Top Products: horizontal bar (use recharts BarChart with layout="vertical")
  const productChartData = (data?.top_products || []).map((p) => ({
    name: p.produk_nama.length > 30 ? p.produk_nama.slice(0, 30) + "…" : p.produk_nama,
    "Order Lunas": p.paid_orders_count,
  }));

  // Growth: combined bar + line
  const growthChartData = (data?.customer_growth || []).map((r) => ({
    name: r.month_name,
    "Customer Baru": r.new_count,
    "Repeat Order": r.repeat_count,
    "Total Aktif": r.total_count,
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout title="Statistik Customer">
      <div className={styles.page}>

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Statistik Customer</h1>
            <p className={styles.pageSubtitle}>
              Analisis data keanggotaan customer &amp; performa order dari database arsip
            </p>
          </div>
        </div>

        {/* ── Year Tabs ── */}
        <div className={styles.tabs}>
          <button id="tab-all" className={`${styles.tabBtn} ${selectedYear === "all" ? styles.tabBtnActive : ""}`} onClick={() => handleYearChange("all")}>All Time</button>
          {[...years].sort((a, b) => b - a).map((y) => (
            <button key={y} id={`tab-${y}`} className={`${styles.tabBtn} ${selectedYear === String(y) ? styles.tabBtnActive : ""}`} onClick={() => handleYearChange(String(y))}>{y}</button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className={styles.errorBanner}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" /><path d="M10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {error}
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && (
          <div className={styles.skeletonGrid}>
            {[...Array(7)].map((_, i) => <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 80}ms` }} />)}
          </div>
        )}

        {/* ── Main Content ── */}
        {!loading && data && (
          <>
            {/* ── Ringkasan ── */}
            <p className={styles.sectionLabel}>Ringkasan Data</p>
            <div className={styles.grid3}>
              <div className={`${styles.card} ${styles.bt_primary}`}>
                <span className={styles.cardLabel}>Total Data</span>
                <div className={styles.cardValue}>{fmt(data.total_data)}</div>
                <span className={styles.cardDesc}>Semua Data</span>
              </div>
              <div className={`${styles.card} ${styles.bt_primary}`}>
                <span className={styles.cardLabel}>Total Lead</span>
                <div className={styles.cardValue}>{fmt(data.total_leads)}</div>
                <span className={styles.cardDesc}>Belum Pernah Beli</span>
              </div>
              <div className={`${styles.card} ${styles.bt_primary}`}>
                <span className={styles.cardLabel}>Total Customer</span>
                <div className={styles.cardValue}>{fmt(data.total_customers)}</div>
                <span className={styles.cardDesc}>Sudah Pernah Beli</span>
              </div>
            </div>

            {/* ── Membership ── */}
            <p className={styles.sectionLabel}>Analisis Keanggotaan Customer</p>
            <div className={styles.grid4}>
              <div className={`${styles.card} ${styles.bt_platinum} ${styles.clickableCard}`} onClick={openPremiumModal} title="Lihat detail customer premium">
                <span className={styles.clickHint}>Lihat Detail</span>
                <span className={styles.cardLabel}>Platinum</span>
                <div className={`${styles.cardValue} ${styles.c_primary}`}>{fmt(data.membership?.platinum)}</div>
                <span className={styles.cardDesc}>Tier Platinum</span>
              </div>
              <div className={`${styles.card} ${styles.bt_gold}`}>
                <span className={styles.cardLabel}>Gold</span>
                <div className={`${styles.cardValue} ${styles.c_gold}`}>{fmt(data.membership?.gold)}</div>
                <span className={styles.cardDesc}>Tier Gold</span>
              </div>
              <div className={`${styles.card} ${styles.bt_silver}`}>
                <span className={styles.cardLabel}>Silver</span>
                <div className={`${styles.cardValue} ${styles.c_silver}`}>{fmt(data.membership?.silver)}</div>
                <span className={styles.cardDesc}>Tier Silver</span>
              </div>
              <div className={`${styles.card} ${styles.bt_bronze}`}>
                <span className={styles.cardLabel}>Bronze</span>
                <div className={`${styles.cardValue} ${styles.c_bronze}`}>{fmt(data.membership?.bronze)}</div>
                <span className={styles.cardDesc}>Tier Bronze</span>
              </div>
            </div>

            {/* ── Order Summary ── */}
            <p className={styles.sectionLabel}>Ringkasan Status Pembayaran Order (Arsip)</p>
            <div className={styles.grid2}>
              <div className={`${styles.card} ${styles.bl_green}`}>
                <span className={`${styles.cardLabel} ${styles.c_green}`}>Order Lunas (Paid)</span>
                <div className={`${styles.cardValue} ${styles.c_green}`}>{fmtRp(data.orders?.paid_amount)}</div>
                <span className={styles.cardDesc}>{fmt(data.orders?.paid_count)} order lunas</span>
              </div>
              <div className={`${styles.card} ${styles.bl_red}`}>
                <span className={`${styles.cardLabel} ${styles.c_red}`}>Order Belum Lunas (Unpaid)</span>
                <div className={`${styles.cardValue} ${styles.c_red}`}>{fmtRp(data.orders?.unpaid_amount)}</div>
                <span className={styles.cardDesc}>{fmt(data.orders?.unpaid_count)} order belum lunas</span>
              </div>
            </div>

            {/* ── Top Products Chart (Horizontal Bar) ── */}
            <div className={styles.chartCard}>
              <h4 className={styles.chartTitle}>Diagram Produk Paling Banyak Order Lunas (Paid)</h4>
              {productChartData.length ? (
                <ResponsiveContainer width="100%" height={Math.max(300, productChartData.length * 42)}>
                  <BarChart data={productChartData} layout="vertical" margin={{ top: 4, right: 24, left: 12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="Order Lunas" radius={[0, 6, 6, 0]}>
                      {productChartData.map((_, i) => (
                        <Cell key={i} fill={`rgba(20,184,166,${0.6 + (i / productChartData.length) * 0.4})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyState}>Tidak ada data produk</div>
              )}
            </div>

            {/* ── Top Customers Table ── */}
            <div className={styles.tableCard}>
              <h4 className={styles.chartTitle}>Tingkatan Customer (Paling Banyak Belanja Amount)</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Member ID</th><th>Nama</th><th>WhatsApp</th>
                      <th>Email</th><th>Keanggotaan</th><th>Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_customers?.length ? (
                      data.top_customers.map((c, i) => (
                        <tr key={i}>
                          <td><code className={styles.code}>{c.memberID || "-"}</code></td>
                          <td><strong>{c.nama}</strong></td>
                          <td>
                            {c.wa && c.wa !== "-"
                              ? <a href={`https://wa.me/${c.wa}`} target="_blank" rel="noopener noreferrer" className={styles.waLink}><WaIcon /> {c.wa}</a>
                              : "-"}
                          </td>
                          <td>{c.email || "-"}</td>
                          <td><span className={`${styles.badge} ${badgeClass(c.keanggotaan)}`}>{c.keanggotaan || "basic"}</span></td>
                          <td className={styles.c_green} style={{ fontWeight: 700 }}>{fmtRp(c.total_spent)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className={styles.tdEmpty}>Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Growth Row ── */}
            <div className={styles.growthRow}>
              {/* Growth Chart (Composed: Bar + Line) */}
              <div className={styles.chartCard} style={{ marginBottom: 0 }}>
                <h4 className={styles.chartTitle}>Analisis Pertumbuhan Customer Bulan ke Bulan (MoM)</h4>
                {growthChartData.length ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={growthChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="Customer Baru" stackId="s" fill="rgba(56,189,248,0.75)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Repeat Order" stackId="s" fill="rgba(99,102,241,0.75)" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="Total Aktif" stroke="rgb(20,184,166)" strokeWidth={3} dot={{ fill: "rgb(20,184,166)", r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.emptyState}>Tidak ada data pertumbuhan</div>
                )}
              </div>

              {/* Top Cities */}
              <div className={styles.chartCard} style={{ marginBottom: 0 }}>
                <h4 className={styles.chartTitle}>Top Kota Asal Customer (Paid vs Unpaid)</h4>
                <div className={styles.cityList}>
                  {data.top_cities?.length ? (
                    data.top_cities.map((city, i) => (
                      <div key={i} className={styles.cityItem}>
                        <div className={styles.cityRow}>
                          <span className={styles.cityName}>{city.city}</span>
                          <span className={styles.cityPct}>{city.percentage}%</span>
                        </div>
                        <div className={styles.cityBarWrap}>
                          <div className={styles.cityBar} style={{ width: `${city.percentage}%` }} />
                        </div>
                        <div className={styles.cityMeta}>
                          <span className={styles.paidBadge}>✓ {fmt(city.paid_orders)} Paid</span>
                          <span className={styles.unpaidBadge}>✗ {fmt(city.unpaid_orders)} Unpaid</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>Tidak ada data kota</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Growth Table ── */}
            <div className={styles.tableCard}>
              <h4 className={styles.chartTitle}>Tabel Rincian Pertumbuhan &amp; Retensi Customer Bulanan</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Bulan</th><th>Customer Aktif (Transaksi Paid)</th>
                      <th>Pertumbuhan MoM</th><th>Customer Baru (New)</th><th>Repeat Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customer_growth?.length ? (
                      [...data.customer_growth].reverse().map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.month_name}</strong></td>
                          <td style={{ fontWeight: 600 }}>{fmt(row.total_count)} customer</td>
                          <td>
                            {row.growth > 0
                              ? <span className={styles.trendUp}>↑ +{row.growth}%</span>
                              : row.growth < 0
                                ? <span className={styles.trendDown}>↓ {row.growth}%</span>
                                : <span className={styles.trendFlat}>0%</span>}
                          </td>
                          <td><span style={{ fontWeight: 600 }}>{fmt(row.new_count)}</span> <span className={styles.pct}>({row.new_percentage}%)</span></td>
                          <td><span style={{ fontWeight: 600 }}>{fmt(row.repeat_count)}</span> <span className={styles.pct}>({row.repeat_percentage}%)</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className={styles.tdEmpty}>Tidak ada data pertumbuhan</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Premium Modal ── */}
      {showModal && (
        <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h3>Data Customer Premium (Platinum, Gold, Silver)</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.searchRow}>
                <svg className={styles.searchIco} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input id="premium-search-sales" className={styles.searchInput} type="text" placeholder="Cari Nama, Member ID, WhatsApp, atau Email..." value={modalSearch} onChange={(e) => filterPremium(e.target.value)} />
              </div>
              {premiumLoading ? (
                <div className={styles.tdEmpty} style={{ padding: "2.5rem" }}>Memuat data customer premium...</div>
              ) : (
                <div style={{ overflowX: "auto", maxHeight: "500px" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Member ID</th><th>Nama</th><th>WhatsApp</th><th>Email</th><th>Keanggotaan</th><th>Total Spent</th></tr>
                    </thead>
                    <tbody>
                      {filteredPremium.length ? (
                        filteredPremium.map((c, i) => (
                          <tr key={i}>
                            <td><code className={styles.code}>{c.memberID || "-"}</code></td>
                            <td><strong>{c.nama}</strong></td>
                            <td>{c.wa && c.wa !== "-" ? <a href={`https://wa.me/${c.wa}`} target="_blank" rel="noopener noreferrer" className={styles.waLink}><WaIcon /> {c.wa}</a> : "-"}</td>
                            <td>{c.email || "-"}</td>
                            <td><span className={`${styles.badge} ${badgeClass(c.keanggotaan)}`}>{c.keanggotaan || "basic"}</span></td>
                            <td className={styles.c_green} style={{ fontWeight: 700 }}>{fmtRp(c.total_spent)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} className={styles.tdEmpty}>{modalSearch ? "Tidak ada hasil pencarian" : "Tidak ada data customer premium"}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
