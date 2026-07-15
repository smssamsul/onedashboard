/**
 * Helper function untuk mempersiapkan FormData dari form state
 * sesuai dengan format yang diharapkan backend Laravel
 * 
 * @param {Object} form - Object form dari state React
 * @param {Object} options - Opsi tambahan
 * @param {Function} options.generateKode - Function untuk generate kode dari nama
 * @param {Function} options.formatDateForBackend - Function untuk format tanggal
 * @returns {FormData} FormData siap kirim ke backend
 */
export function prepareProductPayload(form, options = {}) {
  const {
    generateKode = (text) => {
      return (text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    },
    formatDateForBackend = (date) => {
      if (!date) return "";
      const d = new Date(date);
      const pad = (v) => (v < 10 ? `0${v}` : v);
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      const seconds = pad(d.getSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
  } = options;

  const payload = new FormData();

  // ============================================
  // 1. kategori (wajib - number/string number)
  // ============================================
  const kategori = form.kategori;
  if (kategori !== null && kategori !== undefined && kategori !== "") {
    // Pastikan kategori adalah number atau string number
    const kategoriValue = typeof kategori === "number" ? kategori : Number(kategori);
    if (!Number.isNaN(kategoriValue) && kategoriValue > 0) {
      payload.append("kategori", String(kategoriValue));
    }
  }

  // ============================================
  // 2. nama (wajib)
  // ============================================
  payload.append("nama", form.nama || "");

  // ============================================
  // 3. user_input (wajib - number)
  // ============================================
  const userInput = form.user_input;
  if (userInput !== null && userInput !== undefined && userInput !== "") {
    // Pastikan user_input adalah number
    const userInputValue = typeof userInput === "number" ? userInput : Number(userInput);
    if (!Number.isNaN(userInputValue) && userInputValue > 0) {
      payload.append("user_input", String(userInputValue));
    }
  }

  // ============================================
  // 4. assign (wajib - STRING JSON, contoh "[5,8]")
  // ============================================
  let assignValue = form.assign || [];
  // Pastikan assign adalah array
  if (!Array.isArray(assignValue)) {
    assignValue = [];
  }
  // Filter dan normalize assign IDs
  const normalizedAssign = assignValue
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => Number(v))
    .filter((num) => !Number.isNaN(num) && num > 0);
  // Convert ke string JSON
  payload.append("assign", JSON.stringify(normalizedAssign));

  // ============================================
  // 5. kode
  // ============================================
  const kode = form.kode || generateKode(form.nama);
  payload.append("kode", kode);

  // ============================================
  // 6. url
  // ============================================
  const url = form.url || "/" + kode;
  payload.append("url", url);

  // ============================================
  // 7. deskripsi
  // ============================================
  payload.append("deskripsi", form.deskripsi || "");

  // ============================================
  // 8. harga_coret
  // ============================================
  const hargaCoret = form.harga_coret || 0;
  payload.append("harga_coret", String(hargaCoret));

  // ============================================
  // 9. harga_asli
  // ============================================
  const hargaAsli = form.harga_asli || 0;
  payload.append("harga_asli", String(hargaAsli));

  // ============================================
  // 10. tanggal_event
  // ============================================
  payload.append("tanggal_event", formatDateForBackend(form.tanggal_event));

  // ============================================
  // 11. landingpage
  // ============================================
  payload.append("landingpage", String(form.landingpage || "1"));

  // ============================================
  // 12. status
  // ============================================
  payload.append("status", String(form.status || 1));

  // ============================================
  // 13. custom_field (STRING JSON)
  // ============================================
  let customField = form.custom_field || [];
  if (!Array.isArray(customField)) {
    customField = [];
  }
  // Transform custom_field ke format backend
  const payloadCustomField = customField.map((f, idx) => ({
    nama_field: f.label || f.key || "",
    urutan: idx + 1,
  }));
  payload.append("custom_field", JSON.stringify(payloadCustomField));

  // ============================================
  // 14. list_point (STRING JSON)
  // ============================================
  let listPoint = form.list_point || [];
  if (!Array.isArray(listPoint)) {
    listPoint = [];
  }
  payload.append("list_point", JSON.stringify(listPoint));

  // ============================================
  // 15. fb_pixel (STRING JSON)
  // ============================================
  let fbPixel = form.fb_pixel || [];
  if (!Array.isArray(fbPixel)) {
    fbPixel = [];
  }
  payload.append("fb_pixel", JSON.stringify(fbPixel));

  // ============================================
  // 16. event_fb_pixel (STRING JSON)
  // ============================================
  let eventFbPixel = form.event_fb_pixel || [];
  if (!Array.isArray(eventFbPixel)) {
    eventFbPixel = [];
  }
  // Transform ke format {event: ...}
  const payloadEventFbPixel = eventFbPixel.map((ev) => ({ event: ev }));
  payload.append("event_fb_pixel", JSON.stringify(payloadEventFbPixel));

  // ============================================
  // 17. gtm (STRING JSON)
  // ============================================
  let gtm = form.gtm || [];
  if (!Array.isArray(gtm)) {
    gtm = [];
  }
  payload.append("gtm", JSON.stringify(gtm));

  // ============================================
  // 18. video (STRING JSON)
  // ============================================
  let video = form.video || "";
  // Jika video adalah string (dipisah koma), convert ke array
  let videoArray = [];
  if (typeof video === "string" && video.trim() !== "") {
    videoArray = video
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);
  } else if (Array.isArray(video)) {
    videoArray = video.filter((v) => v && v.trim() !== "");
  }
  payload.append("video", JSON.stringify(videoArray));

  // ============================================
  // 19. header (file) - pass-through
  // ============================================
  if (form.header && form.header.type === "file" && form.header.value) {
    // File langsung di-append tanpa modifikasi
    payload.append("header", form.header.value);
  }

  // ============================================
  // 20. gambar[] (jika ada)
  // ============================================
  let gambar = form.gambar || [];
  if (!Array.isArray(gambar)) {
    gambar = [];
  }
  for (let idx = 0; idx < gambar.length; idx++) {
    const g = gambar[idx];
    // Append file jika ada
    if (g.path && g.path.type === "file" && g.path.value) {
      payload.append(`gambar[${idx}][file]`, g.path.value);
    }
    // Append caption
    payload.append(`gambar[${idx}][caption]`, g.caption || "");
  }

  // ============================================
  // 21. testimoni[] (jika ada)
  // ============================================
  let testimoni = form.testimoni || [];
  if (!Array.isArray(testimoni)) {
    testimoni = [];
  }
  for (let idx = 0; idx < testimoni.length; idx++) {
    const t = testimoni[idx];
    // Append file jika ada
    if (t.gambar && t.gambar.type === "file" && t.gambar.value) {
      payload.append(`testimoni[${idx}][gambar]`, t.gambar.value);
    }
    // Append nama dan deskripsi
    payload.append(`testimoni[${idx}][nama]`, t.nama || "");
    payload.append(`testimoni[${idx}][deskripsi]`, t.deskripsi || "");
  }

  return payload;
}

