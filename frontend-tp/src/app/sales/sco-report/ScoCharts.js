"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./scoReport.module.css";

// Warna mengikuti entitas, sama di semua grafik (palet tervalidasi terhadap latar putih):
// Biaya = biru, Omzet = oranye, Leads = hijau, Closing = ungu.
const WARNA = {
  biaya: "#2a78d6",
  omzet: "#eb6834",
  leads: "#008300",
  closing: "#4a3aa7",
};
const LABEL = { biaya: "Biaya", omzet: "Omzet", leads: "Leads", closing: "Closing" };
const GRID = "#e8e7e1";
const URUTAN = ["biaya", "omzet", "leads", "closing"];
const urutSeri = (item) => URUTAN.indexOf(item.dataKey);
const TEKS_SUMBU = "#898781";
const PERMUKAAN = "#ffffff";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtN = (n) => Number(n || 0).toLocaleString("id-ID");

// Rp ringkas untuk sumbu: 1,2 jt / 850 rb.
function fmtRpRingkas(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return String(v);
}

function fmtTglPendek(s) {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function fmtTglPanjang(s) {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Tooltip: nilai tebal di depan, nama seri di belakang, kunci berupa garis pendek warna seri. */
function Tip({ active, payload, label, judul, formatNilai, ekstra }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={styles.chartTip}>
      <div className={styles.chartTipJudul}>{judul ? judul(label, payload) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className={styles.chartTipBaris}>
          <span className={styles.chartTipKunci} style={{ background: p.color || p.stroke || p.fill }} />
          <strong>{formatNilai[p.dataKey] ? formatNilai[p.dataKey](p.value) : p.value}</strong>
          <span className={styles.chartTipNama}>{LABEL[p.dataKey] || p.name}</span>
        </div>
      ))}
      {ekstra && ekstra(payload)}
    </div>
  );
}

/** Label sumbu satu baris (tick bawaan recharts membungkus teks yang lebih lebar dari sumbu). */
function TickSatuBaris({ x, y, payload, format, anchor = "end", dx = -6, dy = 4, warna = TEKS_SUMBU }) {
  return (
    <text x={x} y={y} dx={dx} dy={dy} textAnchor={anchor} fill={warna} fontSize={11}>
      {format ? format(payload.value) : payload.value}
    </text>
  );
}

const sumbuProps = {
  tick: { fill: TEKS_SUMBU, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: GRID },
};

