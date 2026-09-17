"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./seminarInsight.module.css";

const LABEL_KENDALA = {
  menolak: "Menolak",
  belum_tertarik: "Belum Tertarik",
  nanti_dulu: "Nanti Dulu",
  tidak_ada_budget: "Tidak Ada Budget",
  jadwal_tidak_cocok: "Jadwal Tidak Cocok",
  batal_daftar: "Batal Daftar",
};

const DISTRIBUSI_LABEL = [
  { key: "closing", label: "Closing", warna: "#16a34a" },
  { key: "hot", label: "Hot", warna: "#ef4444" },
  { key: "warm", label: "Warm", warna: "#f59e0b" },
  { key: "cold", label: "Cold", warna: "#38bdf8" },
  { key: "low_quality", label: "Low Quality", warna: "#94a3b8" },
];

const OPSI_RENTANG = [
  { value: "today", label: "Hari Ini" },
  { value: "7", label: "7 Hari Terakhir" },
  { value: "14", label: "14 Hari Terakhir" },
  { value: "30", label: "30 Hari Terakhir" },
  { value: "custom", label: "Custom" },
];

function hariIniStr() {
  return new Date().toISOString().slice(0, 10);
}

function hitungRentang(opsi, customDari, customSampai) {
  const hariIni = hariIniStr();
  if (opsi === "custom") return { dari: customDari || hariIni, sampai: customSampai || hariIni };
  if (opsi === "today") return { dari: hariIni, sampai: hariIni };
  const n = Number(opsi);
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return { dari: d.toISOString().slice(0, 10), sampai: hariIni };
}

function fmtRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
}
function fmtN(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : "";
}
function headers() {
  return { Accept: "application/json", Authorization: `Bearer ${getToken()}` };
}

