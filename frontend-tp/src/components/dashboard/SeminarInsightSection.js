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

export default function SeminarInsightSection() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [harian, setHarian] = useState([]);
  const [loadingHarian, setLoadingHarian] = useState(true);
  const [leadsVsPeserta, setLeadsVsPeserta] = useState([]);
  const [loadingLvp, setLoadingLvp] = useState(true);
  const [kendala, setKendala] = useState([]);
  const [loadingKendala, setLoadingKendala] = useState(true);

  const loadHarian = useCallback(async (tgl) => {
    setLoadingHarian(true);
    try {
      const res = await fetch(`/api/sales/seminar-insight/harian?tanggal=${tgl}`, { headers: headers() });
      const json = await res.json();
      if (json.success) setHarian(json.data.kelompok || []);
    } catch {
      // diamkan - panel cukup tampil kosong
    } finally {
      setLoadingHarian(false);
    }
  }, []);

  useEffect(() => {
    loadHarian(tanggal);
  }, [tanggal, loadHarian]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sales/seminar-insight/leads-vs-peserta`, { headers: headers() });
        const json = await res.json();
        if (json.success) setLeadsVsPeserta(json.data || []);
      } catch {
        // diamkan
      } finally {
        setLoadingLvp(false);
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

  function hariGeser(delta) {
    const d = new Date(tanggal + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setTanggal(d.toISOString().slice(0, 10));
  }

  return (
    <section className={styles.wrap}>
      <article className="panel panel--chart">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Biaya, CTWA, Buyer, Omzet per kota/kategori</p>
            <h3 className="panel__title">Ringkasan Seminar Harian</h3>
          </div>
          <div className={styles.dateNav}>
            <button type="button" className={styles.dateBtn} onClick={() => hariGeser(-1)}>‹</button>
            <input type="date" className={styles.dateInput} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            <button type="button" className={styles.dateBtn} onClick={() => hariGeser(1)}>›</button>
          </div>
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
                <tr><td colSpan={9} className={styles.tdEmpty}>Tidak ada aktivitas iklan/order di tanggal ini.</td></tr>
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
          Biaya &amp; Contact dari Meta Ads (dikelompokkan by kota dari nama campaign). Buyer &amp; Omzet dari order berstatus Paid/Waiting Approval di tanggal yang sama.
        </p>
      </article>

      <article className="panel panel--chart">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Leads masuk vs yang jadi peserta (Paid/Waiting Approval), all-time</p>
            <h3 className="panel__title">Leads vs Peserta per Produk</h3>
          </div>
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
                <tr><td colSpan={4} className={styles.tdEmpty}>Belum ada data.</td></tr>
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
                        <span className={styles.badgeWarn} title="Peserta lebih banyak dari leads yang tercatat - data lead_lpwas kemungkinan tidak menangkap semua lead masuk">
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