export default function ScoCharts({ harian = [], produk = [] }) {
  const adaHarian = harian.some((h) => h.biaya > 0 || h.leads > 0 || h.closing > 0);

  // 10 produk beriklan dengan biaya terbesar.
  const topProduk = produk
    .filter((p) => p.ada_iklan)
    .sort((a, b) => b.biaya - a.biaya)
    .slice(0, 10)
    .map((p) => ({
      nama: p.produk_nama.replace(/^Seminar Ternak Properti /, "Seminar ").replace(/\s*\(AS\)$/, ""),
      namaLengkap: p.produk_nama,
      biaya: p.biaya,
      omzet: p.omzet,
      roas: p.roas,
      closing: p.closing,
    }));

  if (!adaHarian && topProduk.length === 0) return null;

  return (
    <div className={styles.chartGrid}>
      <section className={styles.chartCard} aria-labelledby="sco-grafik-biaya">
        <h3 id="sco-grafik-biaya" className={styles.chartJudul}>Biaya iklan per hari</h3>
        <p className={styles.chartSub}>termasuk PPN</p>
        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={harian} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="tanggal" tickFormatter={fmtTglPendek} minTickGap={16} {...sumbuProps} />
              <YAxis width={56} {...sumbuProps} axisLine={false} tick={<TickSatuBaris format={fmtRpRingkas} />} />
              <Tooltip
                cursor={{ fill: "rgba(42,120,214,0.08)" }}
                content={<Tip judul={(l) => fmtTglPanjang(l)} formatNilai={{ biaya: fmtRp }} />}
              />
              <Bar dataKey="biaya" fill={WARNA.biaya} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.chartCard} aria-labelledby="sco-grafik-leads">
        <h3 id="sco-grafik-leads" className={styles.chartJudul}>Leads &amp; closing per hari</h3>
        <p className={styles.chartSub}>orang unik per hari, produk beriklan</p>
        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={harian} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="tanggal" tickFormatter={fmtTglPendek} minTickGap={16} {...sumbuProps} />
              <YAxis allowDecimals={false} width={40} {...sumbuProps} axisLine={false} />
              <Tooltip
                cursor={{ stroke: TEKS_SUMBU, strokeWidth: 1 }}
                itemSorter={urutSeri}
                content={<Tip judul={(l) => fmtTglPanjang(l)} formatNilai={{ leads: fmtN, closing: fmtN }} />}
              />
              <Legend iconType="plainline" iconSize={16} itemSorter={urutSeri} wrapperStyle={{ fontSize: 12, color: "#52514e" }} formatter={(v) => LABEL[v] || v} />
              {["leads", "closing"].map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={WARNA[k]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: PERMUKAAN, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {topProduk.length > 0 && (
        <section className={`${styles.chartCard} ${styles.chartLebar}`} aria-labelledby="sco-grafik-produk">
          <h3 id="sco-grafik-produk" className={styles.chartJudul}>Biaya vs omzet per produk</h3>
          <p className={styles.chartSub}>
            {topProduk.length === 10 ? "10 produk dengan biaya iklan terbesar" : "produk beriklan"} · omzet dari order closing
          </p>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height={topProduk.length * 46 + 48}>
              <BarChart data={topProduk} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" {...sumbuProps} tick={<TickSatuBaris format={fmtRpRingkas} anchor="middle" dx={0} dy={12} />} />
                <YAxis
                  type="category"
                  dataKey="nama"
                  width={190}
                  {...sumbuProps}
                  axisLine={false}
                  tick={<TickSatuBaris warna="#52514e" format={(v) => (v.length > 28 ? `${v.slice(0, 27)}…` : v)} />}
                />
                <Tooltip
                  cursor={{ fill: "rgba(42,120,214,0.06)" }}
                  itemSorter={urutSeri}
                  content={
                    <Tip
                      judul={(l, payload) => payload?.[0]?.payload?.namaLengkap || l}
                      formatNilai={{ biaya: fmtRp, omzet: fmtRp }}
                      ekstra={(payload) => {
                        const d = payload?.[0]?.payload;
                        if (!d) return null;
                        return (
                          <div className={styles.chartTipEkstra}>
                            ROAS {d.roas === null || d.roas === undefined ? "–" : `${Number(d.roas).toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`} · {fmtN(d.closing)} closing
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Legend iconType="rect" iconSize={10} itemSorter={urutSeri} wrapperStyle={{ fontSize: 12, color: "#52514e" }} formatter={(v) => LABEL[v] || v} />
                <Bar dataKey="biaya" fill={WARNA.biaya} maxBarSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                <Bar dataKey="omzet" fill={WARNA.omzet} maxBarSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {adaHarian && (
        <details className={`${styles.catatan} ${styles.chartLebar}`}>
          <summary>Lihat data harian (tabel)</summary>
          <div className={styles.tableWrap} style={{ marginTop: "0.5rem" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Biaya</th>
                  <th>Impresi</th>
                  <th>Leads</th>
                  <th>Closing</th>
                </tr>
              </thead>
              <tbody>
                {harian.map((h) => (
                  <tr key={h.tanggal}>
                    <td>{fmtTglPanjang(h.tanggal)}</td>
                    <td>{fmtRp(h.biaya)}</td>
                    <td>{fmtN(h.impresi)}</td>
                    <td>{fmtN(h.leads)}</td>
                    <td>{fmtN(h.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