function RentangTanggalFilter({ opsi, setOpsi, customDari, setCustomDari, customSampai, setCustomSampai }) {
  return (
    <div className={styles.dateNav}>
      <select className={styles.dateSelect} value={opsi} onChange={(e) => setOpsi(e.target.value)}>
        {OPSI_RENTANG.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {opsi === "custom" && (
        <>
          <input type="date" className={styles.dateInput} value={customDari} onChange={(e) => setCustomDari(e.target.value)} />
          <span className={styles.dateSep}>–</span>
          <input type="date" className={styles.dateInput} value={customSampai} onChange={(e) => setCustomSampai(e.target.value)} />
        </>
      )}
    </div>
  );
}

export default function SeminarInsightSection() {
  const [opsiHarian, setOpsiHarian] = useState("today");
  const [customDariHarian, setCustomDariHarian] = useState(hariIniStr());
  const [customSampaiHarian, setCustomSampaiHarian] = useState(hariIniStr());
  const [harian, setHarian] = useState([]);
  const [loadingHarian, setLoadingHarian] = useState(true);

  const [opsiLvp, setOpsiLvp] = useState("30");
  const [customDariLvp, setCustomDariLvp] = useState(hariIniStr());
  const [customSampaiLvp, setCustomSampaiLvp] = useState(hariIniStr());
  const [leadsVsPeserta, setLeadsVsPeserta] = useState([]);
  const [loadingLvp, setLoadingLvp] = useState(true);

  const [kendala, setKendala] = useState([]);
  const [loadingKendala, setLoadingKendala] = useState(true);
  const [distribusi, setDistribusi] = useState(null);
  const [loadingDistribusi, setLoadingDistribusi] = useState(true);

  const rentangHarian = hitungRentang(opsiHarian, customDariHarian, customSampaiHarian);
  const rentangLvp = hitungRentang(opsiLvp, customDariLvp, customSampaiLvp);

  const loadHarian = useCallback(async (dari, sampai) => {
    setLoadingHarian(true);
    try {
      const res = await fetch(`/api/sales/seminar-insight/harian?dari=${dari}&sampai=${sampai}`, { headers: headers() });
      const json = await res.json();
      if (json.success) setHarian(json.data.kelompok || []);
    } catch {
      // diamkan - panel cukup tampil kosong
    } finally {
      setLoadingHarian(false);
    }
  }, []);

  const loadLvp = useCallback(async (dari, sampai) => {
    setLoadingLvp(true);
    try {
      const res = await fetch(`/api/sales/seminar-insight/leads-vs-peserta?dari=${dari}&sampai=${sampai}`, { headers: headers() });
      const json = await res.json();
      if (json.success) setLeadsVsPeserta(json.data || []);
    } catch {
      // diamkan
    } finally {
      setLoadingLvp(false);
    }
  }, []);

  useEffect(() => {
    loadHarian(rentangHarian.dari, rentangHarian.sampai);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsiHarian, customDariHarian, customSampaiHarian]);

  useEffect(() => {
    loadLvp(rentangLvp.dari, rentangLvp.sampai);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsiLvp, customDariLvp, customSampaiLvp]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sales/percakapan/stats?hanya_lead_valid=1`, { headers: headers() });
        const json = await res.json();
        if (json.success) setDistribusi(json.data);
      } catch {
        // diamkan
      } finally {
        setLoadingDistribusi(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch(`/api/sales/seminar-insight/kendala`, { headers: headers() });
        const json = await res.json();
        if (json.success) setKendala(json.data || []);
      } catch {
        // diamkan
      } finally {
        setLoadingKendala(false);
      }
    })();
  }, []);

  return (
    <section className={styles.wrap}>
      <article className="panel panel--chart">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Lead yang ada di lead_lpwas &amp; punya order (sama seperti Analisa Leads)</p>
            <h3 className="panel__title">Distribusi Lead Tervalidasi</h3>
          </div>
        </div>
        {loadingDistribusi ? (
          <p className={styles.tdEmpty}>Memuat...</p>
        ) : (
          <div className={styles.distribusiRow}>
            {DISTRIBUSI_LABEL.map((d) => (
              <div key={d.key} className={styles.distribusiCard} style={{ "--warna": d.warna }}>
                <span className={styles.distribusiValue}>{fmtN(distribusi?.per_status?.[d.key])}</span>
                <span className={styles.distribusiLabel}>{d.label}</span>
              </div>
            ))}
            <div className={styles.distribusiCard} style={{ "--warna": "#6366f1" }}>
              <span className={styles.distribusiValue}>{fmtN(distribusi?.total)}</span>
              <span className={styles.distribusiLabel}>Total Valid</span>
            </div>
          </div>
        )}
      </article>

      <article className="panel panel--chart">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Biaya, CTWA, Buyer, Omzet per kota/kategori</p>
            <h3 className="panel__title">Ringkasan Seminar Harian</h3>
          </div>
          <RentangTanggalFilter
            opsi={opsiHarian}
            setOpsi={setOpsiHarian}
            customDari={customDariHarian}
            setCustomDari={setCustomDariHarian}
            customSampai={customSampaiHarian}
            setCustomSampai={setCustomSampaiHarian}
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kelompok</th>
                <th>Biaya</th>
                <th>Contact (CTWA)</th>
                <th>Cost/Contact</th>
                <th>Buyer</th>
                <th>Omzet</th>
                <th>Cost/Buyer</th>
                <th>Conv.</th>
                <th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {loadingHarian ? (
                <tr><td colSpan={9} className={styles.tdEmpty}>Memuat...</td></tr>
              ) : harian.length === 0 ? (
                <tr><td colSpan={9} className={styles.tdEmpty}>Tidak ada aktivitas iklan/order di rentang ini.</td></tr>
              ) : (
                harian.map((r) => (
                  <tr key={r.kelompok}>
                    <td className={styles.tdKelompok}>{r.kelompok}</td>
                    <td>{fmtRp(r.biaya)}</td>
                    <td>{fmtN(r.contact)}</td>
                    <td>{r.cost_per_contact != null ? fmtRp(r.cost_per_contact) : "-"}</td>
                    <td>{fmtN(r.buyer)}</td>
                    <td>{fmtRp(r.omzet)}</td>
                    <td>{r.cost_per_buyer != null ? fmtRp(r.cost_per_buyer) : "-"}</td>
                    <td>{r.conversion_rate_persen != null ? `${r.conversion_rate_persen}%` : "-"}</td>
                    <td className={r.roas != null && r.roas >= 1 ? styles.roasBaik : r.roas != null ? styles.roasKurang : ""}>
                      {r.roas != null ? `${r.roas}x` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.catatan}>
          Biaya &amp; Contact dari Meta Ads (dikelompokkan by kota dari nama campaign). Buyer &amp; Omzet dari order berstatus Paid/Waiting Approval di rentang tanggal yang sama.
        </p>
      </article>

      <article className="panel panel--chart">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Leads masuk vs yang jadi peserta (Paid/Waiting Approval), rentang yang sama</p>
            <h3 className="panel__title">Leads vs Peserta per Produk</h3>
          </div>
          <RentangTanggalFilter
            opsi={opsiLvp}
            setOpsi={setOpsiLvp}
            customDari={customDariLvp}
            setCustomDari={setCustomDariLvp}
            customSampai={customSampaiLvp}
            setCustomSampai={setCustomSampaiLvp}
          />
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Kelompok</th><th>Leads Masuk</th><th>Peserta</th><th>Rasio</th></tr>
            </thead>
            <tbody>
              {loadingLvp ? (
                <tr><td colSpan={4} className={styles.tdEmpty}>Memuat...</td></tr>
              ) : leadsVsPeserta.length === 0 ? (
                <tr><td colSpan={4} className={styles.tdEmpty}>Belum ada data di rentang ini.</td></tr>
              ) : (
                leadsVsPeserta.map((r) => (
                  <tr key={r.kelompok}>
                    <td className={styles.tdKelompok}>{r.kelompok}</td>
                    <td>{fmtN(r.leads_masuk)}</td>
                    <td>{fmtN(r.peserta)}</td>
                    <td>
                      {r.rasio_persen != null ? (
                        `${r.rasio_persen}%`
                      ) : r.data_leads_tidak_lengkap ? (
                        <span className={styles.badgeWarn} title="Peserta lebih banyak dari leads yang tercatat di rentang ini - data lead_lpwas kemungkinan tidak menangkap semua lead masuk">
                          data lead tidak lengkap
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.catatan}>
          "Leads Masuk" cuma menangkap lead yang chat pakai format baku ("Saya mau ikut ... di ...") - kalau Peserta lebih banyak dari Leads Masuk, rasionya tidak ditampilkan karena datanya jelas tidak lengkap.
        </p>
      </article>

      <article className="panel panel--chart">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Alasan penolakan/penundaan lead terbanyak, all-time</p>
            <h3 className="panel__title">Kendala Lead per Produk</h3>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Kelompok</th><th>Kendala Terbanyak</th><th>Total</th><th>Rincian</th></tr>
            </thead>
            <tbody>
              {loadingKendala ? (
                <tr><td colSpan={4} className={styles.tdEmpty}>Memuat...</td></tr>
              ) : kendala.length === 0 ? (
                <tr><td colSpan={4} className={styles.tdEmpty}>Belum ada data kendala.</td></tr>
              ) : (
                kendala.map((r) => (
                  <tr key={r.kelompok}>
                    <td className={styles.tdKelompok}>{r.kelompok}</td>
                    <td><span className={styles.badgeKendala}>{LABEL_KENDALA[r.kendala_terbanyak] || r.kendala_terbanyak}</span></td>
                    <td>{fmtN(r.total_kendala)}</td>
                    <td className={styles.rincian}>
                      {Object.entries(r.breakdown || {}).map(([k, v]) => `${LABEL_KENDALA[k] || k}: ${v}`).join(" · ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
