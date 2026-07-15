"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import DragDropUpload from "./components/DragDropUpload";
import DragDropGallery from "./components/DragDropGallery";
import PageBuilder from "./components/PageBuilder";
import LandingPageStudio from "./components/LandingPageStudio";
import "@/styles/sales/add-products.css";
import "@/styles/sales/page-builder.css";
import "@/styles/sales/landing-page-studio.css";

export default function Page() {
  const router = useRouter();

  // ============================
  // SLUGIFY - Generate kode dari nama dengan dash
  // Contoh: "webinar ternak properti" -> "webinar-ternak-properti"
  // ============================
  const generateKode = (text) => {
    if (!text) return "";

    return text
      .toLowerCase()
      .trim()
      // Hapus karakter khusus, hanya simpan huruf, angka, spasi, dan dash
      .replace(/[^a-z0-9\s-]/g, "")
      // Ganti multiple spaces dengan single space
      .replace(/\s+/g, " ")
      // Ganti spasi dengan dash
      .replace(/\s/g, "-")
      // Hapus multiple dash menjadi single dash
      .replace(/-+/g, "-")
      // Hapus dash di awal dan akhir
      .replace(/^-+|-+$/g, "");
  };





  // form state
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
    kategori: null, // Changed from "" to null to fix validation
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
    custom_field: [],   // <--- kosong di awal
    list_point: [],
    testimoni: [],
    fb_pixel: [],
    event_fb_pixel: [],
    gtm: [],
    video: "",
    page_blocks: [], // Blocks untuk visual page builder
    jadwal: [], // [{ nama_jadwal, waktu_mulai, waktu_selesai, kuota, status }]
  };


  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");

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
  // COMPRESS IMAGE BEFORE BASE64
  // Optimasi: Kompres gambar sebelum konversi untuk mengurangi ukuran
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
  // Sesuai dokumentasi Postman: multipart/form-data dengan file langsung
  // Array fields sebagai JSON string
  // ============================
  async function buildProductFormData(form, kategoriId, normalizedAssign, onProgress = null) {
    // SELALU generate kode dari nama (auto generate dengan dash)
    const kode = generateKode(form.nama) || "produk-baru";

    const formData = new FormData();

    // ============================
    // 1. BASIC FIELDS
    // ============================
    formData.append("kategori", String(kategoriId));
    formData.append("nama", form.nama || "");
    formData.append("kode", kode);
    formData.append("url", "/" + kode);
    formData.append("deskripsi", form.deskripsi || "");
    formData.append("harga_asli", String(form.harga_asli || 0));
    formData.append("harga_coret", String(form.harga_coret || 0));
    formData.append("tanggal_event", formatDateForBackend(form.tanggal_event) || "");
    formData.append("landingpage", String(form.landingpage || 1));
    formData.append("status", String(form.status || 1));

    console.log("[FORMDATA] Basic fields:", {
      kategori: kategoriId,
      nama: form.nama,
      kode: kode,
      url: "/" + kode
    });

    // ============================
    // 2. HEADER IMAGE (REQUIRED) - File langsung
    // ============================
    if (form.header?.type === "file" && form.header.value) {
      if (onProgress) {
        onProgress("Mengompresi header image...");
      }
      const compressedHeader = await compressImage(form.header.value);
      formData.append("header", compressedHeader);
    } else {
      throw new Error("Header image wajib diisi");
    }

    // ============================
    // 3. GAMBAR GALLERY - File langsung
    // Format: gambar[0][file], gambar[0][caption], gambar[1][file], gambar[1][caption]
    // ============================
    const gambarFiles = (form.gambar || []).filter(g => g.path && g.path.type === "file" && g.path.value);
    if (onProgress && gambarFiles.length > 0) {
      onProgress(`Mengompresi ${gambarFiles.length} gambar...`);
    }

    for (let i = 0; i < (form.gambar || []).length; i++) {
      const g = form.gambar[i];
      if (g.path && g.path.type === "file" && g.path.value) {
        if (onProgress) {
          onProgress(`Mengompresi gambar ${i + 1}/${gambarFiles.length}...`);
        }
        const compressedGambar = await compressImage(g.path.value);
        formData.append(`gambar[${i}][file]`, compressedGambar);
        formData.append(`gambar[${i}][caption]`, g.caption || "");
      }
    }

    // ============================
    // 4. TESTIMONI - File langsung
    // Format: testimoni[0][gambar], testimoni[0][nama], testimoni[0][deskripsi]
    // ============================
    const testimoniFiles = (form.testimoni || []).filter(t => t.gambar && t.gambar.type === "file" && t.gambar.value);
    if (onProgress && testimoniFiles.length > 0) {
      onProgress(`Mengompresi ${testimoniFiles.length} testimoni...`);
    }

    for (let i = 0; i < (form.testimoni || []).length; i++) {
      const t = form.testimoni[i];
      if (t.gambar && t.gambar.type === "file" && t.gambar.value) {
        if (onProgress) {
          onProgress(`Mengompresi testimoni ${i + 1}/${testimoniFiles.length}...`);
        }
        const compressedTestimoni = await compressImage(t.gambar.value);
        formData.append(`testimoni[${i}][gambar]`, compressedTestimoni);
      }
      formData.append(`testimoni[${i}][nama]`, t.nama || "");
      formData.append(`testimoni[${i}][deskripsi]`, t.deskripsi || "");
    }

    // ============================
    // 5. ARRAY FIELDS - Sebagai JSON string (sesuai Postman)
    // ============================
    // custom_field - JSON string
    const customFieldArray = (form.custom_field || []).map((f, idx) => ({
      nama_field: f.label || f.key || "",
      urutan: idx + 1,
    }));
    formData.append("custom_field", JSON.stringify(customFieldArray));

    // list_point - JSON string
    const listPointArray = (form.list_point || []).map((p, idx) => ({
      nama: p.nama || "",
      urutan: idx + 1,
    }));
    formData.append("list_point", JSON.stringify(listPointArray));

    // assign - JSON string (array of numbers)
    formData.append("assign", JSON.stringify(normalizedAssign || []));

    // fb_pixel - JSON string (array of numbers)
    const fbPixelArray = (form.fb_pixel || []).map(v => Number(v)).filter(n => !Number.isNaN(n));
    formData.append("fb_pixel", JSON.stringify(fbPixelArray));

    // event_fb_pixel - JSON string
    const eventFbPixelArray = (form.event_fb_pixel || []).map((ev) => ({
      event: ev || ""
    }));
    formData.append("event_fb_pixel", JSON.stringify(eventFbPixelArray));

    // gtm - JSON string (array of numbers)
    const gtmArray = (form.gtm || []).map(v => Number(v)).filter(n => !Number.isNaN(n));
    formData.append("gtm", JSON.stringify(gtmArray));

    // video - JSON string (array of strings)
    const videoArray = form.video
      ? form.video.split(",").map((v) => v.trim()).filter((v) => v)
      : [];
    formData.append("video", JSON.stringify(videoArray));

    // jadwal - JSON string
    const jadwalArray = (form.jadwal || []).map(j => ({
      nama_jadwal: j.nama_jadwal || "",
      waktu_mulai: j.waktu_mulai ? formatDateForBackend(j.waktu_mulai) : null,
      waktu_selesai: j.waktu_selesai ? formatDateForBackend(j.waktu_selesai) : null,
      kuota: j.kuota || null,
      status: j.status || "A"
    }));
    formData.append("jadwal", JSON.stringify(jadwalArray));

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

    return formData;
  }

  // ============================
  // SUBMIT
  // ============================
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1) kategori validation - ambil ID dari kategori yang dipilih
      console.log("[VALIDATION] ========== KATEGORI VALIDATION ==========");
      console.log("form.kategori raw:", form.kategori);
      console.log("form.kategori type:", typeof form.kategori);
      console.log("form.kategori is null:", form.kategori === null);
      console.log("form.kategori is undefined:", form.kategori === undefined);
      console.log("form.kategori is empty string:", form.kategori === "");

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
        isValid: !Number.isNaN(kategoriId) && kategoriId > 0,
        isNull: kategoriId === null,
        isNaN: Number.isNaN(kategoriId),
        isZeroOrNegative: kategoriId <= 0
      });
      console.log("[VALIDATION] ========================================");

      if (!kategoriId || Number.isNaN(kategoriId) || kategoriId <= 0) {
        console.error("[VALIDATION] KATEGORI INVALID!");
        alert("Kategori wajib dipilih!");
        setIsSubmitting(false);
        return;
      }

      console.log("[VALIDATION] Kategori valid:", kategoriId);

      // 3) assign normalization
      const normalizedAssign = Array.isArray(form.assign)
        ? form.assign.map(a => Number(a)).filter(n => !Number.isNaN(n) && n > 0)
        : [];
      if (normalizedAssign.length === 0) {
        alert("Pilih minimal 1 penanggung jawab (assign).");
        setIsSubmitting(false);
        return;
      }

      // Build FormData dengan progress indicator
      setSubmitProgress("Mempersiapkan data...");
      const formData = await buildProductFormData(
        form,
        kategoriId,
        normalizedAssign,
        (message) => setSubmitProgress(message)
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
        }
      });

      // Final check sebelum kirim
      if (!kategoriInFormData || kategoriInFormData === "" || kategoriInFormData === "null" || kategoriInFormData === "undefined") {
        console.error("[FORMDATA] ❌ KATEGORI TIDAK ADA DI FORMDATA!");
        throw new Error("Kategori tidak ditemukan di FormData. Pastikan kategori sudah dipilih.");
      }

      if (!namaInFormData || namaInFormData === "") {
        console.error("[FORMDATA] ❌ NAMA TIDAK ADA DI FORMDATA!");
        throw new Error("Nama produk tidak ditemukan di FormData.");
      }

      if (!headerInFormData || !(headerInFormData instanceof File)) {
        console.error("[FORMDATA] ❌ HEADER TIDAK ADA DI FORMDATA!");
        throw new Error("Header image tidak ditemukan di FormData.");
      }

      console.log("[FORMDATA] All critical fields verified");
      console.log("[FORMDATA] =================================================");

      // ============================
      // SIMPAN REQUEST DATA KE LOCALSTORAGE DULU
      // ============================
      console.log("[LOCALSTORAGE] ========== SAVING REQUEST DATA ==========");
      const requestDataToSave = {
        timestamp: new Date().toISOString(),
        formData: {}
      };

      // Convert FormData ke object untuk disimpan
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          requestDataToSave.formData[key] = {
            type: "File",
            name: value.name,
            size: value.size,
            sizeKB: `${(value.size / 1024).toFixed(2)} KB`,
            mimeType: value.type,
            lastModified: value.lastModified
          };
        } else {
          const strValue = String(value);
          // Try to parse JSON strings
          try {
            const parsed = JSON.parse(strValue);
            requestDataToSave.formData[key] = parsed;
          } catch {
            requestDataToSave.formData[key] = strValue;
          }
        }
      }

      // Simpan ke localStorage
      try {
        localStorage.setItem("last_product_request", JSON.stringify(requestDataToSave, null, 2));
        console.log("[LOCALSTORAGE] Request data saved to localStorage");
        console.log("[LOCALSTORAGE] Key: 'last_product_request'");
        console.log("[LOCALSTORAGE] Data preview:", {
          timestamp: requestDataToSave.timestamp,
          fieldsCount: Object.keys(requestDataToSave.formData).length,
          fields: Object.keys(requestDataToSave.formData)
        });
        console.log("[LOCALSTORAGE] Full data:", JSON.stringify(requestDataToSave, null, 2));
      } catch (error) {
        console.error("[LOCALSTORAGE] Failed to save to localStorage:", error);
      }
      console.log("[LOCALSTORAGE] ==========================================");

      // FETCH dengan FormData (sesuai dokumentasi Postman)
      setSubmitProgress("Mengirim data ke server...");

      // Log request untuk network tracking
      console.log("[NETWORK] ========== REQUEST FORMDATA ==========");
      console.log("URL:", "/api/sales/produk");
      console.log("Method:", "POST");
      console.log("Content-Type:", "multipart/form-data (auto-set by browser)");
      const token = localStorage.getItem("token") || "";
      console.log("Headers:", {
        "Accept": "application/json",
        "Authorization": token ? `Bearer ${token.substring(0, 20)}...` : "MISSING"
      });
      console.log("FormData entries count:", formDataEntries.length);

      // Verify data sebelum kirim
      console.log("[NETWORK] ========== PRE-SEND VERIFICATION ==========");
      const preKategori = formData.get("kategori");
      const preNama = formData.get("nama");
      const preAssign = formData.get("assign");
      const preHeader = formData.get("header");
      console.log("Kategori:", preKategori);
      console.log("Nama:", preNama);
      console.log("Assign:", preAssign);
      console.log("Header:", preHeader instanceof File ? `File(${preHeader.name}, ${(preHeader.size / 1024).toFixed(2)} KB)` : "NULL");
      console.log("[NETWORK] ===========================================");
      console.log("[NETWORK] ======================================");

      const res = await fetch("/api/sales/produk", {
        method: "POST",
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
            errorDetails += `  ❌ ${field}: ${msgArray.join(", ")}\n`;
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

        setSubmitProgress("");
        const errorMessage = data.detailedMessage || data.message || "Gagal membuat produk";

        // Tampilkan alert dengan detail
        alert(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Handle success response sesuai format backend
      console.log("[API SUCCESS]", data);
      setSubmitProgress("");

      if (data.success && data.data) {
        alert(data.message || "Produk berhasil dibuat!");
        router.push("/sales/products");
      } else {
        alert("Produk berhasil dibuat!");
        router.push("/sales/products");
      }
    } catch (err) {
      console.error("[SUBMIT ERROR]", err);
      setSubmitProgress("");

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
      setSubmitProgress("");
    }
  };

  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // User yang sedang login
  // Meta Pixel options dari backend
  const [metaPixelOptions, setMetaPixelOptions] = useState([]);
  const [isLoadingMetaPixel, setIsLoadingMetaPixel] = useState(false);
  const [isCreatingMetaPixel, setIsCreatingMetaPixel] = useState(false);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Ambil data user yang sedang login
        const userSession = localStorage.getItem("user");
        if (userSession) {
          try {
            const userData = JSON.parse(userSession);
            setCurrentUser(userData);
          } catch (e) {
            console.error("Error parsing user session:", e);
          }
        }

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
          value: String(k.id),
        }));
        setKategoriOptions(kategoriOpts);

        // 2️⃣ Fetch produk (misal edit mode)
        const produkRes = await fetch(
          "/api/sales/produk/1",
          { headers }
        );
        const produkData = await produkRes.json();

        // Logging struktur JSON lengkap
        console.log("Success:", produkData.success);
        console.log("Data:", produkData.data);
        console.table(produkData.data);

        // 3️⃣ Fetch users - filter hanya status 1
        // Mengambil data user dengan relasi (user_rel atau sales_rel)
        const usersRes = await fetch(
          "/api/sales/users",
          { headers }
        );
        const usersJson = await usersRes.json();

        // Logging struktur JSON lengkap
        console.log("Success:", usersJson.success);
        console.log("Data:", usersJson.data);
        console.table(usersJson.data);

        // Map users dengan prioritas: user_rel > sales_rel > nama langsung
        const userOpts = Array.isArray(usersJson.data)
          ? usersJson.data
            .filter((u) => u.status === "1" || u.status === 1) // Filter hanya status 1
            .map((u) => {
              // Prioritaskan nama dari relasi jika ada
              const nama = u.user_rel?.nama
                || u.sales_rel?.nama
                || u.user?.nama
                || u.sales?.nama
                || u.nama
                || u.name
                || `User #${u.id}`;

              // Gunakan ID dari relasi jika ada, atau ID langsung
              const userId = u.user_rel?.id
                || u.sales_rel?.id
                || u.user?.id
                || u.sales?.id
                || u.id;

              return {
                label: nama,
                value: Number(userId) // Pastikan value adalah number
              };
            })
          : [];
        setUserOptions(userOpts);

        // Log untuk debugging
        console.log("📋 User Options (Assign By):", userOpts);

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
            console.log("📋 Meta Pixel Options:", pixelOpts);
          }
        } catch (error) {
          console.error("[META PIXEL] Error fetch pixel-meta:", error);
        } finally {
          setIsLoadingMetaPixel(false);
        }

        // ✅ SELALU generate kode dari nama dengan dash
        const kodeGenerated = generateKode(produkData.nama || "produk-baru");

        // Handle kategori_id: if kategori_rel exists, use its ID; otherwise use produkData.kategori_id
        let kategoriId = null;
        if (produkData.kategori_rel) {
          kategoriId = produkData.kategori_rel.id ? Number(produkData.kategori_rel.id) : null;
        } else if (produkData.kategori
        ) {
          kategoriId = Number(produkData.kategori
          );
        } else if (produkData.kategori) {
          // Backward compatibility: if kategori is string (name), try to find ID
          // This should not happen in new implementation, but handle for old data
          const found = activeCategories.find(k => k.nama === produkData.kategori);
          kategoriId = found ? Number(found.id) : null;
        }

        setForm((f) => ({
          ...f,
          // Removed kategori: null to prevent overwriting user selection
          assign: [],
          custom_field: [],
          kode: "",
          url: "/",
          landingpage: "1",
        }));
      } catch (err) {
        console.error("Fetch initial data error:", err);
      }
    }

    fetchInitialData();
  }, []);

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


  // ============================
  // UI
  // ============================
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
                {submitProgress || "Menyimpan produk, mohon tunggu..."}
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
            <h2 className="form-title">Tambah Produk Baru</h2>
            <p className="form-subtitle">Lengkapi informasi produk di bawah ini</p>
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
                  // SELALU auto-generate kode dari nama dengan dash
                  // Contoh: "webinar ternak properti" -> "webinar-ternak-properti"
                  const kode = generateKode(nama) || "";
                  setForm({
                    ...form,
                    nama,
                    kode: kode,
                    url: "/" + (kode || "produk-baru")
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
                  // optionValue adalah String(k.id), jadi sudah string
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
            {/* HEADER IMAGE - Drag & Drop */}
            <div className="form-field-group">
              <label className="form-label">
                Header Image <span className="required">*</span>
              </label>
              <DragDropUpload
                value={form.header}
                onChange={(value) => handleChange("header", value)}
                accept="image/*"
                multiple={false}
                label="Upload Header Image"
                description="Drag and drop gambar header di sini atau klik untuk memilih"
                preview={true}
              />
              {!form.header?.value && (
                <small className="field-hint" style={{ color: "#ef4444", marginTop: "0.5rem", display: "block" }}>
                  Header image wajib diisi
                </small>
              )}
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
                  Harga Asli
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
                  Harga Promo <span className="required">*</span>
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
            <div className="form-field-group" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
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
              <p className="field-hint" style={{ marginBottom: "1rem" }}>
                Kelola beberapa pilihan jadwal untuk produk ini (untuk Follow-up & Upselling)
              </p>

              <div className="jadwal-list-container">
                {form.jadwal && form.jadwal.map((j, i) => (
                  <div key={i} className="gallery-item-card" style={{ marginBottom: "1.5rem", border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "12px", background: "#f8fafc" }}>
                    <div className="gallery-item-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <span className="gallery-item-number" style={{ fontWeight: 600, color: "#1e293b" }}>Jadwal {i + 1}</span>
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

                {(!form.jadwal || form.jadwal.length === 0) && (
                  <div className="empty-state-card" style={{ textAlign: "center", padding: "2.5rem", border: "2px dashed #cbd5e1", borderRadius: "12px", background: "#fff" }}>
                    <p className="text-gray-500">Belum ada jadwal yang ditambahkan. Klik "Tambah Jadwal" untuk memulai.</p>
                  </div>
                )}
              </div>
            </div>

            {/* LANDING PAGE TYPE */}
            <div className="form-field-group">
              <label className="form-label">
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

        {/* SECTION 3: Gallery - Drag & Drop */}
        <div className="form-section-card">
          <DragDropGallery
            items={form.gambar}
            onAdd={(newItem) => addArray("gambar", newItem)}
            onRemove={(index) => removeArray("gambar", index)}
            onUpdate={(index, updatedItem) => {
              const arr = [...form.gambar];
              arr[index] = updatedItem;
              setForm((p) => ({ ...p, gambar: arr }));
            }}
            onReorder={(fromIndex, toIndex) => {
              const arr = [...form.gambar];
              const [removed] = arr.splice(fromIndex, 1);
              arr.splice(toIndex, 0, removed);
              setForm((p) => ({ ...p, gambar: arr }));
            }}
            label="Gallery Produk"
            description="Tambah gambar produk dengan caption. Drag & drop untuk upload, drag item untuk mengubah urutan."
          />
        </div>

        {/* SECTION 5: Testimoni */}
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
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    className="p-button-danger p-button-sm"
                    onClick={() => removeArray("testimoni", i)}
                    tooltip="Hapus testimoni"
                  />
                </div>
                <div className="testimoni-item-content">
                  <div className="form-field-group">
                    <label className="form-label-small">Upload Foto</label>
                    <DragDropUpload
                      value={t.gambar}
                      onChange={(value) => updateArrayItem("testimoni", i, "gambar", value)}
                      accept="image/*"
                      multiple={false}
                      label="Upload Foto Testimoni"
                      description="Drag and drop atau klik untuk memilih"
                      preview={true}
                      className="testimoni-upload"
                    />
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

        {/* SECTION 6: Konten Tambahan */}
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

        {/* SECTION 7: Form Fields - Compact Style */}
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

        {/* SECTION 8: Custom Fields */}
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


        {/* SECTION 9: Landing Page Studio */}
        <div className="form-section-card landing-studio-wrapper">
          <div className="section-header">
            <h3 className="section-title">Landing Page Studio</h3>
            <p className="section-description">Bangun landing page dengan drag & drop builder</p>
          </div>
          <div className="section-content landing-studio-content">
            <LandingPageStudio
              blocks={form.page_blocks || []}
              onBlocksChange={(blocks) => handleChange("page_blocks", blocks)}
              form={form}
              onFormChange={setForm}
            />
          </div>
        </div>

        {/* SECTION 10: Pengaturan */}
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

            {/* CREATED BY - Read Only */}
            {/* ASSIGN BY - Penanggung Jawab */}
            <div className="form-field-group">
              <label className="form-label">
                Penanggung Jawab (Assign By) <span className="required">*</span>
              </label>
              <MultiSelect
                className="w-full form-input"
                value={form.assign}
                options={userOptions}
                onChange={(e) => handleChange("assign", e.value || [])}
                placeholder="Pilih penanggung jawab produk"
                display="chip"
                showClear
                filter
                filterPlaceholder="Cari user..."
              />
              <p className="field-hint">Pilih user yang bertanggung jawab menangani produk ini</p>
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
          <Button
            label="Simpan Produk"
            icon="pi pi-save"
            className="p-button-primary submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting}
          />
          <p className="submit-hint">
            {isSubmitting
              ? (submitProgress || "Sedang mengunggah data ke server...")
              : "Pastikan semua data sudah lengkap sebelum menyimpan"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================
// LANDING PAGE RENDERER
// Block-based rendering system
// ============================

function LandingPageRenderer({ form }) {
  // ============================
  // GET KATEGORI ID
  // ============================
  const getKategoriId = () => {
    if (form.kategori) {
      return Number(form.kategori);
    }
    return null;
  };

  const kategoriId = getKategoriId();

  // ============================
  // MOCK DATA - Meniru struktur backend
  // ============================
  const mockData = {
    nama: form.nama || "Webinar Ternak Properti 2024",
    kategori_id: kategoriId,
    header: form.header?.value
      ? URL.createObjectURL(form.header.value)
      : "https://via.placeholder.com/1200x400?text=Header+Image",
    deskripsi: form.deskripsi || "Pelajari strategi investasi properti yang menguntungkan dari para ahli terpercaya.",
    harga_asli: form.harga_asli || 399000,
    harga_coret: form.harga_coret || 599000,
    gambar: form.gambar?.length > 0
      ? form.gambar.map((g, i) => ({
        src: g.path?.value ? URL.createObjectURL(g.path.value) : `https://via.placeholder.com/800x600?text=Image+${i + 1}`,
        caption: g.caption || `Gambar ${i + 1}`,
        urutan: i + 1,
      }))
      : [
        { src: "https://via.placeholder.com/800x600?text=Gallery+1", caption: "Galeri Produk 1", urutan: 1 },
        { src: "https://via.placeholder.com/800x600?text=Gallery+2", caption: "Galeri Produk 2", urutan: 2 },
      ],
    list_point: form.list_point?.length > 0
      ? form.list_point.map((p, i) => ({
        nama: p.nama || `Point ${i + 1}`,
        urutan: i + 1,
      }))
      : [
        { nama: "Materi lengkap dan terupdate", urutan: 1 },
        { nama: "Akses seumur hidup", urutan: 2 },
        { nama: "Sertifikat resmi", urutan: 3 },
        { nama: "Support dari mentor", urutan: 4 },
      ],
    video: form.video
      ? form.video.split(",").map((v, i) => ({ url: v.trim(), urutan: i + 1 }))
      : [
        { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", urutan: 1 },
      ],
    testimoni: form.testimoni?.length > 0
      ? form.testimoni.map((t, i) => ({
        nama: t.nama || `Testimoni ${i + 1}`,
        deskripsi: t.deskripsi || "Sangat membantu dan informatif!",
        gambar: t.gambar?.value ? URL.createObjectURL(t.gambar.value) : `https://via.placeholder.com/150?text=User+${i + 1}`,
        urutan: i + 1,
      }))
      : [
        {
          nama: "Budi Santoso",
          deskripsi: "Webinar ini sangat membantu saya memahami investasi properti. Materinya jelas dan mudah dipahami!",
          gambar: "https://via.placeholder.com/150?text=BS",
          urutan: 1,
        },
        {
          nama: "Siti Nurhaliza",
          deskripsi: "Saya sudah mengikuti beberapa webinar, tapi yang ini paling lengkap dan praktis.",
          gambar: "https://via.placeholder.com/150?text=SN",
          urutan: 2,
        },
      ],
  };

  // ============================
  // NORMALIZE BLOCKS
  // Gabungkan semua konten menjadi array blocks dengan type, order, data
  // ============================
  const normalizeBlocks = (data) => {
    const blocks = [];

    // 1. Header Image (order: 1)
    if (data.header) {
      blocks.push({
        type: "header",
        order: 1,
        data: {
          src: data.header,
          alt: data.nama || "Header",
        },
      });
    }

    // 2. Deskripsi (order: 2)
    if (data.deskripsi) {
      blocks.push({
        type: "text",
        order: 2,
        data: {
          content: data.deskripsi,
        },
      });
    }

    // 3. List Point (order: 3)
    if (data.list_point && data.list_point.length > 0) {
      blocks.push({
        type: "list",
        order: 3,
        data: {
          items: data.list_point.sort((a, b) => (a.urutan || 0) - (b.urutan || 0)),
        },
      });
    }

    // 4. Gallery Images (order: 4)
    if (data.gambar && data.gambar.length > 0) {
      data.gambar
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
        .forEach((img, index) => {
          blocks.push({
            type: "image",
            order: 4 + index * 0.1, // 4.0, 4.1, 4.2, etc
            data: {
              src: img.src,
              caption: img.caption,
            },
          });
        });
    }

    // 5. Video (order: 5)
    if (data.video && data.video.length > 0) {
      data.video
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
        .forEach((vid, index) => {
          blocks.push({
            type: "video",
            order: 5 + index * 0.1, // 5.0, 5.1, etc
            data: {
              url: vid.url,
            },
          });
        });
    }

    // 6. Testimoni (order: 6)
    if (data.testimoni && data.testimoni.length > 0) {
      data.testimoni
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
        .forEach((testi, index) => {
          blocks.push({
            type: "testimoni",
            order: 6 + index * 0.1, // 6.0, 6.1, etc
            data: {
              nama: testi.nama,
              deskripsi: testi.deskripsi,
              gambar: testi.gambar,
            },
          });
        });
    }

    // 7. Price CTA (order: 7)
    if (data.harga_asli) {
      blocks.push({
        type: "price",
        order: 7,
        data: {
          harga_asli: data.harga_asli,
          harga_coret: data.harga_coret,
        },
      });
    }

    // Sort by order
    return blocks.sort((a, b) => a.order - b.order);
  };

  const blocks = normalizeBlocks(mockData);

  // ============================
  // LOGGING
  // ============================
  useEffect(() => {
    console.log("========================================");
    console.log("🎯 LANDING PAGE RENDERER");
    console.log("========================================");
    console.log("📦 MOCK DATA:", mockData);
    console.log("🏷️ KATEGORI ID:", kategoriId);
    console.log("📝 Kategori Mapping:", {
      10: "Ebook",
      11: "Webinar",
      12: "Seminar",
      13: "Buku (dengan ongkir)",
      14: "Ecourse",
      15: "Workshop (dengan down payment)",
      16: "Private Mentoring",
    });
    console.log("🔢 NORMALIZED_BLOCKS:", blocks);
    console.log("📊 Total Blocks:", blocks.length);
    console.log("📋 Block Types:", [...new Set(blocks.map(b => b.type))]);
    console.log("========================================");
  }, [blocks, mockData, kategoriId]);

  // ============================
  // RENDER BLOCK
  // Generic renderer dengan switch(type)
  // ============================
  const renderBlock = (block, index) => {
    switch (block.type) {
      case "header":
        return (
          <div key={index} className="landing-block landing-block-header">
            <img
              src={block.data.src}
              alt={block.data.alt}
              className="landing-header-image"
            />
          </div>
        );

      case "text":
        return (
          <div key={index} className="landing-block landing-block-text">
            <div className="landing-text-content">
              <p>{block.data.content}</p>
            </div>
          </div>
        );

      case "list":
        return (
          <div key={index} className="landing-block landing-block-list">
            <div className="landing-list-container">
              <h3 className="landing-list-title">Apa yang Anda Dapatkan?</h3>
              <ul className="landing-list-items">
                {block.data.items.map((item, i) => (
                  <li key={i} className="landing-list-item">
                    <span className="landing-list-icon">✓</span>
                    <span>{item.nama}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case "image":
        return (
          <div key={index} className="landing-block landing-block-image">
            <div className="landing-image-container">
              <img
                src={block.data.src}
                alt={block.data.caption}
                className="landing-image"
              />
              {block.data.caption && (
                <p className="landing-image-caption">{block.data.caption}</p>
              )}
            </div>
          </div>
        );

      case "video":
        return (
          <div key={index} className="landing-block landing-block-video">
            <div className="landing-video-container">
              <iframe
                src={block.data.url}
                className="landing-video-iframe"
                title="Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );

      case "testimoni":
        return (
          <div key={index} className="landing-block landing-block-testimoni">
            <div className="landing-testimoni-card">
              <div className="landing-testimoni-header">
                <img
                  src={block.data.gambar}
                  alt={block.data.nama}
                  className="landing-testimoni-avatar"
                />
                <div className="landing-testimoni-info">
                  <h4 className="landing-testimoni-name">{block.data.nama}</h4>
                </div>
              </div>
              <p className="landing-testimoni-text">"{block.data.deskripsi}"</p>
            </div>
          </div>
        );

      case "price":
        return (
          <div key={index} className="landing-block landing-block-price">
            <div className="landing-price-container">
              <div className="landing-price-header">
                <h2 className="landing-price-title">Harga Spesial</h2>
              </div>
              <div className="landing-price-content">
                {block.data.harga_coret && (
                  <p className="landing-price-coret">
                    Rp {parseInt(block.data.harga_coret).toLocaleString("id-ID")}
                  </p>
                )}
                <p className="landing-price-aktif">
                  Rp {parseInt(block.data.harga_asli).toLocaleString("id-ID")}
                </p>
              </div>
              <button className="landing-price-button">
                Daftar Sekarang
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="landing-page-container">
      <div className="landing-page-content">
        {blocks.length === 0 ? (
          <div className="landing-empty">
            <p>Belum ada konten untuk ditampilkan</p>
          </div>
        ) : (
          blocks.map((block, index) => renderBlock(block, index))
        )}
      </div>
    </div>
  );
}
