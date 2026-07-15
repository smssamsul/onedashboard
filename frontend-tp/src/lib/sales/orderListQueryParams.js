const UTM_COLUMN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

/** Nilai per_page untuk menampilkan semua baris sekaligus (satu halaman). */
export const ORDER_LIST_PER_PAGE_ALL = 99999;

export function resolveOrderListPerPageForRequest(perPage) {
  const n = Number(perPage);
  if (n === ORDER_LIST_PER_PAGE_ALL) return ORDER_LIST_PER_PAGE_ALL;
  if (!Number.isFinite(n) || n < 1) return 15;
  return Math.min(n, ORDER_LIST_PER_PAGE_ALL);
}

/** Query string untuk GET /api/sales/order (admin — sama dengan Daftar Pesanan). */
export function buildAdminOrdersQueryParams(pageNumber, perPageNum, filters) {
  const params = new URLSearchParams({
    page: String(pageNumber),
    per_page: String(resolveOrderListPerPageForRequest(perPageNum)),
  });
  if (filters.search && filters.search.trim()) {
    params.append("search", filters.search.trim());
  }
  if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0]) {
    const fromDate = new Date(filters.dateRange[0]);
    const toDate = filters.dateRange[1] ? new Date(filters.dateRange[1]) : new Date(filters.dateRange[0]);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    const formatLocal = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    params.append("tanggal_from", formatLocal(fromDate));
    params.append("tanggal_to", formatLocal(toDate));
  }
  if (filters.statusOrder?.length) {
    filters.statusOrder.forEach((status) => params.append("status_order[]", status));
  }
  if (filters.statusPembayaran?.length) {
    filters.statusPembayaran.forEach((status) => params.append("status_pembayaran[]", status));
  }
  if (filters.products?.length) {
    filters.products.forEach((productId) => params.append("produk_id[]", productId));
  }
  UTM_COLUMN_KEYS.forEach((key) => {
    const vals = filters.utmByColumn?.[key] || [];
    vals.forEach((v) => params.append(`${key}[]`, v));
  });
  return params;
}

/** Query string untuk GET /api/sales/order/sales (staff). */
export function buildStaffOrdersQueryParams(pageNumber, perPageNum, filters) {
  const params = new URLSearchParams({
    page: String(pageNumber),
    per_page: String(resolveOrderListPerPageForRequest(perPageNum)),
  });
  if (filters.search && filters.search.trim()) {
    params.append("search", filters.search.trim());
  }
  if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0]) {
    const fromDate = new Date(filters.dateRange[0]);
    const toDate = filters.dateRange[1] ? new Date(filters.dateRange[1]) : new Date(filters.dateRange[0]);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    const formatLocal = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    params.append("tanggal_from", formatLocal(fromDate));
    params.append("tanggal_to", formatLocal(toDate));
  }
  if (filters.statusOrder?.length) {
    filters.statusOrder.forEach((status) => params.append("status_order", status));
  }
  if (filters.statusPembayaran?.length) {
    filters.statusPembayaran.forEach((status) => params.append("status_pembayaran", status));
  }
  if (filters.products?.length) {
    filters.products.forEach((productId) => params.append("produk_id", productId));
  }
  UTM_COLUMN_KEYS.forEach((key) => {
    const vals = filters.utmByColumn?.[key] || [];
    vals.forEach((v) => params.append(`${key}[]`, v));
  });
  return params;
}

/**
 * Baris filter untuk ditulis di atas tabel data di file CSV.
 * @param {Record<string, string>} meta — label sudah jadi teks (tanggal, status, produk, UTM, dll.)
 */
export function buildOrderExportFilterRows(meta) {
  const rows = [
    { Kunci: "Bagian", Nilai: "FILTER / KONTEKS EXPORT" },
    { Kunci: "Waktu export (UTC)", Nilai: meta.waktuExport || new Date().toISOString() },
    { Kunci: "Mode export", Nilai: meta.exportMode || "-" },
    { Kunci: "Baris per halaman (UI)", Nilai: meta.perPageLabel || "-" },
    { Kunci: "Pencarian", Nilai: meta.search || "-" },
    { Kunci: "Rentang tanggal order", Nilai: meta.dateRangeText || "-" },
    { Kunci: "Status order", Nilai: meta.statusOrderText || "-" },
    { Kunci: "Status pembayaran", Nilai: meta.statusPembayaranText || "-" },
    { Kunci: "Filter produk", Nilai: meta.productsText || "-" },
  ];
  (meta.utmLines || []).forEach(({ label, value }) => {
    rows.push({ Kunci: label, Nilai: value || "-" });
  });
  return rows;
}

/** Gabungkan blok filter (2 kolom) lalu baris kosong lalu isi CSV data order. */
export function prependFilterSectionToOrderCsv(filterRows, dataCsvBody) {
  const filterCsv = ordersToCsvString(filterRows);
  if (!dataCsvBody) return filterCsv;
  return `${filterCsv}\r\n\r\n${dataCsvBody}`;
}

/** Baris objek homogen → CSV (tanpa BOM; gunakan downloadCsvBlob untuk Excel). */
export function ordersToCsvString(records) {
  if (!records.length) return "";
  const headers = Object.keys(records[0]);
  const esc = (val) => {
    const s = val == null ? "" : String(val);
    if (/[\";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(";"), ...records.map((row) => headers.map((h) => esc(row[h])).join(";"))];
  return lines.join("\r\n");
}

export function downloadCsvBlob(filename, csvUtf8Body) {
  const blob = new Blob(["\uFEFF" + csvUtf8Body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
