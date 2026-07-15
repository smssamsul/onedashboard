/**
 * Parser CSV ringan untuk Order Cepat (UTF-8, field boleh pakai tanda kutip).
 */

function normalizeHeaderKey(h) {
  return String(h || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function detectDelimiter(firstLine) {
  const s = String(firstLine || "");
  const counts = [
    { d: ";", c: (s.match(/;/g) || []).length },
    { d: ",", c: (s.match(/,/g) || []).length },
    { d: "\t", c: (s.match(/\t/g) || []).length },
  ];
  counts.sort((a, b) => b.c - a.c);
  return counts[0]?.c ? counts[0].d : ",";
}

/** Parse satu file CSV/TSV → array objek; key = header dinormalisasi. */
export function parseCsvToRecords(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  const rows = [];
  let i = 0;
  const len = text.length;
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const DELIM = detectDelimiter(firstLine);

  const parseCell = () => {
    let s = "";
    if (i < len && text[i] === '"') {
      i++;
      while (i < len) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            s += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        s += text[i++];
      }
      return s;
    }
    while (i < len && text[i] !== DELIM && text[i] !== "\r" && text[i] !== "\n") {
      s += text[i++];
    }
    return s;
  };

  const parseRow = () => {
    const cells = [];
    while (i < len) {
      cells.push(parseCell());
      if (i >= len) break;
      if (text[i] === DELIM) {
        i++;
        continue;
      }
      if (text[i] === "\r") {
        i++;
        if (text[i] === "\n") i++;
        break;
      }
      if (text[i] === "\n") {
        i++;
        break;
      }
    }
    return cells;
  };

  while (i < len) {
    const row = parseRow();
    if (row.some((c) => String(c).trim() !== "")) rows.push(row.map((c) => String(c).trim()));
  }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => normalizeHeaderKey(h));
  return rows.slice(1).map((cells) => {
    const o = {};
    headers.forEach((h, idx) => {
      o[h] = (cells[idx] ?? "").trim();
    });
    return o;
  });
}

export function pickCsvField(row, candidates) {
  for (const c of candidates) {
    const k = normalizeHeaderKey(c);
    const v = row[k];
    if (v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** Angka dari Excel seperti 123.0 → "123" */
export function normalizeIdToken(s) {
  const t = String(s || "").trim();
  if (t === "") return "";
  const n = Number(t);
  if (Number.isFinite(n) && n >= 0 && n === Math.floor(n)) return String(Math.floor(n));
  return t;
}

// Kolom template: A=nama, B=no WA, C=id_produk, D=kode_produk, E=bundling_id
// Disediakan beberapa baris kosong agar user tinggal isi.
// Pakai delimiter ';' supaya Excel (locale ID) otomatis pecah jadi kolom A-E.
const TEMPLATE = `nama;wa;id_produk;kode_produk;bundling_id
;;;;
;;;;
;;;;
;;;;
;;;;
`;

export function downloadQuickOrderCsvTemplate() {
  const blob = new Blob(["\uFEFF" + TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_order_cepat.csv";
  a.click();
  URL.revokeObjectURL(url);
}
