"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import LandingTemplate from "@/components/LandingTemplate";
import { MultiSelect } from "primereact/multiselect";
import { ArrowLeft } from "lucide-react";
import "@/styles/sales/add-products.css";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id;

  // ============================
  // SLUGIFY - Generate kode dari nama
  // ============================
  const generateKode = (text) => {
    return (text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  };


  // ============================
  // FORMAT TANGGAL KE BACKEND
  // ============================
  const formatDateForBackend = (date) => {
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
  };

  // ============================
  // DEFAULT FORM
  // ============================
  const defaultForm = {
    id: null,
    kategori: null, // Integer, bukan array
    user_input: [],
    nama: "",
    url: "",
    kode: "",
    header: { type: "file", value: null },
    harga_coret: "",
    harga_asli: "",
    deskripsi: "",
    tanggal_event: "",
    gambar: [], // [{ path: {type:'file', value:File}, caption }]
    landingpage: "1", // 1 = non-fisik, 2 = fisik
    status: 1,
    assign: [],
    custom_field: [],
    list_point: [],
    testimoni: [],
    fb_pixel: [],
    event_fb_pixel: [],
    gtm: [],
    video: "",
    jadwal: [], // [{ nama_jadwal, waktu_mulai, waktu_selesai, kuota, status }]
  };

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  // Meta Pixel options untuk dropdown
  const [metaPixelOptions, setMetaPixelOptions] = useState([]);
  const [isLoadingMetaPixel, setIsLoadingMetaPixel] = useState(false);
  const [isCreatingMetaPixel, setIsCreatingMetaPixel] = useState(false);

  // ============================
  // HANDLER INPUT
  // ============================
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateArrayItem = (key, i, field, value) => {
    const arr = [...form[key]];
    if (field) arr[i][field] = value;
    else arr[i] = value;
    setForm((p) => ({ ...p, [key]: arr }));
  };

  const addArray = (key, value) => {
    setForm((p) => ({ ...p, [key]: [...p[key], value] }));
  };

  const removeArray = (key, index) => {
    const arr = [...form[key]];
    arr.splice(index, 1);
    setForm((p) => ({ ...p, [key]: arr }));
  };

  // ============================
  // HELPER: Build Image URL via Proxy
  // ============================
  const buildImageUrl = (path) => {
    if (!path) return "";
    if (typeof path !== "string") return "";
    // Jika sudah URL lengkap (http/https), return langsung
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    // Jika blob URL (untuk preview file baru)
    if (path.startsWith("blob:")) return path;
    // Gunakan proxy untuk path dari backend
    let cleanPath = path.replace(/^storage\//, "").replace(/^\//, "");
    return `/api/image?path=${encodeURIComponent(cleanPath)}`;
  };

  // ============================
  // DELETE: Hapus Gambar Gallery via API
  // ============================
  const deleteGalleryImage = async (index) => {
    if (!productId) return;

    const confirmed = window.confirm(`Hapus gambar ke-${index + 1} dari server?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/produk/${productId}/gambar/${index}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menghapus gambar");
        return;
      }

      alert("Gambar berhasil dihapus");
      // Refresh data produk
      await fetchProductData(false);
    } catch (error) {
      console.error("Delete gallery error:", error);
      alert("Terjadi kesalahan saat menghapus gambar");
    }
  };

  // ============================
  // DELETE: Hapus Testimoni via API
  // ============================
  const deleteTestimoni = async (index) => {
    if (!productId) return;

    const confirmed = window.confirm(`Hapus testimoni ke-${index + 1} dari server?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/produk/${productId}/testimoni/${index}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menghapus testimoni");
        return;
      }

      alert("Testimoni berhasil dihapus");
      // Refresh data produk
      await fetchProductData(false);
    } catch (error) {
      console.error("Delete testimoni error:", error);
      alert("Terjadi kesalahan saat menghapus testimoni");
    }
  };

  // ============================
  // DELETE: Hapus Data Produk
  // ============================
  const deleteProduct = async () => {
    if (!productId) {
      alert("Product ID tidak ditemukan!");
      return;
    }

    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan."
    );
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      setSubmitStatus("Menghapus produk...");

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/produk/${productId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menghapus produk");
        setIsSubmitting(false);
        setSubmitStatus("");
        return;
      }

      alert("Produk berhasil dihapus");
      // Redirect ke halaman products
      router.push("/sales/products");
    } catch (error) {
      console.error("Delete product error:", error);
      alert("Terjadi kesalahan saat menghapus produk");
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  // ============================
  // COMPRESS IMAGE BEFORE UPLOAD
  // Sama seperti addProducts/page.js
  // ============================
  const compressImage = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create new File object with compressed data
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // ============================
  // BUILD PRODUCT FORMDATA
  // Sama persis dengan addProducts/page.js
  // Sesuai dokumentasi Postman: multipart/form-data dengan file langsung
  // Array fields sebagai JSON string
  // ============================
  async function buildProductFormData(form, kategoriId, normalizedAssign, onProgress = null) {
    // ============================
    // AMBIL DATA ORIGINAL DARI LOCALSTORAGE SEBAGAI FALLBACK
    // ============================
    let originalData = null;
    try {
      const stored = localStorage.getItem(`product_original_data_${productId}`);
      if (stored) {
        originalData = JSON.parse(stored);
        console.log("[FORMDATA] ✅ Original data loaded from localStorage:", {
          productId: productId,
          fields: Object.keys(originalData)
        });
      }
    } catch (error) {
      console.error("[FORMDATA] ❌ Failed to load original data from localStorage:", error);
    }

    // Helper: gunakan nilai dari form jika ada, jika tidak gunakan original data
    const getValue = (key, defaultValue = "") => {
      const formValue = form[key];
      if (formValue !== null && formValue !== undefined && formValue !== "") {
        return formValue;
      }
      if (originalData && originalData[key] !== null && originalData[key] !== undefined) {
        return originalData[key];
      }
      return defaultValue;
    };

    // SELALU generate kode dari nama (auto generate dengan dash)
    const kode = generateKode(form.nama) || getValue("kode") || "produk-baru";

    const formData = new FormData();

    // ============================
    // 0. _method: "PUT" - WAJIB UNTUK LARAVEL FORMDATA PUT REQUEST
    // ============================
    formData.append("_method", "PUT");

    // ============================
    // 1. BASIC FIELDS - SELALU KIRIM, GUNAKAN ORIGINAL DATA SEBAGAI FALLBACK
    // ============================
    formData.append("kategori", String(kategoriId || getValue("kategori") || ""));
    formData.append("nama", form.nama || getValue("nama") || "");
    formData.append("kode", kode);
    formData.append("url", "/" + kode);
    formData.append("deskripsi", form.deskripsi || getValue("deskripsi") || "");
    formData.append("harga_asli", String(form.harga_asli || getValue("harga_asli") || 0));
    formData.append("harga_coret", String(form.harga_coret || getValue("harga_coret") || 0));

    // Tanggal event: gunakan dari form jika ada, jika tidak dari original data
    const tanggalEvent = form.tanggal_event
      ? formatDateForBackend(form.tanggal_event)
      : (originalData?.tanggal_event || "");
    formData.append("tanggal_event", tanggalEvent);

    formData.append("landingpage", String(form.landingpage || getValue("landingpage") || "1"));
    formData.append("status", String(form.status || getValue("status") || "1"));

    console.log("[FORMDATA] Basic fields:", {
      kategori: kategoriId,
      nama: form.nama,
      kode: kode,
      url: "/" + kode
    });

    // ============================
    // 2. HEADER IMAGE - File langsung (jika ada file baru)
    // Jika tidak ada file baru, jangan kirim field header (backend akan keep existing)
    // ============================
    if (form.header?.type === "file" && form.header.value) {
      if (onProgress) {
        onProgress("Mengompresi header image...");
      }
      const compressedHeader = await compressImage(form.header.value);
      formData.append("header", compressedHeader);
    }
    // Jika header existing (type === "url"), tidak perlu append
    // Backend akan keep existing header jika field header tidak dikirim

    // ============================
    // 3. GAMBAR GALLERY - File langsung
    // Format: gambar[0][file], gambar[0][caption], gambar[1][file], gambar[1][caption]
    // SELALU kirim caption untuk semua gambar yang ada (dari form atau original data)
    // ============================
    // Gunakan form.gambar jika ada, jika tidak gunakan original data
    const gambarFromForm = form.gambar || [];
    const gambarFromOriginal = originalData?.gambar || [];
    // Ambil yang lebih banyak untuk memastikan semua gambar dikirim
    const maxGambarLength = Math.max(gambarFromForm.length, gambarFromOriginal.length);

    const gambarFiles = gambarFromForm.filter(g => g.path && g.path.type === "file" && g.path.value);
    if (onProgress && gambarFiles.length > 0) {
      onProgress(`Mengompresi ${gambarFiles.length} gambar...`);
    }

    for (let i = 0; i < maxGambarLength; i++) {
      const g = gambarFromForm[i];
      const origG = gambarFromOriginal[i];

      // Jika ada file baru, kirim file
      if (g && g.path && g.path.type === "file" && g.path.value) {
        if (onProgress) {
          onProgress(`Mengompresi gambar ${i + 1}/${gambarFiles.length}...`);
        }
        const compressedGambar = await compressImage(g.path.value);
        formData.append(`gambar[${i}][file]`, compressedGambar);
        formData.append(`gambar[${i}][caption]`, g.caption || "");
      } else {
        // Tidak ada file baru, tapi tetap kirim caption (dari form atau original)
        const caption = g?.caption || origG?.caption || "";
        formData.append(`gambar[${i}][caption]`, caption);
      }
    }

    // ============================
    // 4. TESTIMONI - File langsung
    // Format: testimoni[0][gambar], testimoni[0][nama], testimoni[0][deskripsi]
    // SELALU kirim semua testimoni yang ada (dari form atau original data)
    // ============================
    const testimoniFromForm = form.testimoni || [];
    const testimoniFromOriginal = originalData?.testimoni || [];
    // Ambil yang lebih banyak untuk memastikan semua testimoni dikirim
    const maxTestimoniLength = Math.max(testimoniFromForm.length, testimoniFromOriginal.length);

    const testimoniFiles = testimoniFromForm.filter(t => t.gambar && t.gambar.type === "file" && t.gambar.value);
    if (onProgress && testimoniFiles.length > 0) {
      onProgress(`Mengompresi ${testimoniFiles.length} testimoni...`);
    }

    for (let i = 0; i < maxTestimoniLength; i++) {
      const t = testimoniFromForm[i];
      const origT = testimoniFromOriginal[i];

      // Jika ada file baru, kirim file
      if (t && t.gambar && t.gambar.type === "file" && t.gambar.value) {
        if (onProgress) {
          onProgress(`Mengompresi testimoni ${i + 1}/${testimoniFiles.length}...`);
        }
        const compressedTestimoni = await compressImage(t.gambar.value);
        formData.append(`testimoni[${i}][gambar]`, compressedTestimoni);
      }

      // Selalu kirim nama dan deskripsi (dari form atau original data)
      const nama = t?.nama || origT?.nama || "";
      const deskripsi = t?.deskripsi || origT?.deskripsi || "";
      formData.append(`testimoni[${i}][nama]`, nama);
      formData.append(`testimoni[${i}][deskripsi]`, deskripsi);
    }

    // ============================
    // 5. ARRAY FIELDS - Sebagai JSON string (sesuai Postman)
    // Gunakan original data sebagai fallback jika form field kosong
    // ============================
    // custom_field - JSON string
    const customFieldArray = (form.custom_field && form.custom_field.length > 0)
      ? form.custom_field.map((f, idx) => ({
        nama_field: f.label || f.key || "",
        urutan: idx + 1,
      }))
      : (originalData?.custom_field || []).map((f, idx) => ({
        nama_field: f.nama_field || f.label || "",
        urutan: idx + 1,
      }));
    formData.append("custom_field", JSON.stringify(customFieldArray));

    // list_point - JSON string
    const listPointArray = (form.list_point && form.list_point.length > 0)
      ? form.list_point.map((p, idx) => ({
        nama: p.nama || "",
        urutan: idx + 1,
      }))
      : (originalData?.list_point || []).map((p, idx) => ({
        nama: typeof p === "string" ? p : (p.nama || ""),
        urutan: idx + 1,
      }));
    formData.append("list_point", JSON.stringify(listPointArray));

    // assign - JSON string (array of numbers)
    const assignArray = (normalizedAssign && normalizedAssign.length > 0)
      ? normalizedAssign
      : (originalData?.assign || []);
    formData.append("assign", JSON.stringify(assignArray));

    // fb_pixel - JSON string (array of numbers)
    const fbPixelArray = (form.fb_pixel && form.fb_pixel.length > 0)
      ? form.fb_pixel.map(v => Number(v)).filter(n => !Number.isNaN(n))
      : (originalData?.fb_pixel || []).map(v => Number(v)).filter(n => !Number.isNaN(n));
    formData.append("fb_pixel", JSON.stringify(fbPixelArray));

    // event_fb_pixel - JSON string
    const eventFbPixelArray = (form.event_fb_pixel && form.event_fb_pixel.length > 0)
      ? form.event_fb_pixel.map((ev) => ({
        event: ev || ""
      }))
      : (originalData?.event_fb_pixel || []).map((ev) => ({
        event: typeof ev === "string" ? ev : (ev.event || "")
      }));
    formData.append("event_fb_pixel", JSON.stringify(eventFbPixelArray));

    // gtm - JSON string (array of numbers)
    const gtmArray = (form.gtm && form.gtm.length > 0)
      ? form.gtm.map(v => Number(v)).filter(n => !Number.isNaN(n))
      : (originalData?.gtm || []).map(v => Number(v)).filter(n => !Number.isNaN(n));
    formData.append("gtm", JSON.stringify(gtmArray));

    // video - JSON string (array of strings)
    let videoArray = [];
    if (form.video) {
      videoArray = form.video.split(",").map((v) => v.trim()).filter((v) => v);
    } else if (originalData?.video && originalData.video.length > 0) {
      videoArray = originalData.video;
    }

    // Pastikan video selalu dikirim, bahkan jika kosong (untuk clear video)
    const videoJsonString = JSON.stringify(videoArray);
    formData.append("video", videoJsonString);

    console.log("[FORMDATA] Video field:", {
      form_video: form.video,
      videoArray: videoArray,
      videoJsonString: videoJsonString,
      videoCount: videoArray.length
    });

    // Log semua array fields untuk debugging
    console.log("[FORMDATA] Array fields:", {
      assign: normalizedAssign,
      list_point: listPointArray,
      custom_field: customFieldArray,
      event_fb_pixel: eventFbPixelArray,
      fb_pixel: fbPixelArray,
      gtm: gtmArray,
      video: videoArray,
    });

    // ============================
    // 6. JADWAL (SCHEDULES) - JSON string
    // ============================
    const jadwalArray = (form.jadwal && form.jadwal.length > 0)
      ? form.jadwal.map(j => ({
        nama_jadwal: j.nama_jadwal || "",
        waktu_mulai: j.waktu_mulai ? formatDateForBackend(j.waktu_mulai) : null,
        waktu_selesai: j.waktu_selesai ? formatDateForBackend(j.waktu_selesai) : null,
        kuota: j.kuota || null,
        status: j.status || "A"
      }))
      : (originalData?.jadwal_rel || []).map(j => ({
        nama_jadwal: j.nama_jadwal,
        waktu_mulai: j.waktu_mulai,
        waktu_selesai: j.waktu_selesai,
        kuota: j.kuota,
        status: j.status
      }));
    formData.append("jadwal", JSON.stringify(jadwalArray));

    return formData;
  }

  // ============================
  // SUBMIT - POST ke /api/admin/produk/{id}
  // Sama persis dengan addProducts/page.js tapi endpoint berbeda
  // ============================
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!productId) {
        alert("Product ID tidak ditemukan!");
        setIsSubmitting(false);
        return;
      }

      // 1) kategori validation - ambil ID dari kategori yang dipilih
      console.log("[VALIDATION] ========== KATEGORI VALIDATION ==========");
      console.log("form.kategori raw:", form.kategori);
      console.log("form.kategori type:", typeof form.kategori);

      let kategoriId = null;
      if (form.kategori !== null && form.kategori !== undefined && form.kategori !== "") {
        // form.kategori adalah string ID dari dropdown (contoh: "7")
        kategoriId = Number(form.kategori);
        console.log("Kategori ID parsed:", kategoriId);
      }

      console.log("[VALIDATION] Kategori check:", {
        formKategori: form.kategori,
        kategoriId: kategoriId,
        type: typeof form.kategori,
        isValid: !Number.isNaN(kategoriId) && kategoriId > 0
      });
      console.log("[VALIDATION] ========================================");

      if (!kategoriId || Number.isNaN(kategoriId) || kategoriId <= 0) {
        console.error("[VALIDATION] KATEGORI INVALID!");
        alert("Kategori wajib dipilih!");
        setIsSubmitting(false);
        return;
      }

      console.log("[VALIDATION] Kategori valid:", kategoriId);

      // 2) assign normalization
      const normalizedAssign = Array.isArray(form.assign)
        ? form.assign.map(a => Number(a)).filter(n => !Number.isNaN(n) && n > 0)
        : [];
      if (normalizedAssign.length === 0) {
        alert("Pilih minimal 1 penanggung jawab (assign).");
        setIsSubmitting(false);
        return;
      }

      // Build FormData dengan progress indicator (sama seperti addProducts)
      setSubmitStatus("Mempersiapkan data...");
      const formData = await buildProductFormData(
        form,
        kategoriId,
        normalizedAssign,
        (message) => setSubmitStatus(message)
      );

      // DEBUG: Log FormData untuk tracking (detail)
      console.log("[FORMDATA] ========== DETAIL FORMDATA ==========");
      const formDataEntries = [];
      const formDataJSON = {};

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          formDataEntries.push({ key, type: "File", name: value.name, size: `${(value.size / 1024).toFixed(2)} KB` });
          formDataJSON[key] = {
            type: "File",
            name: value.name,
            size: `${(value.size / 1024).toFixed(2)} KB`,
            sizeBytes: value.size,
            mimeType: value.type
          };
          console.log(`  ${key}: [File] ${value.name} (${(value.size / 1024).toFixed(2)} KB)`);
        } else {
          const str = String(value);
          formDataEntries.push({ key, type: "String", value: str.length > 200 ? str.substring(0, 200) + "..." : str });

          // Try to parse JSON strings for better readability
          let displayValue = str;
          try {
            const parsed = JSON.parse(str);
            formDataJSON[key] = parsed;
            displayValue = Array.isArray(parsed)
              ? `[Array(${parsed.length})] ${JSON.stringify(parsed).substring(0, 200)}...`
              : typeof parsed === "object"
                ? `[Object] ${JSON.stringify(parsed).substring(0, 200)}...`
                : parsed;
          } catch {
            formDataJSON[key] = str.length > 200 ? str.substring(0, 200) + "..." : str;
          }

          console.log(`  ${key}: ${displayValue.length > 200 ? displayValue.substring(0, 200) + "..." : displayValue}`);
        }
      }
      console.table(formDataEntries);

      // Tampilkan sebagai JSON yang readable
      console.log("[FORMDATA] ========== FORMDATA AS JSON ==========");
      console.log(JSON.stringify(formDataJSON, null, 2));
      console.log("[FORMDATA] =====================================");

      // Verify critical fields
      console.log("[FORMDATA] ========== CRITICAL FIELDS VERIFICATION ==========");
      const kategoriInFormData = formData.get("kategori");
      const namaInFormData = formData.get("nama");
      const assignInFormData = formData.get("assign");
      const headerInFormData = formData.get("header");
      const videoInFormData = formData.get("video");

      // Parse video untuk verifikasi
      let videoParsed = null;
      if (videoInFormData) {
        try {
          videoParsed = JSON.parse(String(videoInFormData));
        } catch (e) {
          console.error("[FORMDATA] Video parse error:", e);
        }
      }

      console.log({
        kategori: {
          value: kategoriInFormData,
          type: typeof kategoriInFormData,
          exists: kategoriInFormData !== null,
          isEmpty: kategoriInFormData === "" || kategoriInFormData === "null" || kategoriInFormData === "undefined"
        },
        nama: {
          value: namaInFormData,
          type: typeof namaInFormData,
          exists: namaInFormData !== null,
          isEmpty: !namaInFormData || namaInFormData === ""
        },
        assign: {
          value: assignInFormData,
          type: typeof assignInFormData,
          parsed: assignInFormData ? JSON.parse(assignInFormData) : null
        },
        header: {
          exists: headerInFormData !== null,
          isFile: headerInFormData instanceof File,
          name: headerInFormData instanceof File ? headerInFormData.name : null
        },
        video: {
          value: videoInFormData,
          type: typeof videoInFormData,
          exists: videoInFormData !== null,
          parsed: videoParsed,
          isArray: Array.isArray(videoParsed),
          count: Array.isArray(videoParsed) ? videoParsed.length : 0,
          raw: String(videoInFormData)
        }
      });

      // Final check sebelum kirim (sama seperti addProducts, tapi header tidak wajib untuk edit)
      if (!kategoriInFormData || kategoriInFormData === "" || kategoriInFormData === "null" || kategoriInFormData === "undefined") {
        console.error("[FORMDATA] ❌ KATEGORI TIDAK ADA DI FORMDATA!");
        throw new Error("Kategori tidak ditemukan di FormData. Pastikan kategori sudah dipilih.");
      }

      if (!namaInFormData || namaInFormData === "") {
        console.error("[FORMDATA] ❌ NAMA TIDAK ADA DI FORMDATA!");
        throw new Error("Nama produk tidak ditemukan di FormData.");
      }

      // Note: Header tidak wajib untuk edit (bisa menggunakan existing image)
      // Tapi jika ada header file baru, pastikan sudah di-append
      if (form.header?.type === "file" && form.header.value && !headerInFormData) {
        console.warn("[FORMDATA] Header file baru tidak ditemukan di FormData, tapi ini OK untuk edit");
      }

      console.log("[FORMDATA] All critical fields verified");
      console.log("[FORMDATA] =================================================");

      // ============================
      // SIMPAN REQUEST DATA KE LOCALSTORAGE DULU
      // ============================
      console.log("[LOCALSTORAGE] ========== SAVING REQUEST DATA ==========");
      const requestDataToSave = {
        timestamp: new Date().toISOString(),
        productId: productId,
        formData: formDataJSON
      };

      // Simpan ke localStorage
      try {
        localStorage.setItem("last_product_update_request", JSON.stringify(requestDataToSave, null, 2));
        console.log("[LOCALSTORAGE] Request data saved to localStorage");
        console.log("[LOCALSTORAGE] Key: 'last_product_update_request'");
        console.log("[LOCALSTORAGE] Data preview:", {
          timestamp: requestDataToSave.timestamp,
          productId: requestDataToSave.productId,
          fieldsCount: Object.keys(requestDataToSave.formData).length,
          fields: Object.keys(requestDataToSave.formData)
        });
        console.log("[LOCALSTORAGE] Full data:", JSON.stringify(requestDataToSave, null, 2));
      } catch (error) {
        console.error("[LOCALSTORAGE] Failed to save to localStorage:", error);
      }
      console.log("[LOCALSTORAGE] ==========================================");

      // FETCH dengan FormData (sama seperti addProducts, tapi endpoint berbeda)
      setSubmitStatus("Mengirim data ke server...");

      // Log request untuk network tracking
      console.log("[NETWORK] ========== REQUEST FORMDATA ==========");
      console.log("URL:", `/api/sales/produk/${productId}`);
      console.log("Method:", "POST (with _method=PUT in FormData)");
      console.log("Content-Type:", "multipart/form-data (auto-set by browser)");
      const token = localStorage.getItem("token") || "";
      console.log("Headers:", {
        "Accept": "application/json",
        "Authorization": token ? `Bearer ${token.substring(0, 20)}...` : "MISSING"
      });
      console.log("FormData entries count:", formDataEntries.length);

      // Verify data sebelum kirim
      console.log("[NETWORK] ========== PRE-SEND VERIFICATION ==========");
      const preMethod = formData.get("_method");
      const preKategori = formData.get("kategori");
      const preNama = formData.get("nama");
      const preAssign = formData.get("assign");
      const preHeader = formData.get("header");
      console.log("_method:", preMethod);
      console.log("Kategori:", preKategori);
      console.log("Nama:", preNama);
      console.log("Assign:", preAssign);
      console.log("Header:", preHeader instanceof File ? `File(${preHeader.name}, ${(preHeader.size / 1024).toFixed(2)} KB)` : "NULL");
      console.log("[NETWORK] ===========================================");
      console.log("[NETWORK] ======================================");

      const res = await fetch(`/api/sales/produk/${productId}`, {
        method: "POST", // WAJIB POST untuk FormData, dengan _method=PUT di FormData
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
          // Jangan set Content-Type, browser akan set otomatis dengan boundary untuk FormData
        },
        body: formData
      });

      console.log("[NETWORK] ========== RESPONSE RECEIVED ==========");
      console.log("Response status:", res.status);
      console.log("Response statusText:", res.statusText);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      console.log("[NETWORK] =======================================");

      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error("Non-JSON response: " + text.slice(0, 400));
      }

      if (!res.ok) {
        console.error("[API ERROR] ========== DETAIL ERROR ==========");
        console.error("Status:", res.status);
        console.error("Response:", data);
        console.error("Full error object:", JSON.stringify(data, null, 2));

        // Extract detailed error information
        let errorDetails = "\n\nDetail Error:\n";

        if (data.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0) {
          errorDetails += "Field yang error:\n";
          for (const [field, messages] of Object.entries(data.errors)) {
            const msgArray = Array.isArray(messages) ? messages : [messages];
            errorDetails += `  ${field}: ${msgArray.join(", ")}\n`;
          }
        } else if (data.errorFields && data.errorFields.length > 0) {
          errorDetails += `Field yang error: ${data.errorFields.join(", ")}\n`;
        } else {
          // Parse error dari message jika ada
          const message = data.message || "";
          const fieldMatches = message.match(/(\w+)\s+field\s+is\s+required/gi);
          if (fieldMatches) {
            errorDetails += "Field yang error (dari message):\n";
            fieldMatches.forEach(match => {
              const field = match.match(/(\w+)\s+field/i)?.[1];
              if (field) {
                errorDetails += `  ❌ ${field}: wajib diisi\n`;
              }
            });
          }
        }

        console.error(errorDetails);

        // Log debug info jika ada
        if (data.debug) {
          console.error("[API ERROR] Debug info:", data.debug);
        }

        console.error("[API ERROR] ====================================");

        setSubmitStatus("");
        const errorMessage = data.detailedMessage || data.message || "Gagal memperbarui produk";

        // Tampilkan alert dengan detail
        alert(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Handle success response sesuai format backend
      console.log("[API SUCCESS] ========== RESPONSE DATA ==========");
      console.log("[API SUCCESS] Full response:", JSON.stringify(data, null, 2));
      console.log("[API SUCCESS] Response success:", data.success);
      console.log("[API SUCCESS] Response message:", data.message);
      console.log("[API SUCCESS] Response data:", data.data);
      console.log("[API SUCCESS] ====================================");

      setSubmitStatus("");

      if (data.success) {
        alert(data.message || "Produk berhasil diperbarui!");
        // Refresh data produk untuk memastikan data ter-update
        await fetchProductData(false);
        router.push("/sales/products");
      } else {
        alert("Produk berhasil diperbarui!");
        // Refresh data produk untuk memastikan data ter-update
        await fetchProductData(false);
        router.push("/sales/products");
      }
    } catch (err) {
      console.error("[SUBMIT ERROR]", err);
      setSubmitStatus("");

      // Tampilkan error message yang lebih user-friendly
      let errorMessage = "Terjadi kesalahan saat submit";

      if (err.message) {
        if (err.message.includes("NetworkError") || err.message.includes("Failed to fetch")) {
          errorMessage = "Gagal terhubung ke server. Pastikan koneksi internet stabil dan coba lagi.";
        } else if (err.message.includes("upload")) {
          errorMessage = `Gagal upload file: ${err.message}`;
        } else {
          errorMessage = err.message;
        }
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createdByUser, setCreatedByUser] = useState(null); // User yang membuat produk

  // Function untuk fetch data produk
  const fetchProductData = async (setLoadingState = false) => {
    if (!productId) {
      if (setLoadingState) setLoading(false);
      return;
    }

    try {
      if (setLoadingState) setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch produk berdasarkan ID
      const produkRes = await fetch(
        `/api/sales/produk/${productId}`,
        { headers }
      );
      const produkResponse = await produkRes.json();

      console.log("🔍 [EDIT PRODUCT] Response:", produkResponse);
      console.log("🔍 [EDIT PRODUCT] Response.data:", produkResponse.data);
      console.log("🔍 [EDIT PRODUCT] Is array:", Array.isArray(produkResponse.data));

      if (!produkRes.ok || !produkResponse.success) {
        throw new Error(produkResponse.message || "Gagal memuat data produk");
      }

      // Handle response yang bisa berupa array atau object
      let produkData = null;
      if (Array.isArray(produkResponse.data)) {
        // Jika array, ambil elemen pertama
        produkData = produkResponse.data.length > 0 ? produkResponse.data[0] : null;
      } else if (produkResponse.data && typeof produkResponse.data === "object") {
        // Jika object langsung
        produkData = produkResponse.data;
      } else {
        // Fallback ke produkResponse jika struktur berbeda
        produkData = produkResponse;
      }

      if (!produkData) {
        throw new Error("Data produk tidak ditemukan");
      }

      console.log("✅ [EDIT PRODUCT] Produk data loaded:", produkData);
      console.log("✅ [EDIT PRODUCT] Nama:", produkData.nama);
      console.log("✅ [EDIT PRODUCT] Kategori:", produkData.kategori, produkData.kategori_rel);

      // Helper function untuk parse JSON fields
      const safeParseJSON = (value, fallback = []) => {
        if (!value) return fallback;
        if (Array.isArray(value)) return value;
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      };

      // Fetch kategori untuk mendapatkan kategori_id
      const kategoriRes = await fetch(
        "/api/sales/kategori-produk",
        { headers }
      );
      const kategoriData = await kategoriRes.json();
      const activeCategories = Array.isArray(kategoriData.data)
        ? kategoriData.data.filter((k) => k.status === "1")
        : [];

      // Handle kategori_id
      let kategoriId = null;
      if (produkData.kategori_rel) {
        kategoriId = produkData.kategori_rel.id ? Number(produkData.kategori_rel.id) : null;
      } else if (produkData.kategori_id) {
        kategoriId = Number(produkData.kategori_id);
      } else if (produkData.kategori) {
        kategoriId = Number(produkData.kategori);
      }

      // SELALU generate kode dari nama dengan dash
      const kodeGenerated = generateKode(produkData.nama || "produk-baru");

      console.log("🔧 [LOAD] Nama produk:", produkData.nama);
      console.log("🔧 [LOAD] Kode generated (dengan dash):", kodeGenerated);

      // Parse gambar - handle existing images (type: "url")
      const parsedGambar = safeParseJSON(produkData.gambar, []).map(g => {
        const imagePath = typeof g === "string" ? g : (g.path || g);
        return {
          path: imagePath
            ? { type: "url", value: imagePath }
            : { type: "file", value: null },
          caption: g.caption || ""
        };
      });

      // Parse testimoni - handle existing images (type: "url")
      const parsedTestimoni = safeParseJSON(produkData.testimoni, []).map(t => {
        const imagePath = t.gambar ? (typeof t.gambar === "string" ? t.gambar : (t.gambar.path || t.gambar)) : null;
        return {
          gambar: imagePath
            ? { type: "url", value: imagePath }
            : { type: "file", value: null },
          nama: t.nama || "",
          deskripsi: t.deskripsi || ""
        };
      });

      // Parse custom_field
      const parsedCustomField = safeParseJSON(produkData.custom_field, []).map(f => ({
        label: f.nama_field || f.label || "",
        value: f.value || "",
        required: f.required || false
      }));

      // Parse list_point
      const parsedListPoint = safeParseJSON(produkData.list_point, []).map(p => ({
        nama: p.nama || p
      }));

      // Parse video
      const parsedVideo = produkData.video
        ? (Array.isArray(produkData.video)
          ? produkData.video.join(", ")
          : safeParseJSON(produkData.video, []).join(", "))
        : "";

      // Handle header image - existing image (type: "url")
      const headerImage = produkData.header
        ? (typeof produkData.header === "string"
          ? { type: "url", value: produkData.header }
          : (produkData.header.path
            ? { type: "url", value: produkData.header.path }
            : { type: "file", value: null }))
        : { type: "file", value: null };

      // Parse tanggal_event untuk PrimeReact Calendar
      let parsedTanggalEvent = null;
      if (produkData.tanggal_event) {
        // Backend format: "2025-11-29 13:00:00" atau ISO string
        const dateStr = produkData.tanggal_event.replace(" ", "T");
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          parsedTanggalEvent = date;
        }
      }

      const updatedForm = {
        ...defaultForm, // Start with default form
        // Override with actual data
        nama: produkData.nama || "",
        kode: kodeGenerated,
        url: "/" + kodeGenerated, // Selalu generate URL dari kode (bukan dari database)
        deskripsi: produkData.deskripsi || "",
        harga_coret: produkData.harga_coret || "",
        harga_asli: produkData.harga_asli || "",
        tanggal_event: parsedTanggalEvent,
        status: produkData.status || "1",
        landingpage: produkData.landingpage || "1",
        id: produkData.id || productId,
        kategori: kategoriId,
        assign: produkData.assign_rel
          ? produkData.assign_rel.map((u) => u.id)
          : safeParseJSON(produkData.assign, []).map(a => typeof a === "number" ? a : Number(a)).filter(a => !isNaN(a)),
        user_input: produkData.user_input_rel?.id || produkData.user_input || null,
        custom_field: parsedCustomField,
        list_point: parsedListPoint,
        testimoni: parsedTestimoni,
        fb_pixel: safeParseJSON(produkData.fb_pixel, []).map(v => Number(v)).filter(n => !Number.isNaN(n)),
        // event_fb_pixel dari backend: [{event: "value"}] → convert ke ["value"]
        event_fb_pixel: safeParseJSON(produkData.event_fb_pixel, []).map(e =>
          typeof e === "string" ? e : (e.event || e)
        ),
        gtm: safeParseJSON(produkData.gtm, []),
        gambar: parsedGambar,
        header: headerImage,
        video: parsedVideo,
        jadwal: safeParseJSON(produkData.jadwal_rel || produkData.jadwal, []).map(j => ({
          ...j,
          waktu_mulai: j.waktu_mulai ? new Date(j.waktu_mulai.replace(" ", "T")) : null,
          waktu_selesai: j.waktu_selesai ? new Date(j.waktu_selesai.replace(" ", "T")) : null,
        })),
      };

      console.log("🔧 [EDIT] Setting form with data:", updatedForm);
      setForm(updatedForm);

      // Set user yang membuat produk (created by)
      if (produkData.user_input_rel) {
        setCreatedByUser(produkData.user_input_rel);
      }

      // ============================
      // SIMPAN DATA PRODUK ASLI KE LOCALSTORAGE
      // Digunakan sebagai fallback saat build FormData untuk memastikan semua field dikirim
      // ============================
      const originalProductData = {
        id: produkData.id || productId,
        kategori: kategoriId,
        nama: produkData.nama || "",
        kode: produkData.kode || kodeGenerated,
        url: produkData.url || "/" + kodeGenerated,
        deskripsi: produkData.deskripsi || "",
        harga_asli: produkData.harga_asli || "",
        harga_coret: produkData.harga_coret || "",
        tanggal_event: produkData.tanggal_event || "",
        landingpage: produkData.landingpage || "1",
        status: produkData.status || "1",
        header: produkData.header || "",
        gambar: safeParseJSON(produkData.gambar, []),
        testimoni: safeParseJSON(produkData.testimoni, []),
        custom_field: safeParseJSON(produkData.custom_field, []),
        list_point: safeParseJSON(produkData.list_point, []),
        assign: produkData.assign_rel
          ? produkData.assign_rel.map((u) => u.id)
          : safeParseJSON(produkData.assign, []).map(a => typeof a === "number" ? a : Number(a)).filter(a => !isNaN(a)),
        fb_pixel: safeParseJSON(produkData.fb_pixel, []),
        event_fb_pixel: safeParseJSON(produkData.event_fb_pixel, []),
        gtm: safeParseJSON(produkData.gtm, []),
        video: produkData.video
          ? (Array.isArray(produkData.video)
            ? produkData.video
            : safeParseJSON(produkData.video, []))
          : [],
      };

      // Simpan ke localStorage
      try {
        localStorage.setItem(`product_original_data_${productId}`, JSON.stringify(originalProductData));
        console.log("[LOCALSTORAGE] ✅ Original product data saved:", {
          productId: productId,
          key: `product_original_data_${productId}`,
          fields: Object.keys(originalProductData)
        });
      } catch (error) {
        console.error("[LOCALSTORAGE] ❌ Failed to save original product data:", error);
      }

      console.log("✅ [EDIT] Product data loaded:", {
        nama: produkData.nama,
        kode_from_backend: produkData.kode,
        kode_generated: kodeGenerated,
        kategori: kategoriId,
        tanggal_event: parsedTanggalEvent,
        list_point: parsedListPoint,
        testimoni: parsedTestimoni.length,
        gambar: parsedGambar.length,
        created_by: produkData.user_input_rel,
      });

      console.log("✅ [EDIT] Form state after setForm:", {
        nama: form.nama,
        kategori: form.kategori,
        harga_asli: form.harga_asli,
        harga_coret: form.harga_coret,
      });

      // 4️⃣ Fetch Meta Pixel list
      try {
        setIsLoadingMetaPixel(true);
        const pixelRes = await fetch("/api/sales/pixel-meta", {
          headers: {
            ...headers,
            Accept: "application/json",
          },
        });
        const pixelJson = await pixelRes.json();

        if (!pixelRes.ok || pixelJson.success === false) {
          console.error("[META PIXEL] Gagal memuat data:", pixelJson);
        } else {
          const pixels = Array.isArray(pixelJson.data) ? pixelJson.data : [];
          const pixelOpts = pixels.map((p) => ({
            label: `${p.id} - ${p.pixel}`,
            value: Number(p.id),
          }));
          setMetaPixelOptions(pixelOpts);
          console.log("📋 Meta Pixel Options (EDIT):", pixelOpts);
        }
      } catch (error) {
        console.error("[META PIXEL] Error fetch pixel-meta:", error);
      } finally {
        setIsLoadingMetaPixel(false);
      }
    } catch (err) {
      console.error("❌ [EDIT PRODUCT] Fetch product data error:", err);
      console.error("❌ [EDIT PRODUCT] Error details:", {
        message: err.message,
        stack: err.stack,
        productId: productId
      });
      if (setLoadingState) {
        alert(`Gagal memuat data produk: ${err.message || "Unknown error"}`);
      }
    } finally {
      if (setLoadingState) setLoading(false);
    }
  };

  // Tambah Meta Pixel baru via API backend
  const handleCreateMetaPixel = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token tidak ditemukan, silakan login ulang.");
      return;
    }

    const pixel = window.prompt("Masukkan ID Meta Pixel (Facebook Pixel ID) baru:");
    if (!pixel || !pixel.trim()) return;

    try {
      setIsCreatingMetaPixel(true);
      const res = await fetch("/api/sales/pixel-meta", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pixel: pixel.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        console.error("[META PIXEL] Gagal membuat pixel:", data);
        alert(data.message || "Gagal membuat Meta Pixel baru");
        return;
      }

      const created = data.data;
      const newOption = {
        label: `${created.id} - ${created.pixel}`,
        value: Number(created.id),
      };
      setMetaPixelOptions((prev) => [...prev, newOption]);

      // Auto-select pixel baru di form
      const currentPixels = Array.isArray(form.fb_pixel) ? form.fb_pixel : [];
      handleChange("fb_pixel", [
        ...currentPixels.map((v) => Number(v)).filter((n) => !Number.isNaN(n)),
        Number(created.id),
      ]);

      alert("Meta Pixel berhasil dibuat dan ditambahkan ke produk.");
    } catch (error) {
      console.error("[META PIXEL] Error create pixel:", error);
      alert("Terjadi kesalahan saat membuat Meta Pixel baru");
    } finally {
      setIsCreatingMetaPixel(false);
    }
  };

  useEffect(() => {
    async function fetchInitialData() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // 1️⃣ Fetch kategori dan filter hanya yang aktif (status === "1")
        const kategoriRes = await fetch(
          "/api/sales/kategori-produk",
          { headers }
        );
        const kategoriData = await kategoriRes.json();

        // Logging struktur JSON lengkap
        console.log("Success:", kategoriData.success);
        console.log("Data:", kategoriData.data);
        console.table(kategoriData.data);

        // Filter hanya kategori yang aktif (status === "1")
        const activeCategories = Array.isArray(kategoriData.data)
          ? kategoriData.data.filter((k) => k.status === "1")
          : [];

        // Create options with ID as value and name as label
        const kategoriOpts = activeCategories.map((k) => ({
          label: `${k.id} - ${k.nama}`,
          value: k.id
        }));
        setKategoriOptions(kategoriOpts);

        // 2️⃣ Fetch produk berdasarkan ID - menggunakan fetchProductData
        await fetchProductData(true);

        // 3️⃣ Fetch users - filter hanya status 1
        const usersRes = await fetch(
          "/api/sales/users",
          { headers }
        );
        const usersJson = await usersRes.json();

        // Logging struktur JSON lengkap
        console.log("Success:", usersJson.success);
        console.log("Data:", usersJson.data);
        console.table(usersJson.data);

        const userOpts = Array.isArray(usersJson.data)
          ? usersJson.data
            .filter((u) => u.status === "1" || u.status === 1)
            .map((u) => ({ label: u.nama || u.name, value: u.id }))
          : [];
        setUserOptions(userOpts);
      } catch (err) {
        console.error("Fetch initial data error:", err);
        alert("Gagal memuat data produk!");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [productId, refreshKey]);

  // ============================
  // UI
  // ============================
  if (loading) {
    return (
      <div className="produk-container produk-builder-layout" style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="produk-container produk-builder-layout">
      <div className="produk-form" style={{ position: "relative" }}>
        {isSubmitting && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.95)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div className="spinner" style={{ width: "48px", height: "48px", border: "4px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#1f2937", fontWeight: 600, fontSize: "16px", marginBottom: "8px" }}>
                {submitStatus || "Menyimpan produk, mohon tunggu..."}
              </p>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                Proses ini mungkin memakan waktu beberapa saat
              </p>
            </div>
          </div>
        )}
        {/* Header Section */}
        <div className="form-header-section">
          <button
            className="back-to-products-btn"
            onClick={() => router.push("/sales/products")}
            aria-label="Back to products list"
          >
            <ArrowLeft size={18} />
            <span>Back to Products</span>
          </button>
          <div className="form-title-wrapper">
            <h2 className="form-title">Edit Produk</h2>
            <p className="form-subtitle">Ubah informasi produk di bawah ini</p>
          </div>
        </div>

        {/* SECTION 1: Informasi Dasar */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Informasi Dasar</h3>
            <p className="section-description">Data utama produk yang akan ditampilkan</p>
          </div>
          <div className="section-content">
            {/* NAMA PRODUK */}
            <div className="form-field-group">
              <label className="form-label">
                Nama Produk <span className="required">*</span>
              </label>
              <InputText
                className="w-full form-input"
                value={form.nama}
                placeholder="Masukkan nama produk"
                onChange={(e) => {
                  const nama = e.target.value;
                  // SELALU generate kode dari nama dengan dash
                  const kode = generateKode(nama);
                  setForm({
                    ...form,
                    nama,
                    kode: kode,
                    url: "/" + kode
                  });
                }}
              />
            </div>

            {/* KATEGORI */}
            <div className="form-field-group">
              <label className="form-label">
                Kategori <span className="required">*</span>
              </label>
              <Dropdown
                className="w-full form-input"
                value={form.kategori || null}
                options={kategoriOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => {
                  const selectedValue = e.value;
                  console.log("[KATEGORI] Dropdown onChange:", {
                    selectedValue: selectedValue,
                    type: typeof selectedValue,
                    isNull: selectedValue === null,
                    isUndefined: selectedValue === undefined,
                    isEmpty: selectedValue === ""
                  });
                  // Ensure value is set as string ID (PrimeReact returns value directly from optionValue)
                  const finalValue = selectedValue !== null && selectedValue !== undefined && selectedValue !== ""
                    ? String(selectedValue)
                    : null;
                  console.log("[KATEGORI] Setting kategori to:", finalValue);
                  handleChange("kategori", finalValue);
                }}
                placeholder="Pilih Kategori"
                showClear
                filter
                filterPlaceholder="Cari kategori..."
              />
              {!form.kategori && (
                <small className="field-hint" style={{ color: "#ef4444" }}>
                  Kategori wajib dipilih
                </small>
              )}
            </div>

            {/* KODE & URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field-group">
                <label className="form-label">
                  Kode Produk
                </label>
                <InputText
                  className="w-full form-input"
                  value={form.kode || generateKode(form.nama) || ""}
                  onChange={(e) => {
                    const kode = e.target.value;
                    setForm({
                      ...form,
                      kode,
                      url: "/" + (kode || "produk-baru"),
                    });
                  }}
                  placeholder="Kode otomatis dari nama (contoh: webinar-ternak-properti)"
                  title="Kode akan otomatis di-generate dari nama produk dengan format dash"
                />
              </div>
              <div className="form-field-group">
                <label className="form-label">
                  URL
                </label>
                <InputText
                  className="w-full form-input"
                  value={form.url || ""}
                  onChange={(e) => handleChange("url", e.target.value)}
                  placeholder="/kode-produk"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Media & Konten */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Media & Konten</h3>
            <p className="section-description">Gambar, deskripsi, dan konten produk</p>
          </div>
          <div className="section-content">
            {/* HEADER IMAGE */}
            <div className="form-field-group">
              <label className="form-label">
                Header Image
              </label>
              <div className="file-upload-card">
                {form.header?.type === "url" && form.header.value && (
                  <div className="file-preview">
                    <img
                      src={buildImageUrl(form.header.value)}
                      alt="Current header"
                      className="preview-thumbnail"
                    />
                    <p className="field-hint">Gambar saat ini</p>
                  </div>
                )}
                <label className="file-upload-label">Upload File Baru</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleChange("header", { type: "file", value: e.target.files[0] })}
                  className="file-input"
                />
                {form.header?.type === "file" && form.header.value && (
                  <div className="file-preview">
                    <img
                      src={URL.createObjectURL(form.header.value)}
                      alt="Preview"
                      className="preview-thumbnail"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* DESKRIPSI */}
            <div className="form-field-group">
              <label className="form-label">
                Deskripsi Produk
              </label>
              <InputTextarea
                className="w-full form-input"
                rows={5}
                value={form.deskripsi}
                placeholder="Masukkan deskripsi lengkap produk"
                onChange={(e) => handleChange("deskripsi", e.target.value)}
              />
            </div>

            {/* HARGA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field-group">
                <label className="form-label">
                  Harga Coret
                </label>
                <InputNumber
                  className="w-full form-input"
                  value={Number(form.harga_coret)}
                  onValueChange={(e) => handleChange("harga_coret", e.value)}
                  placeholder="Harga sebelum diskon"
                  mode="currency"
                  currency="IDR"
                  locale="id-ID"
                />
              </div>
              <div className="form-field-group">
                <label className="form-label">
                  Harga Asli <span className="required">*</span>
                </label>
                <InputNumber
                  className="w-full form-input"
                  value={Number(form.harga_asli)}
                  onValueChange={(e) => handleChange("harga_asli", e.value)}
                  placeholder="Harga setelah diskon"
                  mode="currency"
                  currency="IDR"
                  locale="id-ID"
                />
              </div>
            </div>

            {/* JADWAL / TANGGAL EVENT (MULTIPLE) */}
            <div className="form-field-group" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <span className="label-icon">📅</span>
                  Jadwal / Tanggal Event
                </label>
                <Button
                  type="button"
                  icon="pi pi-plus"
                  label="Tambah Jadwal"
                  className="p-button-outlined p-button-sm"
                  onClick={() => addArray("jadwal", { nama_jadwal: "", waktu_mulai: null, waktu_selesai: null, kuota: null, status: "A" })}
                />
              </div>
              <p className="section-description" style={{ marginBottom: "1rem" }}>
                Kelola beberapa pilihan jadwal untuk produk ini (untuk Follow-up & Upselling)
              </p>

              <div className="jadwal-list-container">
                {form.jadwal && form.jadwal.map((j, i) => (
                  <div key={i} className="gallery-item-card" style={{ marginBottom: "1rem", border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "8px" }}>
                    <div className="gallery-item-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <span className="gallery-item-number" style={{ fontWeight: 600 }}>Jadwal {i + 1}</span>
                      <Button
                        type="button"
                        icon="pi pi-trash"
                        severity="danger"
                        className="p-button-danger p-button-sm"
                        onClick={() => removeArray("jadwal", i)}
                      />
                    </div>
                    <div className="gallery-item-content">
                      <div className="form-field-group">
                        <label className="form-label-small">Nama Jadwal <span className="required">*</span></label>
                        <InputText
                          className="w-full form-input"
                          value={j.nama_jadwal}
                          onChange={(e) => updateArrayItem("jadwal", i, "nama_jadwal", e.target.value)}
                          placeholder="Contoh: Batch 1, Sesi Pagi, dll"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-field-group">
                          <label className="form-label-small">Waktu Mulai <span className="required">*</span></label>
                          <Calendar
                            className="w-full form-input"
                            value={j.waktu_mulai}
                            showTime
                            hourFormat="24"
                            onChange={(e) => updateArrayItem("jadwal", i, "waktu_mulai", e.value)}
                            placeholder="Pilih waktu mulai"
                          />
                        </div>
                        <div className="form-field-group">
                          <label className="form-label-small">Waktu Selesai</label>
                          <Calendar
                            className="w-full form-input"
                            value={j.waktu_selesai}
                            showTime
                            hourFormat="24"
                            onChange={(e) => updateArrayItem("jadwal", i, "waktu_selesai", e.value)}
                            placeholder="Pilih waktu selesai"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-field-group">
                          <label className="form-label-small">Kuota</label>
                          <InputNumber
                            className="w-full form-input"
                            value={j.kuota}
                            onValueChange={(e) => updateArrayItem("jadwal", i, "kuota", e.value)}
                            placeholder="Tanpa batas"
                          />
                        </div>
                        <div className="form-field-group">
                          <label className="form-label-small">Status</label>
                          <Dropdown
                            className="w-full form-input"
                            value={j.status}
                            options={[
                              { label: "Aktif", value: "A" },
                              { label: "Non-Aktif", value: "N" }
                            ]}
                            onChange={(e) => updateArrayItem("jadwal", i, "status", e.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LANDING PAGE TYPE */}
            <div className="form-field-group">
              <label className="form-label">
                <span className="label-icon">📄</span>
                Tipe Landing Page <span className="required">*</span>
              </label>
              <Dropdown
                className="w-full form-input"
                value={form.landingpage}
                onChange={(e) => handleChange("landingpage", e.value)}
                options={[
                  { label: "Non-Fisik (Seminar, Webinar, dll)", value: "1" },
                  { label: "Fisik (Buku, Baju, dll)", value: "2" }
                ]}
                optionLabel="label"
                optionValue="value"
                placeholder="Pilih tipe landing page"
              />
              <p className="text-sm text-gray-500 mt-1">
                Non-Fisik: tanpa ongkir | Fisik: dengan form cek ongkir
              </p>
            </div>
          </div>
        </div>



        {/* SECTION 3: Gallery */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Gallery Produk</h3>
            <p className="section-description">Tambah gambar produk dengan caption</p>
          </div>
          <div className="section-content">
            {form.gambar.map((g, i) => (
              <div key={i} className="gallery-item-card">
                <div className="gallery-item-header">
                  <span className="gallery-item-number">Gambar {i + 1}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* Tombol hapus dari server (jika gambar sudah ada di server) */}
                    {g.path?.type === "url" && g.path.value && (
                      <Button
                        icon="pi pi-server"
                        severity="danger"
                        className="p-button-danger p-button-sm"
                        onClick={() => deleteGalleryImage(i)}
                        tooltip="Hapus dari server"
                        tooltipOptions={{ position: "top" }}
                      />
                    )}
                    {/* Tombol hapus dari form (lokal) */}
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      className="p-button-danger p-button-sm"
                      onClick={() => removeArray("gambar", i)}
                      tooltip="Hapus gambar"
                    />
                  </div>
                </div>
                <div className="gallery-item-content">
                  <div className="form-field-group">
                    <label className="form-label-small">Upload Gambar</label>
                    {g.path?.type === "url" && g.path.value && (
                      <div className="file-preview">
                        <img
                          src={buildImageUrl(g.path.value)}
                          alt={`Current ${i + 1}`}
                          className="preview-thumbnail"
                        />
                        <p className="field-hint">Gambar saat ini</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateArrayItem("gambar", i, "path", { type: "file", value: e.target.files[0] })
                      }
                      className="file-input"
                    />
                    {g.path?.type === "file" && g.path.value && (
                      <div className="file-preview">
                        <img
                          src={URL.createObjectURL(g.path.value)}
                          alt={`Preview ${i + 1}`}
                          className="preview-thumbnail"
                        />
                      </div>
                    )}
                  </div>
                  <div className="form-field-group">
                    <label className="form-label-small">Caption</label>
                    <InputText
                      className="w-full form-input"
                      placeholder="Masukkan caption gambar"
                      value={g.caption}
                      onChange={(e) => updateArrayItem("gambar", i, "caption", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              icon="pi pi-plus"
              label="Tambah Gambar"
              className="add-item-btn"
              onClick={() => addArray("gambar", { path: { type: "file", value: null }, caption: "" })}
            />
          </div>
        </div>

        {/* SECTION 4: Testimoni */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Testimoni</h3>
            <p className="section-description">Tambah testimoni dari pembeli</p>
          </div>
          <div className="section-content">
            {form.testimoni.map((t, i) => (
              <div key={i} className="testimoni-item-card">
                <div className="testimoni-item-header">
                  <span className="testimoni-item-number">Testimoni {i + 1}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* Tombol hapus dari server (jika testimoni sudah ada di server) */}
                    {t.gambar?.type === "url" && t.gambar.value && (
                      <Button
                        icon="pi pi-server"
                        severity="danger"
                        className="p-button-danger p-button-sm"
                        onClick={() => deleteTestimoni(i)}
                        tooltip="Hapus dari server"
                        tooltipOptions={{ position: "top" }}
                      />
                    )}
                    {/* Tombol hapus dari form (lokal) */}
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      className="p-button-danger p-button-sm"
                      onClick={() => removeArray("testimoni", i)}
                      tooltip="Hapus testimoni"
                    />
                  </div>
                </div>
                <div className="testimoni-item-content">
                  <div className="form-field-group">
                    <label className="form-label-small">Upload Foto</label>
                    {t.gambar?.type === "url" && t.gambar.value && (
                      <div className="file-preview">
                        <img
                          src={buildImageUrl(t.gambar.value)}
                          alt={`Current Testimoni ${i + 1}`}
                          className="preview-thumbnail"
                        />
                        <p className="field-hint">Foto saat ini</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateArrayItem("testimoni", i, "gambar", { type: "file", value: e.target.files[0] })
                      }
                      className="file-input"
                    />
                    {t.gambar?.type === "file" && t.gambar.value && (
                      <div className="file-preview">
                        <img
                          src={URL.createObjectURL(t.gambar.value)}
                          alt={`Testimoni ${i + 1}`}
                          className="preview-thumbnail"
                        />
                      </div>
                    )}
                  </div>
                  <div className="form-field-group">
                    <label className="form-label-small">Nama</label>
                    <InputText
                      className="w-full form-input"
                      placeholder="Masukkan nama testimoni"
                      value={t.nama}
                      onChange={(e) => updateArrayItem("testimoni", i, "nama", e.target.value)}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-label-small">Deskripsi</label>
                    <InputTextarea
                      className="w-full form-input"
                      rows={3}
                      placeholder="Masukkan deskripsi testimoni"
                      value={t.deskripsi}
                      onChange={(e) => updateArrayItem("testimoni", i, "deskripsi", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              icon="pi pi-plus"
              label="Tambah Testimoni"
              className="add-item-btn"
              onClick={() =>
                addArray("testimoni", { gambar: { type: "file", value: null }, nama: "", deskripsi: "" })
              }
            />
          </div>
        </div>

        {/* SECTION 5: Konten Tambahan */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Konten Tambahan</h3>
            <p className="section-description">Video, list point, dan konten pendukung</p>
          </div>
          <div className="section-content">
            {/* VIDEO */}
            <div className="form-field-group">
              <label className="form-label">
                Video (URL, pisahkan dengan koma)
              </label>
              <InputTextarea
                className="w-full form-input"
                rows={3}
                value={form.video}
                placeholder="https://youtube.com/watch?v=..., https://youtube.com/watch?v=..."
                onChange={(e) => handleChange("video", e.target.value)}
              />
              <p className="field-hint">Masukkan URL video YouTube, pisahkan dengan koma jika lebih dari satu</p>
            </div>

            {/* LIST POINT */}
            <div className="form-field-group">
              <label className="form-label">
                List Point (Benefit)
              </label>
              {form.list_point.map((p, i) => (
                <div key={i} className="list-point-item">
                  <div className="list-point-number">{i + 1}</div>
                  <InputText
                    className="flex-1 form-input"
                    value={p.nama}
                    placeholder={`Point ${i + 1}`}
                    onChange={(e) => updateArrayItem("list_point", i, "nama", e.target.value)}
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    className="p-button-danger p-button-sm"
                    onClick={() => removeArray("list_point", i)}
                  />
                </div>
              ))}
              <Button
                icon="pi pi-plus"
                label="Tambah List Point"
                className="add-item-btn"
                onClick={() => addArray("list_point", { nama: "" })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Form Fields - Compact Style */}
        <section className="compact-form-section-preview" aria-label="Order form">
          <h2 className="compact-form-title-preview">Lengkapi Data:</h2>

          <div className="compact-form-card-preview">
            {/* Nama Lengkap */}
            <div className="compact-field-preview">
              <label className="compact-label-preview">
                Nama Lengkap <span className="required-preview">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Krisdayanti"
                className="compact-input-preview"
                disabled
              />
            </div>

            {/* No. WhatsApp */}
            <div className="compact-field-preview">
              <label className="compact-label-preview">
                No. WhatsApp <span className="required-preview">*</span>
              </label>
              <div className="wa-input-wrapper-preview">
                <div className="wa-prefix-preview">
                  <span className="flag">🇮🇩</span>
                  <span className="code">+62</span>
                </div>
                <input
                  type="tel"
                  placeholder="812345678"
                  className="compact-input-preview wa-input-preview"
                  disabled
                />
              </div>
            </div>

            {/* Email */}
            <div className="compact-field-preview">
              <label className="compact-label-preview">
                Email <span className="required-preview">*</span>
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="compact-input-preview"
                disabled
              />
            </div>

            {/* Alamat */}
            <div className="compact-field-preview">
              <label className="compact-label-preview">Alamat</label>
              <textarea
                placeholder="Alamat lengkap (opsional)"
                className="compact-input-preview compact-textarea-preview"
                rows={2}
                disabled
              />
            </div>
          </div>
        </section>

        {/* SECTION 7: Custom Fields */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Custom Fields</h3>
            <p className="section-description">Tambah field tambahan untuk form pembeli</p>
          </div>
          <div className="section-content">
            {form.custom_field.map((f, i) => (
              <div key={i} className="custom-field-item-card">
                <div className="custom-field-header">
                  <span className="custom-field-number">Field {i + 1}</span>
                  {!f.required && (
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      className="p-button-danger p-button-sm"
                      onClick={() => removeArray("custom_field", i)}
                    />
                  )}
                </div>
                <div className="custom-field-content">
                  <div className="form-field-group">
                    <label className="form-label-small">Nama Field</label>
                    <InputText
                      className="w-full form-input"
                      value={f.label}
                      placeholder="Contoh: Nomor HP, Instansi, dll"
                      onChange={(e) => updateArrayItem("custom_field", i, "label", e.target.value)}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-label-small">Placeholder / Contoh</label>
                    <InputText
                      className="w-full form-input"
                      value={f.value}
                      placeholder={(f.label || "Contoh isian") + (f.required ? " *" : "")}
                      onChange={(e) => updateArrayItem("custom_field", i, "value", e.target.value)}
                    />
                  </div>
                  <div className="custom-field-required">
                    <input
                      type="checkbox"
                      id={`required-${i}`}
                      checked={f.required}
                      onChange={(e) => updateArrayItem("custom_field", i, "required", e.target.checked)}
                    />
                    <label htmlFor={`required-${i}`} className="checkbox-label">
                      Field wajib diisi
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <Button
              icon="pi pi-plus"
              label="Tambah Custom Field"
              className="add-item-btn"
              onClick={() => addArray("custom_field", { key: "", label: "", value: "", required: false })}
            />
          </div>
        </div>

        {/* SECTION 8: Pengaturan */}
        <div className="form-section-card">
          <div className="section-header">
            <h3 className="section-title">Pengaturan</h3>
            <p className="section-description">Assign user, landing page, dan status produk</p>
          </div>
          <div className="section-content">
            {/* META PIXEL */}
            <div className="form-field-group">
              <label className="form-label">
                Meta Pixel (Facebook Pixel ID)
              </label>
              <MultiSelect
                className="w-full form-input"
                value={
                  Array.isArray(form.fb_pixel)
                    ? form.fb_pixel.filter(Boolean)
                    : []
                }
                options={metaPixelOptions}
                onChange={(e) =>
                  handleChange(
                    "fb_pixel",
                    e.value || []
                  )
                }
                placeholder={
                  isLoadingMetaPixel
                    ? "Memuat daftar Meta Pixel..."
                    : "Pilih Meta Pixel untuk produk ini"
                }
                display="chip"
                showClear
                filter
                filterPlaceholder="Cari Meta Pixel..."
                optionLabel="label"
                optionValue="value"
              />
            </div>

            {/* ASSIGN BY - Penanggung Jawab (read-only untuk staff sales) */}
            <div className="form-field-group">
              <label className="form-label">
                Penanggung Jawab (Assign By)
              </label>
              <MultiSelect
                className="w-full form-input"
                value={form.assign}
                options={userOptions}
                onChange={() => {}}
                disabled
                placeholder="Belum ada penanggung jawab"
                display="chip"
                filter
                filterPlaceholder="Cari user..."
              />
              <p className="field-hint">Penanggung jawab produk tidak bisa diubah dari sini - hubungi leader/admin kalau perlu diganti.</p>
            </div>

            {/* LANDING PAGE */}
            <div className="form-field-group">
              <label className="form-label">
                Landing Page
              </label>
              <InputText
                className="w-full form-input"
                value={form.landingpage || "1"}
                onChange={(e) => handleChange("landingpage", e.target.value)}
                placeholder="Masukkan nama landing page atau kode"
              />
              <p className="field-hint">Default: 1</p>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="submit-section">
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <Button
              label="Update Produk"
              icon="pi pi-save"
              className="p-button-primary submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
            />
            <Button
              label="Hapus Produk"
              icon="pi pi-trash"
              className="p-button-danger"
              onClick={deleteProduct}
              disabled={isSubmitting}
            />
          </div>
          <p className="submit-hint">
            {isSubmitting
              ? (submitStatus || "Sedang mengunggah data ke server...")
              : "Pastikan semua data sudah lengkap sebelum menyimpan"}
          </p>
        </div>
      </div>
      {/* ================= RIGHT: PREVIEW ================= */}
      <div className="builder-preview-card">
        <LandingTemplate form={form} />
      </div>
    </div>
  );
}
