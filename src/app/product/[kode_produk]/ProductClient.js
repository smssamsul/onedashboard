"use client";

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Script from "next/script";
import "@/styles/sales/add-products3.css";
import { buildLandingButtonInlineStyle } from "@/lib/landingPageButtonStyle";

import dynamic from "next/dynamic";
import Image from "next/image";
import { buildImageUrl } from "@/lib/image";
// ✅ OPTIMASI: Tree-shake lucide-react - import icons yang digunakan secara dinamis
// Icons digunakan dalam iconMap untuk list component, jadi tetap perlu di-import
import {
  CheckCircle2, Circle, Minus, ArrowRight, ArrowRightCircle,
  ArrowLeft as ArrowLeftIcon, ArrowLeftRight, ChevronRight, CheckSquare, ShieldCheck,
  Lock, Dot, Target, Link as LinkIcon, PlusCircle, MinusCircle,
  Check, Star, Heart, ThumbsUp, Award, Zap, Flame, Sparkles,
  ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle, PlayCircle,
  PauseCircle, StopCircle, Radio, Square, Hexagon, Triangle,
  AlertCircle, Info, HelpCircle as HelpCircleIcon, Ban, Shield, Key, Unlock,
  MapPin, Calendar as CalendarIcon, Clock
} from "lucide-react";
// ✅ OPTIMASI: Lazy load komponen besar untuk mengurangi initial bundle size
const OngkirCalculator = dynamic(() => import("@/components/OngkirCalculator"), {
  ssr: false
});
const ImageSliderPreview = dynamic(() => import("@/app/sales/products/addProducts3/components/ImageSliderPreview"), {
  ssr: false
});
const QuotaInfoPreview = dynamic(() => import("@/app/sales/products/addProducts3/components/QuotaInfoPreview"), {
  ssr: false
});
import { useAddressData } from "./hooks/useAddressData";
import { useShippingCalculator } from "./hooks/useShippingCalculator";
import { usePriceCalculator } from "./hooks/usePriceCalculator";
import { useProductForm } from "./hooks/useProductForm";

/** Query string UTM standar untuk dilampirkan ke order. */
const UTM_QUERY_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

function ClientPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

// FAQ Component & Countdown Component (Keep as is)
function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }} className="faq-item">
      <button
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'clamp(16px, 4vw, 24px) clamp(18px, 4vw, 28px)',
          backgroundColor: '#fff',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 'clamp(15px, 4.2vw, 20px)',
          fontWeight: '600',
          color: '#111827',
          transition: 'background-color 0.2s ease',
        }}
        className="faq-question"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <span style={{ fontSize: 'clamp(22px, 5vw, 28px)', marginLeft: '16px', flexShrink: 0, color: '#F1A124' }} className="faq-icon">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 clamp(18px, 4vw, 28px) clamp(18px, 4vw, 28px) clamp(18px, 4vw, 28px)',
          backgroundColor: '#fff',
          fontSize: 'clamp(14px, 3.8vw, 17px)',
          lineHeight: '1.7',
          color: '#4B5563'
        }} className="faq-answer">
          <p style={{ margin: 0 }}>{answer}</p>
        </div>
      )}
    </div>
  );
}



// ✅ NORMALISASI DATA (Helper function) - Keep as is

function CountdownComponent({ data = {}, componentId, containerStyle = {} }) {
  const hours = data.hours !== undefined ? data.hours : 0;
  const minutes = data.minutes !== undefined ? data.minutes : 0;
  const seconds = data.seconds !== undefined ? data.seconds : 0;
  // ✅ UPDATE: Default styling to match new image (Dark boxes, white text)
  const bgColor = data.bgColor || "#1F2937"; // Dark Slate default covering the new image style
  const textColor = data.textColor || "#ffffff"; // White text default

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef(null);

  const getTotalSeconds = () => (hours * 3600) + (minutes * 60) + seconds;

  useEffect(() => {
    const totalSeconds = getTotalSeconds();
    if (totalSeconds <= 0) return;

    const storageKey = `countdown_${componentId || 'default'}`;
    const savedEndTime = localStorage.getItem(storageKey);
    const now = Date.now();

    let endTime;
    if (savedEndTime) {
      const savedTime = parseInt(savedEndTime);
      const elapsed = now - savedTime;
      const remaining = (totalSeconds * 1000) - elapsed;
      if (remaining > 0) {
        endTime = savedTime + (totalSeconds * 1000);
      } else {
        endTime = now + (totalSeconds * 1000);
        localStorage.setItem(storageKey, now.toString());
      }
    } else {
      endTime = now + (totalSeconds * 1000);
      localStorage.setItem(storageKey, now.toString());
    }

    const updateTimeLeft = (endTime) => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      if (remaining <= 0) {
        const newEndTime = Date.now() + (totalSeconds * 1000);
        localStorage.setItem(storageKey, Date.now().toString());
        updateTimeLeft(newEndTime);
        return;
      }
      const hrs = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeLeft({ hours: hrs, minutes: mins, seconds: secs });
    };

    updateTimeLeft(endTime);

    intervalRef.current = setInterval(() => {
      const savedEndTime = localStorage.getItem(storageKey);
      if (!savedEndTime) {
        const newEndTime = Date.now() + (totalSeconds * 1000);
        localStorage.setItem(storageKey, Date.now().toString());
        updateTimeLeft(newEndTime);
        return;
      }
      const startTime = parseInt(savedEndTime);
      const endTime = startTime + (totalSeconds * 1000);
      updateTimeLeft(endTime);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hours, minutes, seconds, componentId]);

  // Format time
  const formattedTime = {
    hours: String(timeLeft.hours).padStart(2, '0'),
    minutes: String(timeLeft.minutes).padStart(2, '0'),
    seconds: String(timeLeft.seconds).padStart(2, '0')
  };

  const renderNumber = (value) => {
    // ✅ STYLE: Box & Typography (Dark Theme)
    const boxStyle = {
      backgroundColor: bgColor,
      borderRadius: "12px", // Smooth rounded corners
      padding: "12px 16px",
      minWidth: "70px",
      width: "15vw", // Responsive width, slightly clearer
      maxWidth: "90px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)", // Subtle shadow
      aspectRatio: "1.1/1", // Slightly wider than tall
    };

    const numberStyle = {
      fontSize: "clamp(28px, 5vw, 42px)", // Readable, bold font
      fontWeight: "700",
      color: textColor,
      fontFamily: "'Inter', sans-serif",
      lineHeight: "1",
      letterSpacing: "0.5px"
    };

    return (
      <div style={boxStyle} className="countdown-box">
        <div style={numberStyle}>{value}</div>
      </div>
    );
  };

  // Extract only padding and margin from containerStyle
  const { backgroundColor, backgroundImage, ...safeContainerStyle } = containerStyle || {};

  return (
    <div style={{
      padding: "16px",
      backgroundColor: "transparent",
      borderRadius: "12px",
      textAlign: "center",
      ...safeContainerStyle
    }}>
      <div style={{
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "nowrap",
      }}>
        {renderNumber(formattedTime.hours)}

        <span style={{
          fontSize: "clamp(24px, 5vw, 36px)",
          color: "#374151",
          fontWeight: "bold",
          marginBottom: "4px"
        }}>:</span>

        {renderNumber(formattedTime.minutes)}

        <span style={{
          fontSize: "clamp(24px, 5vw, 36px)",
          color: "#374151",
          fontWeight: "bold",
          marginBottom: "4px"
        }}>:</span>

        {renderNumber(formattedTime.seconds)}
      </div>
    </div>
  );
}

/**
 * ✅ NORMALISASI DATA BACKEND → FRONTEND (LEGACY DATA ONLY)
 * 
 * ARSITEKTUR FINAL:
 * - Section = relasi data, bukan container visual
 * - Child component WAJIB punya parentId di root level (dari backend)
 * - parentId harus sama dengan section.config.componentId
 * - TIDAK ada content.children di section (dihapus setelah normalisasi)
 * 
 * ⚠️ PENTING: Fungsi ini HANYA untuk legacy data yang masih menggunakan content.children
 * Jika backend sudah mengirim parentId langsung di child blocks, fungsi ini tidak melakukan apa-apa
 * 
 * FUNGSI INI:
 * 1. Membaca semua section dari landingpage
 * 2. Untuk setiap section, ambil content.children (jika ada - legacy data only)
 * 3. Jika content.children kosong → skip (backend sudah menggunakan parentId)
 * 4. Jika content.children ada → normalisasi ke parentId (legacy data)
 * 5. Hapus content.children dari section (cleanup)
 * 
 * RULE: Frontend TIDAK BOLEH menebak relasi. Jika parentId tidak ada → section memang kosong.
 */
function normalizeLandingpageData(landingpageData) {
  if (!Array.isArray(landingpageData)) {
    return landingpageData;
  }

  // ✅ OPTIMASI: Cek dulu apakah perlu normalisasi sebelum deep clone (hemat waktu parsing)
  const blocksWithParentId = landingpageData.filter(b => b && b.parentId);
  const sections = landingpageData.filter(item => item && item.type === 'section');

  // ✅ Step 1: Jika sudah normalized, skip clone (optimasi performa)
  if (blocksWithParentId.length > 0 && sections.length === 0) {
    // ✅ Tidak ada section dan sudah ada parentId, tidak perlu normalisasi
    return landingpageData;
  }

  // ✅ Cek apakah semua section sudah tidak punya content.children (sudah normalized)
  const needsNormalization = sections.some(section => {
    const sectionComponentId = section.config?.componentId;
    if (!sectionComponentId) return false;

    // Cek apakah sudah ada child blocks dengan parentId
    const existingChildren = landingpageData.filter(b =>
      b && b.type && b.parentId === sectionComponentId
    );

    if (existingChildren.length > 0) return false; // Sudah normalized

    // Cek apakah ada content.children (legacy data)
    const sectionChildren = section.content?.children || [];
    return Array.isArray(sectionChildren) && sectionChildren.length > 0;
  });

  // ✅ Jika tidak perlu normalisasi, return langsung (hemat deep clone)
  if (!needsNormalization) {
    return landingpageData;
  }

  // ✅ OPTIMASI: Deep clone hanya jika benar-benar perlu (untuk menghindari mutasi)
  // Gunakan structuredClone jika tersedia (untuk safety), fallback ke JSON.parse
  // Note: structuredClone tidak selalu lebih cepat, manfaatnya lebih ke safety
  const normalized = typeof structuredClone !== 'undefined'
    ? structuredClone(landingpageData)
    : JSON.parse(JSON.stringify(landingpageData));

  sections.forEach(section => {
    const sectionComponentId = section.config?.componentId;

    if (!sectionComponentId) {
      return;
    }

    // ✅ Step 3: Cek apakah sudah ada child blocks dengan parentId (backend sudah benar)
    const existingChildren = normalized.filter(b =>
      b && b.type && b.parentId === sectionComponentId
    );

    if (existingChildren.length > 0) {
      // ✅ Cleanup: Hapus content.children jika ada (tidak digunakan lagi)
      if (section.content && section.content.children) {
        delete section.content.children;
      }
      return; // ✅ Backend sudah benar, tidak perlu normalisasi
    }

    // ✅ Step 4: Legacy data - coba ambil content.children (jika ada)
    const sectionChildren = section.content?.children || [];

    if (!Array.isArray(sectionChildren) || sectionChildren.length === 0) {
      // ✅ Cleanup: Hapus content.children yang kosong
      if (section.content) {
        delete section.content.children;
      }
      return; // ✅ Tidak ada data, tidak perlu normalisasi
    }

    // ✅ Step 5: Legacy data - normalisasi content.children ke parentId

    sectionChildren.forEach((childRef, childIndex) => {
      let childBlock = null;

      // ✅ Case 1: childRef adalah object lengkap dengan type
      if (typeof childRef === 'object' && childRef !== null && childRef.type) {
        const childComponentId = childRef.config?.componentId || childRef.componentId;
        const childOrder = childRef.order;

        childBlock = normalized.find(b => {
          if (!b || b.type === 'section' || b.type === 'settings') return false;
          if (childComponentId && b.config?.componentId === childComponentId) return true;
          if (childOrder && b.order === childOrder) return true;
          return false;
        });
      }
      // ✅ Case 2: childRef adalah ID (string atau number)
      else if (typeof childRef === 'string' || typeof childRef === 'number') {
        const childId = String(childRef);
        childBlock = normalized.find(b => {
          if (!b || b.type === 'section' || b.type === 'settings') return false;
          return b.config?.componentId === childId || String(b.order) === childId;
        });
      }

      // ✅ Step 6: Tambahkan parentId ke child block (di root level)
      if (childBlock && !childBlock.parentId) {
        childBlock.parentId = sectionComponentId;
      }
    });

    // ✅ Step 7: Cleanup - Hapus content.children dari section (tidak digunakan lagi)
    if (section.content) {
      delete section.content.children;
    }
  });

  return normalized;
}

// ✅ OPTIMASI: Pisahkan komponen yang menggunakan useSearchParams untuk Suspense boundary
// ✅ OPTIMASI: Pisahkan komponen yang menggunakan useSearchParams untuk Suspense boundary
function ProductClient({ initialProductData, initialLandingPage }) {
  const { kode_produk } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sumber = searchParams.get("utm_sumber") || "website";

  const utmFromQuery = useMemo(() => {
    const o = {};
    UTM_QUERY_KEYS.forEach((k) => {
      const v = searchParams.get(k);
      if (v != null && String(v).trim() !== "") o[k] = String(v).trim();
    });
    return o;
  }, [searchParams]);

  // ✅ Helper: Facebook Pixel tracking (safe guard for missing fbq)
  const trackFacebookEvent = (eventName, params = {}) => {
    if (typeof window === "undefined") return;

    // Ambil pixel ID secara aman dan dinamis untuk menghindari issue scoping
    const getFreshPixelIds = () => {
      const settingsObj = landingpage && Array.isArray(landingpage)
        ? landingpage.find(item => item.type === 'settings')
        : null;
      if (!settingsObj) return [];

      const anal = settingsObj?.analytics || {};
      const analFb = anal.facebook || {};
      const analFbPixels = Array.isArray(analFb.pixels) ? analFb.pixels : [];

      let pIds = [];
      if (Array.isArray(settingsObj?.facebook_pixels)) {
        pIds = settingsObj.facebook_pixels;
      } else if (typeof settingsObj?.facebook_pixels === 'string') {
        pIds = settingsObj.facebook_pixels.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (pIds.length === 0 && analFbPixels.length > 0) {
        pIds = analFbPixels.map(p => p && (p.id || p.pixel || p.pixel_id)).filter(Boolean);
      }

      // ✅ TERBARU: Ambil dari pixel_list (relasi ke pixel_meta) jika ada
      if (productData?.pixel_list && Array.isArray(productData.pixel_list) && productData.pixel_list.length > 0) {
        pIds = productData.pixel_list.map((p) => p.pixel).filter(Boolean);
      }

      return pIds;
    };

    const pixelIdsToLog = getFreshPixelIds();

    if (typeof window.fbq !== "function") {
      // Log kegagalan karena fbq tidak terdefinisi (misal adblocker aktif)
      if (pixelIdsToLog.length > 0) {
        pixelIdsToLog.forEach(pid => {
          fetch('/api/pixel-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: null,
              produk_id: productData?.id || null,
              pixel_id: pid,
              event_name: eventName,
              source: 'landing_page',
              status: '0',
              payload: { error: "fbq is not a function (blocked or not loaded)", params }
            })
          }).catch(e => console.error('[FB PIXEL LOG] Failed to send landing crosscheck log:', e));
        });
      }
      return;
    }

    try {
      window.fbq("track", eventName, params);
      if (process.env.NODE_ENV === "development") {
        console.log("[FB PIXEL EVENT]", eventName, params);
      }

      // Log sukses ke backend
      if (pixelIdsToLog.length > 0) {
        pixelIdsToLog.forEach(pid => {
          fetch('/api/pixel-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: null,
              produk_id: productData?.id || null,
              pixel_id: pid,
              event_name: eventName,
              source: 'landing_page',
              status: '1',
              payload: params
            })
          }).catch(e => console.error('[FB PIXEL LOG] Failed to send landing crosscheck log:', e));
        });
      }
    } catch (e) {
      console.error("[FB PIXEL] Error triggering event:", eventName, e);

      // Log error tracking ke backend
      if (pixelIdsToLog.length > 0) {
        pixelIdsToLog.forEach(pid => {
          fetch('/api/pixel-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: null,
              produk_id: productData?.id || null,
              pixel_id: pid,
              event_name: eventName,
              source: 'landing_page',
              status: '0',
              payload: { error: e.message, params }
            })
          }).catch(e => console.error('[FB PIXEL LOG] Failed to send landing crosscheck log:', e));
        });
      }
    }
  };

  // Data State - Mulai dengan null untuk menjamin kesegaran
  const [productData, setProductData] = useState(null);
  const [landingpage, setLandingpage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testimoniIndices, setTestimoniIndices] = useState({});

  // 🔥 SOLUSI FINAL: Satu Sumber Kebenaran (Fetch Fresh dari Client)
  // Tidak lagi percaya initialProductData dari Server Props karena rawan cache Next.js
  useEffect(() => {
    const fetchFreshData = async () => {
      if (!kode_produk) return;

      try {
        setLoading(true);
        // Paksa null agar UI bersih dari data produk sebelumnya
        setProductData(null);
        setLandingpage(null);

        console.log(`[CLIENT-FETCH] Mengambil data segar untuk: ${kode_produk}...`);

        const timestamp = new Date().getTime();
        const res = await fetch(`/api/landing/${kode_produk}?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const result = await res.json();

        if (result.success && result.data) {
          const data = result.data;

          // 1. Progress Bundling Data
          let bundlingData = [];
          if (data.bundling_rel && Array.isArray(data.bundling_rel)) {
            bundlingData = data.bundling_rel
              .filter(item => item.status === 'A')
              .map(item => ({
                ...item,
                id: item.id,
                nama: item.nama,
                harga: typeof item.harga === 'string' ? parseInt(item.harga) : item.harga
              }));
          } else if (data.bundling) {
            if (typeof data.bundling === 'string') {
              try { bundlingData = JSON.parse(data.bundling); } catch (e) { bundlingData = []; }
            } else if (Array.isArray(data.bundling)) {
              bundlingData = data.bundling;
            }
          }

          // 2. Set Product Data
          setProductData({
            id: data.id,
            nama: data.nama,
            harga: data.harga,
            harga_asli: data.harga_asli,
            harga_coret: data.harga_coret,
            kategori: data.kategori,
            kategori_id: data.kategori_id,
            kategori_rel: data.kategori_rel,
            isBundling: (bundlingData && bundlingData.length > 0) || false,
            bundling: bundlingData,
            pixel_list: data.pixel_list || [],
            jadwal: data.jadwal_rel || data.jadwal || [],
          });

          // 3. Process Landingpage Array
          let lpData = data.landingpage;
          if (typeof lpData === 'string') {
            try { lpData = JSON.parse(lpData); } catch (e) { lpData = null; }
          }

          if (Array.isArray(lpData)) {
            // ✅ NORMALISASI DATA: Penting agar section & child sinkron
            lpData = normalizeLandingpageData(lpData);
            setLandingpage(lpData);
          }

          console.log('[CLIENT-FETCH] Data Berhasil di-update (Fresh)!');

          // ✅ Facebook Pixel: Track Landing Page View ketika data produk berhasil dimuat
          trackFacebookEvent("ViewContent", {
            content_name: data.nama || "Product",
            content_category: data.kategori_rel?.nama || "Product",
            value: data.harga || 0,
            currency: "IDR",
          });
        } else {
          toast.error("Produk tidak ditemukan");
        }
      } catch (e) {
        console.error('[CLIENT-FETCH] Error:', e);
        toast.error("Gagal memuat data produk terbaru");
      } finally {
        setLoading(false);
      }
    };

    fetchFreshData();
  }, [kode_produk]);

  // ✅ LIVE SYNC: Dengerin sinyal dari tab Edit
  useEffect(() => {
    // Fungsi untuk fetch ulang data paling baru secara manual (tanpa Router Refresh)
    const refreshData = async () => {
      try {
        console.log('[LIVE-SYNC] Mendapat sinyal update, mengambil data terbaru...');

        const timestamp = new Date().getTime();
        const res = await fetch(`/api/landing/${kode_produk}?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const result = await res.json();

        if (result.success) {
          // Update state internal dengan data paling fresh
          setProductData({
            ...result.data,
            jadwal: result.data.jadwal_rel || result.data.jadwal || []
          });
          setLandingpage(result.landingpage);
          console.log('[LIVE-SYNC] Data berhasil di-update secara instan di browser!');
        } else {
          // Fallback reload hanya jika benar-benar gagal total
          window.location.reload();
        }
      } catch (e) {
        console.error('[LIVE-SYNC] Gagal sync data:', e);
        window.location.reload();
      }
    };

    try {
      const bc = new BroadcastChannel('product_update');
      bc.onmessage = (event) => {
        if (event.data?.type === 'REFRESH_PRODUCT' && event.data?.kode === kode_produk) {
          refreshData(); // Lakukan fetch manual ke API, bukan reload router
        }
      };
      return () => bc.close();
    } catch (e) { }
  }, [kode_produk]);

  // -- HOOKS INTEGRATION --

  // 1. Address Logic & Data
  const {
    wilayahData,
    selectedWilayahIds, setSelectedWilayahIds,
    loadingWilayah,
    districtSearchTerm, setDistrictSearchTerm,
    handleDistrictSearch,
    districtSearchResults, setDistrictSearchResults,
    loadingDistrictSearch,
    showDistrictResults, setShowDistrictResults
  } = useAddressData();

  // 2. Shipping Logic
  const {
    ongkir, setOngkir,
    ongkirInfo, setOngkirInfo,
    costResults, setCostResults,
    loadingCost,
    selectedCourier, setSelectedCourier,
    handleCalculateOngkir: _handleCalculateOngkir,
    selectShippingService
  } = useShippingCalculator();

  // Courier options - 12 opsi sesuai ketentuan
  const couriers = [
    { value: "jne", label: "JNE" },
    { value: "sicepat", label: "SiCepat" },
    { value: "jnt", label: "JNT" },
    { value: "ninja", label: "Ninja Express" },
    { value: "anteraja", label: "AnterAja" },
    { value: "tiki", label: "TIKI" },
    { value: "pos", label: "POS Indonesia" },
    { value: "lion", label: "Lion Parcel" },
    { value: "wahana", label: "Wahana" },
    { value: "ide", label: "IDE" },
    { value: "sap", label: "SAP Express" },
    { value: "ncs", label: "NCS" },
  ];

  // Derived settings
  const settings = landingpage && Array.isArray(landingpage)
    ? landingpage.find(item => item.type === 'settings')
    : null;

  // 3. Form Logic (Orchestrator)
  const {
    customerForm, setCustomerForm,
    formWilayah, setFormWilayah,
    paymentMethod, setPaymentMethod,
    selectedBundling, setSelectedBundling,
    submitting, setSubmitting,
    alamatLengkap,
    handleSubmit: _handleSubmit, // Renamed to wrap
    handleSaveDraft: _handleSaveDraft, // Renamed (optional, can use directly if no args change)
    isFormValid
  } = useProductForm({
    productData,
    shippingState: { ongkir, ongkirInfo },
    addressState: { selectedWilayahIds },
    sumber,
    utmParams: utmFromQuery,
    fbPixel: settings?.analytics?.facebook?.pixels, // Sesuai info user: landingpage.analytics.facebook.pixels
  });

  // Set default payment method if available methods change
  useEffect(() => {
    if (!paymentMethod && settings && settings.payment_methods) {
      if (settings.payment_methods.manual !== false) setPaymentMethod("manual");
      else if (settings.payment_methods.ewallet !== false) setPaymentMethod("ewallet");
      else if (settings.payment_methods.cc !== false) setPaymentMethod("cc");
      else if (settings.payment_methods.va !== false) setPaymentMethod("va");
    } else if (!paymentMethod && settings && !settings.payment_methods) {
      // Fallback for legacy products that don't have this field yet
      setPaymentMethod("manual");
    }
  }, [settings, paymentMethod, setPaymentMethod]);

  // 4. Price Calculation Logic
  const {
    basePrice,
    totalPrice: calculateTotal, // Maps to 'calculateTotal' variable used in JSX
    isKategoriBuku: _isKategoriBuku,
    productKategoriId
  } = usePriceCalculator(productData, ongkir, selectedBundling);

  // -- ADAPTERS / WRAPPERS --

  // Wrapper for 'isKategoriBuku' (hook returns callback, we can assign it)
  const isKategoriBuku = _isKategoriBuku;

  // Handle payment method change + Facebook Pixel AddPaymentInfo
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);

    // Trigger Facebook Pixel AddPaymentInfo event ketika user memilih metode pembayaran
    trackFacebookEvent("AddPaymentInfo", {
      payment_method: method,
      content_name: productData?.nama || "Product",
      value: calculateTotal || 0,
      currency: "IDR",
    });
  };

  /** Pilih bundling di landing + Pixel AddPaymentInfo (value = harga paket + ongkir jika kategori buku). */
  const handleBundlingSelect = (index) => {
    if (selectedBundling === index) return;
    setSelectedBundling(index);

    const bundlingData =
      productData?.bundling && Array.isArray(productData.bundling) ? productData.bundling : [];
    const item = bundlingData[index];
    if (!item) return;

    const parsePrice = (price) => {
      if (!price) return 0;
      if (typeof price === "number") return price;
      return parseInt(String(price).replace(/[^\d]/g, ""), 10) || 0;
    };
    const basePrice = parsePrice(item.harga);
    const shippingCost = productKategoriId === 4 ? (ongkir || 0) : 0;
    const value = basePrice + shippingCost;


  };

  // Wrapper for handleSubmit to inject calculated price values
  const handleSubmit = async () => {
    const bundlingData = productData?.bundling && Array.isArray(productData.bundling) ? productData.bundling : [];
    const item = selectedBundling !== null ? bundlingData[selectedBundling] : null;

    const parsePrice = (price) => {
      if (!price) return 0;
      if (typeof price === "number") return price;
      return parseInt(String(price).replace(/[^\d]/g, ""), 10) || 0;
    };

    const basePriceValue = item ? parsePrice(item.harga) : parsePrice(productData?.harga || 0);
    const shippingCost = productKategoriId === 4 ? (ongkir || 0) : 0;
    const finalValue = basePriceValue + shippingCost;

    const contentName = item?.nama
      ? `${productData?.nama || "Product"} — ${item.nama}`
      : productData?.nama || "Product";

    trackFacebookEvent("AddPaymentInfo", {
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      content_name: contentName,
      content_category: productData?.kategori_rel?.nama || "Product",
      value: calculateTotal || finalValue || 0,
      currency: "IDR",
    });

    // Panggil form submission yang sebenarnya agar order bisa dibuat
    await _handleSubmit({
      totalHarga: calculateTotal || finalValue || 0,
      hargaProduk: basePriceValue,
      isKategoriBuku: isKategoriBuku()
    });
  };

  // Wrapper for handleSaveDraft (if needed)
  const handleSaveDraft = _handleSaveDraft;

  // Wrapper for handleCalculateOngkir (to match existing signature if needed)
  const handleCalculateOngkir = _handleCalculateOngkir;

  // Legacy state for OngkirCalculator component (if strictly needed by old component props)
  // We keep it to be safe, though likely redundant with formWilayah
  const [ongkirAddress, setOngkirAddress] = useState({
    provinsi: "",
    kota: "",
    kabupaten: "",
    kecamatan: "",
    kelurahan: "",
    kode_pos: "",
  });

  // Formatting Helper
  const formatPrice = (price) => {
    if (!price) return "0";
    const numPrice = typeof price === "string" ? parseInt(price.replace(/[^\d]/g, "")) : price;
    return (isNaN(numPrice) ? 0 : numPrice).toLocaleString("id-ID");
  };

  // Helper for Kategori ID (Hook version)
  const getKategoriId = useCallback(() => productKategoriId, [productKategoriId]);


  // FAQ Mapping
  const getFAQByKategori = (kategoriId) => {
    const faqMap = {
      10: [
        { question: "Apa saja yang akan saya dapatkan jika membeli ebook ini?", answer: "Anda akan mendapatkan akses ke file ebook dalam format PDF yang dapat diunduh dan dibaca kapan saja, plus bonus materi tambahan jika tersedia." },
        { question: "Bagaimana cara mengakses ebook setelah pembelian?", answer: "Setelah pembayaran dikonfirmasi, Anda akan menerima email berisi link download dan akses ke member area untuk mengunduh ebook." },
        { question: "Apakah ebook bisa diunduh berkali-kali?", answer: "Ya, setelah pembelian, Anda memiliki akses seumur hidup dan dapat mengunduh ebook berkali-kali sesuai kebutuhan." },
        { question: "Apakah ebook bisa dibaca di semua perangkat?", answer: "Ya, ebook dalam format PDF dapat dibaca di smartphone, tablet, laptop, dan komputer dengan aplikasi PDF reader." },
        { question: "Apakah ada garansi untuk ebook yang dibeli?", answer: "Kami memberikan garansi kepuasan. Jika tidak puas dengan konten ebook, silakan hubungi customer service kami untuk bantuan." }
      ],
      11: [
        { question: "Apa saja yang akan saya dapatkan dari webinar ini?", answer: "Anda akan mendapatkan akses live webinar, rekaman lengkap yang dapat ditonton ulang, materi presentasi, dan sertifikat kehadiran." },
        { question: "Bagaimana cara mengikuti webinar?", answer: "Setelah pembayaran dikonfirmasi, Anda akan menerima email berisi link Zoom/meeting room dan jadwal webinar. Link akan dikirim 1 hari sebelum acara." },
        { question: "Apakah ada rekaman jika saya tidak bisa hadir live?", answer: "Ya, semua peserta akan mendapatkan akses ke rekaman webinar yang dapat ditonton ulang kapan saja setelah acara selesai." },
        { question: "Berapa lama akses rekaman webinar tersedia?", answer: "Akses rekaman webinar tersedia seumur hidup. Anda dapat menonton ulang kapan saja melalui member area." },
        { question: "Apakah saya bisa bertanya langsung kepada pembicara?", answer: "Ya, pada sesi live webinar akan ada waktu untuk tanya jawab langsung dengan pembicara melalui fitur Q&A atau chat." }
      ],
      12: [
        { question: "Apa saja yang akan saya dapatkan dari seminar ini?", answer: "Anda akan mendapatkan tiket masuk seminar, materi presentasi, sertifikat kehadiran, networking session, dan coffee break." },
        { question: "Di mana lokasi seminar akan dilaksanakan?", answer: "Lokasi seminar akan diinformasikan melalui email setelah pembayaran dikonfirmasi. Biasanya di hotel atau venue yang mudah dijangkau." },
        { question: "Apakah ada rekaman seminar yang bisa saya akses?", answer: "Tergantung kebijakan acara. Jika tersedia, rekaman akan dibagikan kepada peserta setelah seminar selesai melalui email." },
        { question: "Bagaimana jika saya tidak bisa hadir di tanggal yang ditentukan?", answer: "Silakan hubungi customer service kami untuk informasi refund atau transfer tiket ke peserta lain. Kebijakan dapat berbeda tergantung waktu pemberitahuan." },
        { question: "Apakah ada diskon untuk pembelian tiket grup?", answer: "Ya, tersedia diskon khusus untuk pembelian tiket grup minimal 5 orang. Hubungi customer service kami untuk informasi lebih lanjut." }
      ],
      13: [
        { question: "Apa saja yang akan saya dapatkan jika membeli buku ini?", answer: "Anda akan mendapatkan buku fisik berkualitas tinggi dengan konten lengkap dan terpercaya, plus akses ke materi tambahan jika tersedia." },
        { question: "Berapa lama waktu pengiriman buku?", answer: "Waktu pengiriman bervariasi tergantung lokasi Anda. Untuk wilayah Jabodetabek biasanya 2-3 hari kerja, sedangkan luar kota 3-7 hari kerja." },
        { question: "Apakah buku ini tersedia dalam format digital?", answer: "Saat ini buku tersedia dalam format fisik. Format digital akan diinformasikan lebih lanjut jika tersedia." },
        { question: "Bagaimana cara menghitung ongkos kirim?", answer: "Ongkos kirim akan dihitung otomatis berdasarkan alamat pengiriman Anda. Anda dapat melihat estimasi ongkir setelah memasukkan alamat lengkap." },
        { question: "Apakah ada garansi untuk buku yang dibeli?", answer: "Kami memberikan garansi untuk buku yang rusak atau cacat saat pengiriman. Silakan hubungi customer service kami jika mengalami masalah." }
      ],
      14: [
        { question: "Apa saja yang akan saya dapatkan dari ecourse ini?", answer: "Anda akan mendapatkan akses ke semua modul pembelajaran, video tutorial, materi download, quiz, sertifikat, dan akses ke komunitas eksklusif." },
        { question: "Berapa lama akses ke ecourse tersedia?", answer: "Akses ke ecourse tersedia seumur hidup. Anda dapat belajar kapan saja dan mengulang materi sesuai kebutuhan." },
        { question: "Apakah ada support atau mentoring selama belajar?", answer: "Ya, tersedia support melalui grup komunitas, email, atau sesi Q&A berkala dengan instruktur untuk membantu proses pembelajaran Anda." },
        { question: "Apakah ecourse bisa diakses dari mobile?", answer: "Ya, platform ecourse kami mobile-friendly dan dapat diakses melalui smartphone, tablet, atau laptop dengan koneksi internet." },
        { question: "Apakah ada ujian atau sertifikat setelah menyelesaikan ecourse?", answer: "Ya, setelah menyelesaikan semua modul dan quiz, Anda akan mendapatkan sertifikat kelulusan yang dapat diunduh dan dicetak." }
      ],
      15: [
        { question: "Apa saja yang akan saya dapatkan dari workshop ini?", answer: "Anda akan mendapatkan materi lengkap, sertifikat, akses ke recording, dan komunitas eksklusif peserta workshop." },
        { question: "Apakah workshop ini cocok untuk pemula?", answer: "Ya, workshop ini dirancang untuk semua level, termasuk pemula. Materi akan disampaikan secara bertahap dan mudah dipahami." },
        { question: "Bagaimana sistem pembayaran untuk workshop?", answer: "Anda dapat melakukan pembayaran penuh atau menggunakan sistem down payment (uang muka) terlebih dahulu, kemudian melunasi sebelum workshop dimulai." },
        { question: "Apakah ada rekaman workshop yang bisa saya akses nanti?", answer: "Ya, semua peserta akan mendapatkan akses ke rekaman workshop yang dapat ditonton ulang kapan saja." },
        { question: "Bagaimana jika saya tidak bisa hadir di tanggal yang ditentukan?", answer: "Anda tetap bisa mengikuti workshop melalui rekaman yang akan diberikan. Namun, untuk interaksi langsung, disarankan hadir sesuai jadwal." }
      ],
      16: [
        { question: "Apa saja yang akan saya dapatkan dari private mentoring ini?", answer: "Anda akan mendapatkan sesi mentoring one-on-one dengan mentor berpengalaman, personalized action plan, follow-up support, dan akses ke materi eksklusif." },
        { question: "Berapa kali sesi mentoring yang akan saya dapatkan?", answer: "Jumlah sesi mentoring tergantung paket yang dipilih. Detail lengkap akan diinformasikan setelah pembayaran dikonfirmasi." },
        { question: "Bagaimana cara menjadwalkan sesi mentoring?", answer: "Setelah pembayaran dikonfirmasi, tim kami akan menghubungi Anda untuk mengatur jadwal sesi mentoring yang sesuai dengan waktu luang Anda." },
        { question: "Apakah sesi mentoring dilakukan online atau offline?", answer: "Tersedia pilihan online (via Zoom/Google Meet) atau offline (jika memungkinkan). Detail akan dibahas saat konfirmasi jadwal." },
        { question: "Apakah ada follow-up setelah sesi mentoring selesai?", answer: "Ya, tersedia follow-up support melalui email atau grup komunitas untuk memastikan Anda dapat menerapkan ilmu yang didapat." }
      ]
    };

    return faqMap[kategoriId] || [
      { question: "Apa saja yang akan saya dapatkan dari produk ini?", answer: "Anda akan mendapatkan akses penuh ke semua fitur dan konten yang tersedia dalam paket produk ini." },
      { question: "Bagaimana cara menggunakan produk ini?", answer: "Setelah pembayaran dikonfirmasi, Anda akan mendapatkan panduan lengkap dan akses ke platform produk." },
      { question: "Apakah ada garansi untuk produk ini?", answer: "Kami memberikan garansi kepuasan. Jika tidak puas, silakan hubungi customer service kami untuk bantuan." },
      { question: "Bagaimana sistem pembayarannya?", answer: "Pembayaran dapat dilakukan melalui berbagai metode yang tersedia. Setelah pembayaran dikonfirmasi, akses akan segera diberikan." },
      { question: "Apakah ada dukungan setelah pembelian?", answer: "Ya, tim customer service kami siap membantu Anda selama menggunakan produk ini. Hubungi kami kapan saja jika ada pertanyaan." }
    ];
  };

  const generateAlamatLengkap = (alamatDasar, addressDetail) => {
    const parts = [];
    if (alamatDasar && alamatDasar.trim()) {
      parts.push(alamatDasar.trim());
    }
    if (addressDetail.kecamatan && addressDetail.kecamatan.trim()) {
      parts.push(`kec. ${addressDetail.kecamatan.trim()}`);
    }
    if (addressDetail.kelurahan && addressDetail.kelurahan.trim()) {
      parts.push(`kel/kab. ${addressDetail.kelurahan.trim()}`);
    }
    if (addressDetail.kode_pos && addressDetail.kode_pos.trim()) {
      parts.push(`kode pos ${addressDetail.kode_pos.trim()}`);
    }
    const alamatFinal = parts.join(", ");
    setAlamatLengkap(alamatFinal);
  };

  // Helper untuk convert YouTube URL ke embed URL
  const convertToEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) {
      const videoId = url.split("watch?v=")[1]?.split("&")[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    return url;
  };

  // ✅ FUNGSI HELPER: Clean HTML content - remove inline font-family styles using regex
  const cleanHTMLContent = (html) => {
    if (!html) return html;

    // Remove font-family from inline style attributes using regex
    return html.replace(
      /style\s*=\s*["']([^"']*)["']/gi,
      (match, styleContent) => {
        // Remove font-family declarations from style content
        const cleanedStyle = styleContent
          .replace(/font-family\s*:\s*[^;'"]+(?:['"][^'"]*['"])?;?/gi, '')
          .replace(/;\s*;/g, ';')
          .replace(/^\s*;\s*|\s*;\s*$/g, '')
          .trim();

        if (cleanedStyle) {
          return `style="${cleanedStyle}"`;
        } else {
          return '';
        }
      }
    );
  };

  // ✅ FUNGSI HELPER: Convert style.text dari backend ke CSS text properties (GENERAL - otomatis baca semua field)
  const getTextStyles = (styleText = {}) => {
    const textStyles = {};

    // Font properties
    // ✅ SAMA dengan addProducts3: "Page Font" = "Inter, sans-serif", bukan "inherit"
    if (styleText.fontFamily) {
      textStyles.fontFamily = styleText.fontFamily !== "Page Font"
        ? styleText.fontFamily
        : "Inter, sans-serif"; // ✅ Default font sama dengan addProducts3
    }
    if (styleText.color !== undefined) textStyles.color = styleText.color;
    if (styleText.lineHeight !== undefined) textStyles.lineHeight = styleText.lineHeight;
    if (styleText.fontWeight !== undefined) textStyles.fontWeight = styleText.fontWeight;
    if (styleText.fontStyle !== undefined) textStyles.fontStyle = styleText.fontStyle;
    if (styleText.textDecoration !== undefined) textStyles.textDecoration = styleText.textDecoration;
    if (styleText.textTransform !== undefined) textStyles.textTransform = styleText.textTransform;
    if (styleText.letterSpacing !== undefined) textStyles.letterSpacing = `${styleText.letterSpacing}px`;
    if (styleText.wordSpacing !== undefined) textStyles.wordSpacing = `${styleText.wordSpacing}px`;
    if (styleText.backgroundColor !== undefined) {
      textStyles.backgroundColor = styleText.backgroundColor !== "transparent" ? styleText.backgroundColor : "transparent";
    }

    // Text alignment - handle "align" (dari backend) dan "textAlign" (legacy)
    if (styleText.align !== undefined) {
      textStyles.textAlign = styleText.align;
    } else if (styleText.alignment !== undefined) {
      textStyles.textAlign = styleText.alignment;
    } else if (styleText.textAlign !== undefined) {
      textStyles.textAlign = styleText.textAlign;
    }

    return textStyles;
  };

  // ✅ FUNGSI HELPER: Convert style.container dari backend ke CSS container properties (GENERAL - otomatis baca semua field)
  const getContainerStyles = (styleContainer = {}) => {
    const containerStyles = {};

    // Padding - handle nested (padding.top) dan flat (paddingTop)
    if (styleContainer.padding) {
      if (styleContainer.padding.top !== undefined) containerStyles.paddingTop = `${styleContainer.padding.top}px`;
      if (styleContainer.padding.right !== undefined) containerStyles.paddingRight = `${styleContainer.padding.right}px`;
      if (styleContainer.padding.bottom !== undefined) containerStyles.paddingBottom = `${styleContainer.padding.bottom}px`;
      if (styleContainer.padding.left !== undefined) containerStyles.paddingLeft = `${styleContainer.padding.left}px`;
    } else {
      if (styleContainer.paddingTop !== undefined) containerStyles.paddingTop = `${styleContainer.paddingTop}px`;
      if (styleContainer.paddingRight !== undefined) containerStyles.paddingRight = `${styleContainer.paddingRight}px`;
      if (styleContainer.paddingBottom !== undefined) containerStyles.paddingBottom = `${styleContainer.paddingBottom}px`;
      if (styleContainer.paddingLeft !== undefined) containerStyles.paddingLeft = `${styleContainer.paddingLeft}px`;
    }

    // Margin - handle nested (margin.top) dan flat (marginTop)
    if (styleContainer.margin) {
      if (styleContainer.margin.top !== undefined) containerStyles.marginTop = `${styleContainer.margin.top}px`;
      if (styleContainer.margin.right !== undefined) containerStyles.marginRight = `${styleContainer.margin.right}px`;
      if (styleContainer.margin.bottom !== undefined) containerStyles.marginBottom = `${styleContainer.margin.bottom}px`;
      if (styleContainer.margin.left !== undefined) containerStyles.marginLeft = `${styleContainer.margin.left}px`;
    } else {
      if (styleContainer.marginTop !== undefined) containerStyles.marginTop = `${styleContainer.marginTop}px`;
      if (styleContainer.marginRight !== undefined) containerStyles.marginRight = `${styleContainer.marginRight}px`;
      if (styleContainer.marginBottom !== undefined) containerStyles.marginBottom = `${styleContainer.marginBottom}px`;
      if (styleContainer.marginLeft !== undefined) containerStyles.marginLeft = `${styleContainer.marginLeft}px`;
    }

    // Background - handle nested (background.color) dan flat (bgColor)
    if (styleContainer.background) {
      if (styleContainer.background.type === "color" && styleContainer.background.color) {
        containerStyles.backgroundColor = styleContainer.background.color;
      } else if (styleContainer.background.type === "image" && styleContainer.background.image) {
        containerStyles.backgroundImage = `url(${styleContainer.background.image})`;
        containerStyles.backgroundSize = styleContainer.background.size || "cover";
        containerStyles.backgroundPosition = styleContainer.background.position || "center";
        containerStyles.backgroundRepeat = styleContainer.background.repeat || "no-repeat";
      }
    } else {
      if (styleContainer.bgColor) containerStyles.backgroundColor = styleContainer.bgColor;
      if (styleContainer.bgImage) containerStyles.backgroundImage = `url(${styleContainer.bgImage})`;
    }

    // Border - handle nested (border.width) dan flat
    if (styleContainer.border) {
      if (styleContainer.border.width) {
        containerStyles.border = `${styleContainer.border.width}px ${styleContainer.border.style || 'solid'} ${styleContainer.border.color || '#e5e7eb'}`;
      }
      if (styleContainer.border.radius !== undefined) {
        containerStyles.borderRadius = styleContainer.border.radius === "0px" || styleContainer.border.radius === "0" ? 0 : styleContainer.border.radius;
      }
    }

    // Shadow
    if (styleContainer.shadow !== undefined) {
      containerStyles.boxShadow = styleContainer.shadow === "none" ? "none" : styleContainer.shadow;
    }

    return containerStyles;
  };

  // ✅ FIX: Hapus useCallback untuk menghindari React error #310
  // Dependency array terlalu kompleks dan tidak stabil
  // Render Block berdasarkan struktur content/style/config - SAMA PERSIS dengan renderPreview di addProducts3
  const renderBlock = (block, allBlocks = []) => {
    if (!block || !block.type) return null;

    const { type, content, style, config } = block;

    // ✅ GENERAL: Otomatis baca semua field dari style.container dari backend
    const containerStyle = getContainerStyles(style?.container || {});

    // ✅ GENERAL: Otomatis baca semua field dari style.text dari backend
    const textStylesFromBackend = getTextStyles(style?.text || {});

    // Simulasi block.data dari content/style/config untuk kompatibilitas dengan renderPreview logic
    const blockData = {
      // Text data - menggunakan textStylesFromBackend yang sudah di-generate otomatis
      content: content?.html || content || "",
      textColor: style?.text?.color || "#000000",
      fontFamily: textStylesFromBackend.fontFamily || "Inter, sans-serif", // ✅ Default "Inter, sans-serif" sama dengan addProducts3
      lineHeight: Number.isFinite(Number(style?.text?.lineHeight))
        ? Number(style.text.lineHeight)
        : 1.5,
      textAlign: textStylesFromBackend.textAlign || "left",
      fontWeight: style?.text?.fontWeight || "normal",
      fontStyle: style?.text?.fontStyle || "normal",
      textDecoration: style?.text?.textDecoration || "none",
      textTransform: style?.text?.textTransform || "none",
      letterSpacing: style?.text?.letterSpacing || 0,
      wordSpacing: style?.text?.wordSpacing ?? 0,
      marginTop: style?.container?.margin?.top ?? style?.container?.marginTop ?? 0,
      marginBottom: style?.container?.margin?.bottom ?? style?.container?.marginBottom ?? 0,
      backgroundColor: style?.text?.backgroundColor || "transparent",
      paragraphStyle: config?.tag || config?.paragraphStyle || "div",
      bgType: style?.text?.background?.type || style?.text?.bgType || "none",
      bgColor: style?.text?.background?.color || style?.text?.bgColor || "#ffffff",
      bgImage: style?.text?.background?.image || style?.text?.bgImage || "",
      // Padding dari style.text atau fallback ke style.container
      paddingTop: style?.text?.padding?.top ?? style?.text?.paddingTop ?? style?.container?.padding?.top ?? style?.container?.paddingTop ?? 0,
      paddingRight: style?.text?.padding?.right ?? style?.text?.paddingRight ?? style?.container?.padding?.right ?? style?.container?.paddingRight ?? 0,
      paddingBottom: style?.text?.padding?.bottom ?? style?.text?.paddingBottom ?? style?.container?.padding?.bottom ?? style?.container?.paddingBottom ?? 0,
      paddingLeft: style?.text?.padding?.left ?? style?.text?.paddingLeft ?? style?.container?.padding?.left ?? style?.container?.paddingLeft ?? 0,

      // Image data
      src: content?.src || content?.url || "",
      alt: content?.alt || "",
      caption: content?.caption || "",
      alignment: style?.image?.alignment || style?.container?.alignment || "center", // ✅ Ambil dari style.image.alignment atau fallback
      imageWidth: style?.image?.width || style?.container?.imageWidth || 100, // ✅ Ambil dari style.image.width atau fallback
      imageFit: style?.image?.fit || style?.container?.imageFit || "fill", // ✅ Ambil dari style.image.fit atau fallback
      aspectRatio: style?.image?.aspectRatio || style?.container?.aspectRatio || "OFF", // ✅ Ambil dari style.image.aspectRatio atau fallback
      backgroundType: style?.container?.background?.type || style?.container?.backgroundType || "none", // ✅ Ambil dari style.container.background.type atau fallback
      backgroundColor: style?.container?.background?.color || style?.container?.backgroundColor || "#ffffff", // ✅ Ambil dari style.container.background.color atau fallback
      backgroundImage: style?.container?.background?.image || style?.container?.backgroundImage || "", // ✅ Ambil dari style.container.background.image atau fallback
      paddingTop: style?.image?.padding?.top || style?.container?.padding?.top || style?.image?.paddingTop || style?.container?.paddingTop || 0, // ✅ Untuk image padding
      paddingRight: style?.image?.padding?.right || style?.container?.padding?.right || style?.image?.paddingRight || style?.container?.paddingRight || 0,
      paddingBottom: style?.image?.padding?.bottom || style?.container?.padding?.bottom || style?.image?.paddingBottom || style?.container?.paddingBottom || 0,
      paddingLeft: style?.image?.padding?.left || style?.container?.padding?.left || style?.image?.paddingLeft || style?.container?.paddingLeft || 0,

      // Video data
      items: content?.items || [],
      videoWidth: style?.video?.width || style?.container?.videoWidth || 100, // ✅ Ambil dari style.video.width atau fallback
      alignment: style?.video?.alignment || style?.container?.alignment || "center", // ✅ Ambil dari style.video.alignment atau fallback
      paddingTop: style?.container?.padding?.top || style?.container?.paddingTop || 0, // ✅ Untuk video padding
      paddingRight: style?.container?.padding?.right || style?.container?.paddingRight || 0,
      paddingBottom: style?.container?.padding?.bottom || style?.container?.paddingBottom || 0,
      paddingLeft: style?.container?.padding?.left || style?.container?.paddingLeft || 0,

      // Testimoni data
      componentTitle: content?.componentTitle || config?.title || "",

      // List data
      icon: content?.icon || "CheckCircle2",
      iconColor: content?.iconColor || "#000000",
    };

    switch (type) {
      case "text": {
        const textData = blockData;

        // ✅ GENERAL: Gunakan textStylesFromBackend yang sudah di-generate otomatis dari style.text
        // Tambahkan default values untuk field yang tidak ada di backend
        const textStyles = {
          // fontSize removed - now handled by inline styles in HTML content (sama dengan addProducts3)
          lineHeight: textStylesFromBackend.lineHeight ?? textData.lineHeight ?? 1.5,
          fontFamily: textStylesFromBackend.fontFamily ?? (textData.fontFamily && textData.fontFamily !== "Page Font" ? textData.fontFamily : "Inter, sans-serif"), // ✅ Default "Inter, sans-serif" sama dengan addProducts3
          color: textStylesFromBackend.color ?? textData.textColor ?? "#000000",
          backgroundColor: textStylesFromBackend.backgroundColor ?? (textData.backgroundColor && textData.backgroundColor !== "transparent" ? textData.backgroundColor : "transparent"),
          textAlign: textStylesFromBackend.textAlign ?? textData.textAlign ?? "left", // ✅ PRIORITAS: dari backend (align) > fallback
          fontWeight: textStylesFromBackend.fontWeight ?? textData.fontWeight ?? "normal",
          fontStyle: textStylesFromBackend.fontStyle ?? textData.fontStyle ?? "normal",
          textDecoration: textStylesFromBackend.textDecoration ?? textData.textDecoration ?? "none",
          textTransform: textStylesFromBackend.textTransform ?? textData.textTransform ?? "none",
          letterSpacing: textStylesFromBackend.letterSpacing ?? (textData.letterSpacing ? `${textData.letterSpacing}px` : "0px"),
          wordSpacing: textStylesFromBackend.wordSpacing ?? (Number.isFinite(Number(textData.wordSpacing)) ? `${Number(textData.wordSpacing)}px` : "0px"),
          padding: textData.backgroundColor && textData.backgroundColor !== "transparent" ? "8px 12px" : "0",
          borderRadius: textData.backgroundColor && textData.backgroundColor !== "transparent" ? "4px" : "0",
        };

        // Determine tag based on paragraph style
        const Tag = textData.paragraphStyle === "h1" ? "h1" :
          textData.paragraphStyle === "h2" ? "h2" :
            textData.paragraphStyle === "h3" ? "h3" : "div";

        // Background dari advance settings
        let textBackgroundStyle = {};
        if (textData.bgType === "color") {
          textBackgroundStyle.backgroundColor = textData.bgColor || "#ffffff";
        } else if (textData.bgType === "image" && textData.bgImage) {
          textBackgroundStyle.backgroundImage = `url(${textData.bgImage})`;
          textBackgroundStyle.backgroundSize = "cover";
          textBackgroundStyle.backgroundPosition = "center";
        }

        // Padding dari advance settings
        const textPaddingStyle = {
          paddingTop: `${textData.paddingTop || 0}px`,
          paddingRight: `${textData.paddingRight || 0}px`,
          paddingBottom: `${textData.paddingBottom || 0}px`,
          paddingLeft: `${textData.paddingLeft || 0}px`,
        };

        // Rich text content (HTML)
        const richContent = textData.content || "<p>Teks...</p>";

        // ✅ Clean HTML content - remove inline font-family
        const cleanedContent = cleanHTMLContent(richContent);

        return (
          <Tag
            className="preview-text"
            style={{
              ...textStyles,
              ...textBackgroundStyle,
              ...textPaddingStyle,
              display: "block",
              width: "100%",
              marginTop: `${Number(textData.marginTop) || 0}px`,
              marginBottom: `${Number(textData.marginBottom) || 0}px`,
              ["--preview-text-paragraph-gap"]: `${Number(settings?.preview_text_paragraph_gap ?? 8)}px`,
            }}
            dangerouslySetInnerHTML={{ __html: cleanedContent }}
          />
        );
      }

      case "image": {
        const imageData = blockData;
        if (!imageData.src) {
          return <div className="preview-placeholder">Gambar belum diupload</div>;
        }

        // ✅ Advanced settings - SAMA PERSIS dengan renderPreview di addProducts3
        const alignment = imageData.alignment || "center";
        const imageWidth = imageData.imageWidth || 100;
        const imageFit = imageData.imageFit || "fill";
        const aspectRatio = imageData.aspectRatio || "OFF";
        const backgroundType = imageData.backgroundType || "none";
        const backgroundColor = imageData.backgroundColor || "#ffffff";
        const backgroundImage = imageData.backgroundImage || "";
        const paddingTop = imageData.paddingTop || 0; // ✅ Gunakan dari imageData (sudah diambil dari style di blockData)
        const paddingRight = imageData.paddingRight || 0;
        const paddingBottom = imageData.paddingBottom || 0;
        const paddingLeft = imageData.paddingLeft || 0;

        // Calculate aspect ratio - ketika dipilih, gambar akan di-crop sesuai ratio
        let aspectRatioStyle = {};
        if (aspectRatio !== "OFF") {
          const [width, height] = aspectRatio.split(":").map(Number);
          if (width && height) {
            aspectRatioStyle.aspectRatio = `${width} / ${height}`;
          }
        }

        // Background style
        let imageBackgroundStyle = {};
        if (backgroundType === "color") {
          imageBackgroundStyle.backgroundColor = backgroundColor;
        } else if (backgroundType === "image" && backgroundImage) {
          imageBackgroundStyle.backgroundImage = `url(${backgroundImage})`;
          imageBackgroundStyle.backgroundSize = "cover";
          imageBackgroundStyle.backgroundPosition = "center";
        }

        // ✅ Image fit style - SAMA PERSIS dengan renderPreview di addProducts3
        // Image fit style - jika aspect ratio dipilih, gunakan cover untuk crop
        // Jika aspect ratio OFF, gunakan fill atau contain sesuai pilihan
        let objectFitValue;
        if (aspectRatio !== "OFF") {
          // Ketika aspect ratio dipilih, gunakan cover untuk crop gambar
          // Cover akan memotong gambar agar mengisi frame sesuai aspect ratio
          objectFitValue = "cover";
        } else {
          // Ketika aspect ratio OFF, gunakan fill atau contain sesuai pilihan
          objectFitValue = imageFit === "fill" ? "fill" : imageFit === "fit" ? "contain" : "fill";
        }

        // Padding style
        const imagePaddingStyle = {
          paddingTop: `${paddingTop}px`,
          paddingRight: `${paddingRight}px`,
          paddingBottom: `${paddingBottom}px`,
          paddingLeft: `${paddingLeft}px`,
        };

        // ✅ Container style with alignment - SAMA PERSIS dengan renderPreview di addProducts3
        // Container ini untuk alignment (center/left/right) dan padding
        // JANGAN gunakan containerStyle dari getContainerStyles() karena akan override alignment
        const imageContainerStyle = {
          display: "flex",
          justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
          width: "100%",
          ...imagePaddingStyle,
        };

        // ✅ Image wrapper style - ukuran akan berubah sesuai aspect ratio yang dipilih
        // Wrapper ini yang diatur width-nya (50%, 100%, dll) - gambar di dalam tetap 100% dari wrapper
        // ✅ GENERAL: Tambahkan max-width untuk membatasi ukuran maksimal gambar agar tidak terlalu besar
        const imageWrapperStyle = {
          width: `${imageWidth}%`, // ✅ Width setting (50%) = width dari wrapper, bukan gambar
          maxWidth: "625px", // ✅ Batasi ukuran maksimal (900px) agar tidak terlalu besar
          ...aspectRatioStyle,
          ...imageBackgroundStyle,
          overflow: "hidden",
          borderRadius: "4px",
          position: "relative",
        };

        // Ketika aspect ratio dipilih, wrapper akan otomatis memiliki tinggi sesuai ratio
        // CSS aspect-ratio akan menghitung tinggi berdasarkan lebar dan ratio

        // ✅ OPTIMASI: Tentukan apakah ini gambar pertama (hero image) untuk priority loading
        // Cek apakah ini block pertama dengan type image untuk prioritas LCP
        const firstImageBlockIndex = allBlocks.findIndex(b => b && b.type === 'image' && !b.parentId);
        const currentBlockIndex = allBlocks.findIndex(b => b === block);
        const isHeroImage = firstImageBlockIndex !== -1 && firstImageBlockIndex === currentBlockIndex;

        return (
          <div style={imageContainerStyle}>
            <div style={imageWrapperStyle}>
              <Image
                src={buildImageUrl(imageData.src, true)}
                alt={imageData.alt || ""}
                width={625}
                height={625}
                priority={isHeroImage}
                loading={isHeroImage ? "eager" : "lazy"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: objectFitValue,
                  objectPosition: "center",
                  display: "block",
                }}
                unoptimized={true}
              />
            </div>
            {imageData.caption && <p className="preview-caption">{imageData.caption}</p>}
          </div>
        );
      }

      case "youtube":
      case "video": {
        const videoItems = content?.items || [];
        if (videoItems.length === 0) {
          return <div className="preview-placeholder">Belum ada video</div>;
        }

        // ✅ Advanced settings untuk video - SAMA PERSIS dengan renderPreview di addProducts3
        const videoData = blockData || {};
        const videoAlignment = videoData.alignment || "center"; // ✅ Gunakan dari blockData
        const videoWidth = videoData.videoWidth !== undefined ? videoData.videoWidth : 100; // Default 100% jika belum di-set
        const videoPaddingTop = videoData.paddingTop || 0;
        const videoPaddingRight = videoData.paddingRight || 0;
        const videoPaddingBottom = videoData.paddingBottom || 0;
        const videoPaddingLeft = videoData.paddingLeft || 0;

        // Container style dengan alignment dan padding
        const videoContainerStyle = {
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          alignItems: "center",
          width: "100%",
          paddingTop: `${videoPaddingTop}px`,
          paddingRight: `${videoPaddingRight}px`,
          paddingBottom: `${videoPaddingBottom}px`,
          paddingLeft: `${videoPaddingLeft}px`,
        };

        // ✅ Video wrapper style - SAMA PERSIS dengan renderPreview di addProducts3
        const videoWrapperStyle = {
          width: `${videoWidth}%`,
          maxWidth: "100%", // ✅ Pastikan tidak melebihi container
          aspectRatio: "16 / 9",
          position: "relative",
          overflow: "hidden",
          borderRadius: "8px", // ✅ SAMA dengan addProducts3 (8px)
          display: "flex",
          justifyContent: videoAlignment === "left" ? "flex-start" : videoAlignment === "right" ? "flex-end" : "center",
        };

        return (
          <div className="preview-videos" style={videoContainerStyle}>
            {videoItems.map((item, i) => (
              item.embedUrl || (item.url ? convertToEmbedUrl(item.url) : null) ? (
                <div key={i} className="preview-video-wrapper" style={videoWrapperStyle}>
                  <iframe
                    src={item.embedUrl || convertToEmbedUrl(item.url)}
                    title={`Video ${i + 1}`}
                    className="preview-video-iframe"
                    allowFullScreen
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px" // ✅ SAMA dengan addProducts3
                    }}
                  />
                </div>
              ) : null
            ))}
          </div>
        );
      }

      case "testimoni": {
        // ✅ SAMA PERSIS dengan renderPreview di addProducts3
        const testimoniItems = content?.items || [];
        if (testimoniItems.length === 0) {
          return <div className="preview-placeholder">Belum ada testimoni</div>;
        }

        // ✅ Gunakan config.componentId atau block.order untuk key testimoniIndices
        const testimoniKey = config?.componentId || block.order;
        const currentIndex = testimoniIndices[testimoniKey] || 0;
        const maxIndex = Math.max(0, testimoniItems.length - 3);

        const handlePrev = () => {
          setTestimoniIndices(prev => ({
            ...prev,
            [testimoniKey]: Math.max(0, currentIndex - 1)
          }));
        };

        const handleNext = () => {
          setTestimoniIndices(prev => ({
            ...prev,
            [testimoniKey]: Math.min(maxIndex, currentIndex + 1)
          }));
        };

        const testimoniTitle = content?.componentTitle || config?.title || "";

        return (
          <section className="preview-testimonials" aria-label="Customer testimonials">
            <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#000000",
              marginBottom: "20px",
              textAlign: "left"
            }}>{testimoniTitle}</h2>
            <div className="testimonials-carousel-wrapper-new">
              {currentIndex > 0 && (
                <button
                  className="testimoni-nav-btn-new testimoni-nav-prev-new"
                  onClick={handlePrev}
                  aria-label="Previous testimonials"
                >
                  ‹
                </button>
              )}
              <div className="testimonials-carousel-new" itemScope itemType="https://schema.org/Review">
                <div
                  className="testimonials-track-new"
                  style={{ transform: `translateX(-${currentIndex * 32}%)` }}
                >
                  {testimoniItems.map((item, i) => {
                    return (
                      <article key={i} className="testi-card-new" itemScope itemType="https://schema.org/Review">
                        <div className="testi-header-new">
                          {item.gambar ? (
                            <div className="testi-avatar-wrapper-new">
                              <Image
                                src={buildImageUrl(item.gambar, true)}
                                alt={`Foto ${item.nama}`}
                                width={48}
                                height={48}
                                className="testi-avatar-new"
                                itemProp="author"
                                loading="lazy"
                                style={{ objectFit: 'cover', borderRadius: '50%' }}
                                unoptimized={true}
                              />
                            </div>
                          ) : (
                            <div className="testi-avatar-wrapper-new">
                              <div className="testi-avatar-placeholder-new">
                                {item.nama?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                            </div>
                          )}
                          <div className="testi-info-new">
                            <div className="testi-name-new" itemProp="author" itemScope itemType="https://schema.org/Person">
                              <span itemProp="name">{item.nama || "Nama"}</span>
                              {item.jabatan && (
                                <div className="testi-job-new" style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                  {item.jabatan}
                                </div>
                              )}
                            </div>
                            {item.showRating !== false && (
                              <div className="testi-stars-new">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className="star-new"
                                    style={{
                                      color: star <= (item.rating || 5) ? "#fbbf24" : "#d1d5db"
                                    }}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="testi-desc-new"
                          itemProp="reviewBody"
                          dangerouslySetInnerHTML={{
                            __html: cleanHTMLContent(item.isiTestimony || item.deskripsi || "<p>Deskripsi testimoni</p>")
                          }}
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
              {currentIndex < maxIndex && testimoniItems.length > 3 && (
                <button
                  className="testimoni-nav-btn-new testimoni-nav-next-new"
                  onClick={handleNext}
                  aria-label="Next testimonials"
                >
                  ›
                </button>
              )}
            </div>
          </section>
        );
      }

      case "list": {
        // ✅ SAMA PERSIS dengan renderPreview di addProducts3
        const listItems = content?.items || [];

        // Icon mapping
        const iconMap = {
          CheckCircle2, Circle, Minus, ArrowRight, ArrowRightCircle,
          ArrowLeft: ArrowLeftIcon, ArrowLeftRight, ChevronRight, CheckSquare, ShieldCheck,
          Lock, Dot, Target, Link: LinkIcon, PlusCircle, MinusCircle,
          Check, Star, Heart, ThumbsUp, Award, Zap, Flame, Sparkles,
          ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle, PlayCircle,
          PauseCircle, StopCircle, Radio, Square, Hexagon, Triangle,
          AlertCircle, Info, HelpCircle: HelpCircleIcon, Ban, Shield, Key, Unlock,
          MapPin, Calendar: CalendarIcon, Clock
        };

        const listTitle = content?.title || content?.componentTitle || config?.title || "";
        const listData = {
          paddingTop: style?.container?.padding?.top || style?.container?.paddingTop || 0,
          paddingRight: style?.container?.padding?.right || style?.container?.paddingRight || 0,
          paddingBottom: style?.container?.padding?.bottom || style?.container?.paddingBottom || 0,
          paddingLeft: style?.container?.padding?.left || style?.container?.paddingLeft || 0,
          bgType: style?.container?.background?.type || style?.container?.bgType || "none",
          bgColor: style?.container?.background?.color || style?.container?.bgColor || "#ffffff",
          bgImage: style?.container?.background?.image || style?.container?.bgImage || "",
        };

        // ✅ Build styles from advance settings - SAMA dengan addProducts3
        const listStyles = {
          paddingTop: `${listData.paddingTop || 0}px`,
          paddingRight: `${listData.paddingRight || 0}px`,
          paddingBottom: `${listData.paddingBottom || 0}px`,
          paddingLeft: `${listData.paddingLeft || 0}px`,
        };

        // ✅ Background dari advance settings - SAMA dengan addProducts3
        let listBackgroundStyle = {};
        if (listData.bgType === "color") {
          listBackgroundStyle.backgroundColor = listData.bgColor || "#ffffff";
        } else if (listData.bgType === "image" && listData.bgImage) {
          listBackgroundStyle.backgroundImage = `url(${listData.bgImage})`;
          listBackgroundStyle.backgroundSize = "cover";
          listBackgroundStyle.backgroundPosition = "center";
        }

        return (
          <div
            className="preview-list-wrapper"
            style={{
              ...listStyles,
              ...listBackgroundStyle,
            }}
          >
            {listTitle && (
              <div className="preview-list-header">
                <h3 className="preview-list-title" style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: content?.titleColor || config?.titleColor || "#000000",
                  margin: "0 0 8px 0"
                }}>{listTitle}</h3>
                <div className="preview-list-header-line"></div>
              </div>
            )}
            {listItems.length === 0 ? (
              <div className="preview-placeholder">Belum ada list point</div>
            ) : (
              <ul className="preview-list">
                {listItems.map((item, i) => {
                  const iconName = item.icon || "CheckCircle2";
                  const iconColor = item.iconColor || "#000000";
                  const content = item.content || item.nama || `Point ${i + 1}`;
                  const IconComponent = iconMap[iconName] || CheckCircle2;

                  return (
                    <li key={i} className="preview-list-item">
                      <span className="preview-list-icon" style={{ color: iconColor }}>
                        <IconComponent size={20} strokeWidth={2} />
                      </span>
                      <div className="preview-list-content" dangerouslySetInnerHTML={{ __html: cleanHTMLContent(content || `<p>Point ${i + 1}</p>`) }} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      }

      case "faq": {
        const kategoriId = getKategoriId();
        const faqItems = getFAQByKategori(kategoriId);

        // Build container style from block.style.container
        const blockStyle = style?.container || {};
        const containerStyle = {
          paddingTop: blockStyle.padding?.top || blockStyle.paddingTop || 0,
          paddingRight: blockStyle.padding?.right || blockStyle.paddingRight || 0,
          paddingBottom: blockStyle.padding?.bottom || blockStyle.paddingBottom || 0,
          paddingLeft: blockStyle.padding?.left || blockStyle.paddingLeft || 0,
          marginTop: blockStyle.margin?.top || blockStyle.marginTop || 0,
          marginRight: blockStyle.margin?.right || blockStyle.marginRight || 0,
          marginBottom: blockStyle.margin?.bottom || blockStyle.marginBottom || 0,
          marginLeft: blockStyle.margin?.left || blockStyle.marginLeft || 0,
          backgroundColor: blockStyle.backgroundColor || blockStyle.bgColor || 'transparent',
          backgroundImage: blockStyle.backgroundImage ? `url(${blockStyle.backgroundImage})` : 'none',
          border: blockStyle.border || 'none',
          borderRadius: blockStyle.borderRadius || 0,
          boxShadow: blockStyle.boxShadow || 'none',
        };

        return (
          <div key={block.order} className="canvas-preview-block" style={containerStyle}>
            <section className="preview-faq-section" aria-label="Frequently Asked Questions">
              <h2 className="faq-title">Pertanyaan yang Sering Diajukan</h2>
              <div className="faq-container">
                {faqItems.map((faq, index) => (
                  <FAQItem
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </section>
          </div>
        );
      }

      case "form": {
        const kategoriId = getKategoriId();
        const isFormBuku = kategoriId === 4; // Kategori Buku (4)

        // Helper untuk mendapatkan nama dari ID
        const getProvinceName = (id) => {
          const province = wilayahData.provinces.find((p) => String(p.id) === String(id));
          return province?.name || "";
        };

        const getCityName = (id) => {
          const city = wilayahData.cities.find((c) => String(c.id) === String(id));
          return city?.name || "";
        };

        const getDistrictName = (id) => {
          const district = wilayahData.districts.find(
            (d) => String(d.district_id) === String(id) || String(d.id) === String(id)
          );
          return district?.name || "";
        };

        // Parse bundling dari productData (bundling disimpan di productData, bukan di settings)
        const bundlingData = productData?.bundling && Array.isArray(productData.bundling) ? productData.bundling : [];
        // ✅ FIX: Cek bundling array, bukan hanya isBundling flag
        const isBundling = bundlingData && bundlingData.length > 0;

        return (
          <div id="form-pemesanan" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            {/* ✅ Card besar yang merangkum semua form */}
            <div className="form-outer-card" style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb"
            }}>
              {/* ✅ Section: Bundling/Pilihan Paket (jika ada) */}
              {isBundling && bundlingData && bundlingData.length > 0 && (
                <section style={{ marginBottom: "24px" }}>
                  <h2 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#000000",
                    marginBottom: "8px",
                    lineHeight: "1.4"
                  }}>
                    {productData?.nama || "Produk"}
                  </h2>
                  <p style={{
                    fontSize: "18px",
                    color: "#000000",
                    marginBottom: "12px",
                    fontWeight: "600"
                  }}>
                    Pilihan Paket
                  </p>
                  {selectedBundling === null && (
                    <div style={{
                      backgroundColor: "#fff7ed",
                      color: "#c2410c",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                      border: "1px solid #ffedd5"
                    }}>
                      <Info size={16} />
                      Silakan pilih paket produk terlebih dahulu
                    </div>
                  )}
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}>
                    {bundlingData.map((item, index) => {
                      const isSelected = selectedBundling === index;
                      const formatHarga = (harga) => {
                        if (!harga || harga === 0) return "0";
                        return harga.toLocaleString("id-ID");
                      };

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleBundlingSelect(index)}
                          style={{
                            flex: "1 1 calc(33.333% - 8px)",
                            minWidth: "200px",
                            padding: "16px 20px",
                            borderRadius: "10px",
                            border: isSelected ? "2px solid #F1A124" : "1px solid #e5e7eb",
                            backgroundColor: isSelected ? "#F1A124" : "#ffffff",
                            color: isSelected ? "#ffffff" : "#374151",
                            fontSize: "15px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textAlign: "center",
                            boxShadow: isSelected ? "0 4px 12px rgba(241, 161, 36, 0.3)" : "0 1px 3px rgba(0, 0, 0, 0.1)",
                            outline: "none"
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                              e.currentTarget.style.borderColor = "#d1d5db";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "#ffffff";
                              e.currentTarget.style.borderColor = "#e5e7eb";
                            }
                          }}
                        >
                          {item.nama || `Paket ${index + 1}`}
                          {item.harga && (
                            <span style={{
                              display: "block",
                              marginTop: "4px",
                              fontSize: "14px",
                              fontWeight: "600",
                              opacity: isSelected ? "1" : "0.8"
                            }}>
                              Rp {formatHarga(item.harga)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Section: Lengkapi Data */}
              <section className="preview-form-section compact-form-section" aria-label="Order form" style={{ marginBottom: "24px" }}>
                {/* <h2 className="compact-form-title" style={{ fontSize: "18px", fontWeight: "600", color: "#000000", marginBottom: "16px" }}>
                  Lengkapi Data:
                </h2> */}
                <div className="compact-form-card">


                  <div className="compact-field">
                    {/* <label className="compact-label">Nama Lengkap <span className="required">*</span></label> */}
                    <input
                      type="text"
                      placeholder="Nama Lengkap"
                      className="compact-input"
                      value={customerForm.nama}
                      onChange={(e) => setCustomerForm({ ...customerForm, nama: e.target.value })}
                    />
                  </div>
                  <div className="compact-field">
                    {/* <label className="compact-label">No. WhatsApp <span className="required">*</span></label> */}
                    <div className="wa-input-wrapper">
                      <div className="wa-prefix">
                        <span className="flag">🇮🇩</span>
                        <span className="code">+62</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="No. WA Aktif"
                        className="compact-input wa-input"
                        value={customerForm.wa.replace(/^(\+62|62|0)/, '')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCustomerForm({ ...customerForm, wa: '62' + val });
                        }}
                      />
                    </div>
                    {customerForm.wa && customerForm.wa.length > 2 && customerForm.wa.length < 12 && (
                      <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                        Nomor WhatsApp minimal 10 digit (saat ini: {customerForm.wa.length - 2} digit)
                      </p>
                    )}
                  </div>
                  <div className="compact-field">
                    {/* <label className="compact-label">Email <span className="required">*</span></label> */}
                    <input
                      type="email"
                      placeholder="Email"
                      className="compact-input"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      required
                    />
                    {customerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email) && (
                      <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                        Gunakan format email yang valid (contoh: nama@email.com)
                      </p>
                    )}
                  </div>

                  {/* ✅ LOGIC PEMISAHAN FORM: FISIK vs NON-FISIK */}
                  {isKategoriBuku() ? (
                    /* === FORM PRODUK FISIK (LENGKAP: PROV -> KOTA -> KEC -> KODEPOS) === */
                    <>
                      <div className="compact-field">
                        {/* <label className="compact-label">Detail Alamat <span className="required">*</span></label> */}
                        <textarea
                          placeholder="Detail Alamat *"
                          className="compact-input"
                          rows={3}
                          value={customerForm.alamat}
                          onChange={(e) => setCustomerForm({ ...customerForm, alamat: e.target.value })}
                          style={{ resize: 'vertical' }}
                        />
                      </div>

                      <div className="compact-field">
                        {/* <label className="compact-label">Provinsi <span className="required">*</span></label> */}
                        <select
                          className="compact-input"
                          value={selectedWilayahIds.provinceId}
                          onChange={(e) => {
                            const provinceId = e.target.value;
                            setSelectedWilayahIds({ provinceId, cityId: "", districtId: "" });
                            const provinceName = getProvinceName(provinceId);
                            setFormWilayah(prev => ({ ...prev, provinsi: provinceName, kabupaten: "", kecamatan: "", kode_pos: "" }));
                          }}
                          disabled={loadingWilayah.provinces}
                          style={{
                            appearance: 'auto',
                            cursor: loadingWilayah.provinces ? 'not-allowed' : 'pointer',
                            backgroundColor: loadingWilayah.provinces ? '#f9fafb' : 'white'
                          }}
                        >
                          <option value="">Pilih Provinsi</option>
                          {wilayahData.provinces.map((province) => (
                            <option key={province.id} value={province.id}>
                              {province.name}
                            </option>
                          ))}
                        </select>
                        {loadingWilayah.provinces && (
                          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                            Memuat provinsi...
                          </small>
                        )}
                      </div>

                      <div className="compact-field">
                        {/* <label className="compact-label">Kabupaten/Kota <span className="required">*</span></label> */}
                        <select
                          className="compact-input"
                          value={selectedWilayahIds.cityId}
                          onChange={(e) => {
                            const cityId = e.target.value;
                            setSelectedWilayahIds(prev => ({ ...prev, cityId, districtId: "" }));
                            const cityName = getCityName(cityId);
                            setFormWilayah(prev => ({ ...prev, kabupaten: cityName, kecamatan: "", kode_pos: "" }));
                          }}
                          disabled={!selectedWilayahIds.provinceId || loadingWilayah.cities}
                          style={{
                            appearance: 'auto',
                            cursor: (!selectedWilayahIds.provinceId || loadingWilayah.cities) ? 'not-allowed' : 'pointer',
                            backgroundColor: (!selectedWilayahIds.provinceId || loadingWilayah.cities) ? '#f9fafb' : 'white'
                          }}
                        >
                          <option value="">Pilih Kabupaten/Kota</option>
                          {wilayahData.cities.map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                        {loadingWilayah.cities && (
                          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                            Memuat kabupaten/kota...
                          </small>
                        )}
                      </div>

                      <div className="compact-field" style={{ position: 'relative' }}>
                        {/* <label className="compact-label">Kecamatan <span className="required">*</span></label> */}
                        <select
                          className="compact-input"
                          value={selectedWilayahIds.districtId}
                          onChange={(e) => {
                            const districtId = e.target.value;
                            setSelectedWilayahIds(prev => ({ ...prev, districtId }));
                            const districtName = getDistrictName(districtId);
                            setFormWilayah(prev => ({ ...prev, kecamatan: districtName }));
                          }}
                          disabled={!selectedWilayahIds.cityId || loadingWilayah.districts}
                          style={{
                            appearance: 'auto',
                            cursor: (!selectedWilayahIds.cityId || loadingWilayah.districts) ? 'not-allowed' : 'pointer',
                            backgroundColor: (!selectedWilayahIds.cityId || loadingWilayah.districts) ? '#f9fafb' : 'white'
                          }}
                        >
                          <option value="">Pilih Kecamatan</option>
                          {wilayahData.districts.map((district) => (
                            <option key={district.district_id || district.id} value={district.district_id || district.id}>
                              {district.name}
                            </option>
                          ))}
                        </select>
                        {loadingWilayah.districts && (
                          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                            Memuat kecamatan...
                          </small>
                        )}
                      </div>

                      <div className="compact-field">
                        {/* <label className="compact-label">Kode Pos <span className="required">*</span></label> */}
                        <input
                          type="text"
                          placeholder="Kode Pos *"
                          className="compact-input"
                          value={formWilayah.kode_pos}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormWilayah(prev => ({ ...prev, kode_pos: val }));
                          }}
                          disabled={!selectedWilayahIds.districtId}
                          style={{
                            cursor: !selectedWilayahIds.districtId ? 'not-allowed' : 'text',
                            backgroundColor: !selectedWilayahIds.districtId ? '#f9fafb' : 'white'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    /* === FORM PRODUK NON-FISIK (HANYA SEARCH KECAMATAN) - UPGRADED DESIGN === */
                    <div className="compact-field" style={{ position: 'relative', zIndex: 40 }}>
                      {/* <label className="compact-label">Kecamatan <span className="required">*</span></label> */}
                      <div className="search-input-wrapper" style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="compact-input"
                          placeholder="Ketik nama kecamatan *"
                          value={districtSearchTerm}
                          onChange={(e) => {
                            handleDistrictSearch(e.target.value);
                          }}
                          onFocus={() => {
                            if (districtSearchTerm.length >= 3) setShowDistrictResults(true);
                          }}
                          onBlur={() => {
                            // Delay hide agar click event pada result bisa tertangkap
                            setTimeout(() => setShowDistrictResults(false), 200);
                          }}
                          style={{ paddingRight: '40px' }} // Space for spinner
                          autoComplete="off"
                        />

                        {/* Loading Spinner */}
                        {loadingDistrictSearch && (
                          <div style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                          }}>
                            <div className="animate-spin" style={{
                              width: '18px',
                              height: '18px',
                              border: '2px solid #e5e7eb',
                              borderTopColor: '#3b82f6',
                              borderRadius: '50%'
                            }} />
                          </div>
                        )}
                      </div>

                      {/* Search Results Dropdown */}
                      {showDistrictResults && districtSearchResults.length > 0 && (
                        <div className="district-search-results" style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          maxHeight: '280px',
                          overflowY: 'auto',
                          zIndex: 100,
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                        }}>
                          {districtSearchResults.map((item, idx) => {
                            const key = item.id != null && String(item.id)
                              ? String(item.id)
                              : item.kode
                                ? `${item.kode.id_provinsi}-${item.kode.id_kota}-${item.kode.id_kecamatan}`
                                : `idx-${idx}`;

                            return (
                              <div
                                key={key}
                                onClick={() => {
                                  // Set Display Value
                                  setDistrictSearchTerm(item.kecamatan);

                                  // Set Form Values
                                  setFormWilayah(prev => ({
                                    ...prev,
                                    provinsi: item.provinsi,
                                    kabupaten: item.kota,
                                    kecamatan: item.kecamatan,
                                    kode_pos: ""
                                  }));

                                  setShowDistrictResults(false);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  transition: 'background-color 0.2s',
                                  backgroundColor: 'white'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                              >
                                <div style={{
                                  color: '#9ca3af',
                                  marginTop: '2px',
                                  flexShrink: 0
                                }}>
                                  <MapPin size={18} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    fontSize: '14px',
                                    lineHeight: '1.4'
                                  }}>
                                    {item.kecamatan}
                                  </span>
                                  <span style={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    marginTop: '2px',
                                    lineHeight: '1.4'
                                  }}>
                                    {item.kota}, {item.provinsi}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Not Found State */}
                      {showDistrictResults && districtSearchResults.length === 0 && districtSearchTerm.length >= 3 && !loadingDistrictSearch && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '24px',
                          textAlign: 'center',
                          zIndex: 100,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ color: '#9ca3af', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                            <MapPin size={24} strokeWidth={1.5} />
                          </div>
                          <p style={{ fontWeight: '500', color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                            Kecamatan tidak ditemukan
                          </p>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>
                            Coba periksa kembali ejaan nama kecamatan Anda
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ✅ Bagian Ongkir dengan Kurir (hanya untuk produk fisik) */}
                  {isKategoriBuku() && (
                    <div className="compact-field">
                      <label className="compact-label">Layanan Pengiriman <span className="required">*</span></label>
                      {loadingCost ? (
                        <div className="compact-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f9fafb' }}>
                          <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>Menghitung ongkir...</span>
                        </div>
                      ) : costResults.length > 0 ? (
                        <div className="compact-input" style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #22c55e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>JNE REG</span>
                          <span style={{ fontSize: '13px', color: '#374151' }}>—</span>
                          <span style={{ fontSize: '13px', color: '#374151' }}>Rp {formatPrice(ongkir)}</span>
                          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>{costResults[0]?.etd || "Estimasi 2-7 hari"}</span>
                        </div>
                      ) : (
                        <div className="compact-input" style={{ backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '13px' }}>
                          {!selectedWilayahIds.districtId ? "Lengkapi alamat untuk cek ongkir" : "Tidak ada layanan pengiriman tersedia"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Rincian Pesanan */}
              {/* <section className="preview-form-section rincian-pesanan-section" aria-label="Rincian Pesanan" style={{ marginBottom: "24px" }}>
                <div className="rincian-pesanan-card">
                  <h3 className="rincian-pesanan-title">RINCIAN PESANAN:</h3>
                  <div className="rincian-pesanan-item">
                    <div className="rincian-pesanan-detail">
                      <div className="rincian-pesanan-name">{productData?.nama || "Nama Produk"}</div>
                    </div>
                    <div className="rincian-pesanan-price">
                      Rp {formatPrice(basePrice)}
                    </div>
                  </div>
                  {isKategoriBuku() && ongkir > 0 && (
                    <div className="rincian-pesanan-item">
                      <div className="rincian-pesanan-detail">
                        <div className="rincian-pesanan-name">Ongkos Kirim</div>
                      </div>
                      <div className="rincian-pesanan-price">Rp {formatPrice(ongkir)}</div>
                    </div>
                  )}
                  <div className="rincian-pesanan-divider"></div>
                  <div className="rincian-pesanan-total">
                    <span className="rincian-pesanan-total-label">Total</span>
                    <span className="rincian-pesanan-total-price">
                      Rp {formatPrice(calculateTotal)}
                    </span>
                  </div>
                </div>
              </section> */}

              {/* Section: Metode Pembayaran */}
              {/* <section className="preview-payment-section payment-section" aria-label="Payment methods" style={{ marginBottom: "24px" }}>
                <h2 className="payment-title" style={{ fontSize: "18px", fontWeight: "600", color: "#000000", marginBottom: "16px" }}>
                  Metode Pembayaran
                </h2>
                <div className="payment-options-vertical">
                  {(settings?.payment_methods?.manual ?? true) && (
                    <label className="payment-option-row">
                      <input
                        type="radio"
                        name="payment"
                        value="manual"
                        checked={paymentMethod === "manual"}
                        onChange={(e) => handlePaymentMethodChange(e.target.value)}
                      />
                      <span className="payment-label">Bank Transfer (Manual)</span>
                      <div className="payment-icons-inline">
                        <Image className="pay-icon" src="/assets/bca.png" alt="BCA" width={32} height={32} loading="lazy" />
                      </div>
                    </label>
                  )}
                  {(settings?.payment_methods?.ewallet ?? true) && (
                    <label className="payment-option-row">
                      <input
                        type="radio"
                        name="payment"
                        value="ewallet"
                        checked={paymentMethod === "ewallet"}
                        onChange={(e) => handlePaymentMethodChange(e.target.value)}
                      />
                      <span className="payment-label">E-Payment</span>
                      <div className="payment-icons-inline">
                        <Image className="pay-icon" src="/assets/qris.svg" alt="QRIS" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/dana.png" alt="DANA" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/ovo.png" alt="OVO" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/link.png" alt="LinkAja" width={32} height={32} loading="lazy" />
                      </div>
                    </label>
                  )}
                  {(settings?.payment_methods?.cc ?? true) && (
                    <label className="payment-option-row">
                      <input
                        type="radio"
                        name="payment"
                        value="cc"
                        checked={paymentMethod === "cc"}
                        onChange={(e) => handlePaymentMethodChange(e.target.value)}
                      />
                      <span className="payment-label">Credit / Debit Card</span>
                      <div className="payment-icons-inline">
                        <Image className="pay-icon" src="/assets/visa.svg" alt="Visa" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/master.png" alt="Mastercard" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/jcb.png" alt="JCB" width={32} height={32} loading="lazy" />
                      </div>
                    </label>
                  )}
                  {(settings?.payment_methods?.va ?? true) && (
                    <label className="payment-option-row">
                      <input
                        type="radio"
                        name="payment"
                        value="va"
                        checked={paymentMethod === "va"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <span className="payment-label">Virtual Account</span>
                      <div className="payment-icons-inline">
                        <Image className="pay-icon" src="/assets/bca.png" alt="BCA" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/mandiri.png" alt="Mandiri" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/bni.png" alt="BNI" width={32} height={32} loading="lazy" />
                        <Image className="pay-icon" src="/assets/permata.svg" alt="Permata" width={32} height={32} loading="lazy" />
                      </div>
                    </label>
                  )}
                </div>
              </section> */}

              {/* Submit Button */}
              <div className="preview-form-submit-wrapper">
                <button
                  type="button"
                  className="preview-form-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting || !!isFormValid(isKategoriBuku(), isBundling)}
                  style={{
                    backgroundColor: (!!isFormValid(isKategoriBuku(), isBundling)) ? '#cbd5e1' : '#F1A124',
                    color: (!!isFormValid(isKategoriBuku(), isBundling)) ? '#64748b' : '#ffffff',
                    cursor: (!!isFormValid(isKategoriBuku(), isBundling)) ? 'not-allowed' : 'pointer',
                    boxShadow: (!!isFormValid(isKategoriBuku(), isBundling)) ? 'none' : '0 4px 14px rgba(241, 161, 36, 0.4)',
                    opacity: submitting ? 0.8 : 1,
                    width: '100%'
                  }}
                >
                  {submitting ? "Memproses..." : (isBundling && selectedBundling === null ? "Pilih Paket Dahulu" : "Pesan Sekarang")}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case "price": {
        const harga = productData?.harga || 0;
        const hargaAsli = productData?.harga_asli || productData?.harga_coret || 0;

        return (
          <div>
            <section className="preview-price-section special-offer-card" aria-label="Special offer" itemScope itemType="https://schema.org/Offer">
              <h2 className="special-offer-title">Special Offer!</h2>
              <div className="special-offer-price">
                {hargaAsli > 0 && hargaAsli > harga && (
                  <span className="price-old" aria-label="Harga lama">
                    Rp {formatPrice(hargaAsli)}
                  </span>
                )}
                <span className="price-new" itemProp="price" content={harga}>
                  Rp {formatPrice(harga)}
                </span>
              </div>
              <meta itemProp="priceCurrency" content="IDR" />
              <meta itemProp="availability" content="https://schema.org/InStock" />
            </section>
          </div>
        );
      }

      case "countdown": {
        // ✅ GENERAL: Styling sesuai gambar pertama - dark grey boxes dengan white numbers
        // Background kotak dan warna angka bisa di-setting dari form (style.container.background.color dan style.text.color)
        const countdownData = content || {};
        const countdownStyle = {
          // ✅ Warna angka: dari style.text.color atau countdownData.textColor, default white (#ffffff)
          textColor: style?.text?.color || countdownData.textColor || "#ffffff",
          // ✅ Background kotak: dari style.container.background.color atau countdownData.bgColor, default dark grey (#374151)
          bgColor: style?.container?.background?.color || countdownData.bgColor || "#374151",
        };

        return (
          <CountdownComponent
            data={{
              ...countdownData,
              textColor: countdownStyle.textColor,
              bgColor: countdownStyle.bgColor
            }}
            componentId={config?.componentId}
            containerStyle={containerStyle}
          />
        );
      }

      case "button": {
        const c = content || {};
        const sb = style?.button || {};
        const brFromStyle =
          typeof sb.borderRadius === "string"
            ? parseInt(String(sb.borderRadius).replace(/px/i, ""), 10)
            : Number(sb.borderRadius);
        const merged = {
          text: c.text ?? sb.text ?? "Klik Disini",
          link: c.link ?? sb.link ?? "#",
          fbPixelEvent: c.fbPixelEvent || "",
          style: c.style ?? sb.style ?? "primary",
          sizePreset: c.sizePreset ?? sb.sizePreset ?? "default",
          fontSize: c.fontSize != null ? Number(c.fontSize) : sb.fontSize != null ? Number(sb.fontSize) : null,
          paddingX:
            c.paddingX != null
              ? Number(c.paddingX)
              : sb.padding?.right != null
                ? Number(sb.padding.right)
                : null,
          paddingY:
            c.paddingY != null
              ? Number(c.paddingY)
              : sb.padding?.top != null
                ? Number(sb.padding.top)
                : null,
          backgroundColor: c.backgroundColor ?? sb.backgroundColor ?? "",
          textColor: c.textColor ?? sb.textColor ?? "",
          borderRadius:
            c.borderRadius != null && c.borderRadius !== ""
              ? Number(c.borderRadius)
              : Number.isFinite(brFromStyle)
                ? brFromStyle
                : null,
          fullWidth: Boolean(c.fullWidth ?? sb.fullWidth),
          fixedBottom: Boolean(c.fixedBottom ?? sb.fixedBottom),
        };

        const preset = merged.style || "primary";
        const btnInline = buildLandingButtonInlineStyle(merged);

        const isAnchor = merged.link && merged.link.startsWith('#');

        const handleClick = (e) => {
          if (merged.fbPixelEvent && merged.fbPixelEvent !== "") {
            trackFacebookEvent(merged.fbPixelEvent, {
              content_name: productData?.name || '',
              content_ids: [productData?.id || ''],
              content_type: 'product',
              value: productData?.harga || 0,
              currency: 'IDR'
            });
          }

          if (isAnchor) {
            e.preventDefault();
            const targetId = merged.link.substring(1);
            const element = document.getElementById(targetId);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          } else if (merged.link && merged.link !== '#') {
            window.open(merged.link, '_blank');
          }
        };

        const buttonElement = (
          <button
            type="button"
            className={`preview-button preview-button-${preset}`}
            style={btnInline}
            onClick={handleClick}
          >
            {merged.text || "Klik Disini"}
          </button>
        );

        if (merged.fixedBottom) {
          return (
            <ClientPortal>
              <div
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 99999,
                  width: '100%',
                  maxWidth: '668px',
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  className={`preview-button preview-button-${preset}`}
                  style={{ ...btnInline, borderRadius: 0, width: '100%', margin: 0 }}
                  onClick={handleClick}
                >
                  {merged.text || "Klik Disini"}
                </button>
              </div>
            </ClientPortal>
          );
        }

        return (
          <div
            style={{
              ...containerStyle,
              width: "100%",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {buttonElement}
          </div>
        );
      }

      case "html": {
        // ✅ SAMA PERSIS dengan renderPreview di addProducts3
        const htmlCode = content?.code || content || "";

        // ✅ Clean HTML content - remove inline font-family
        const cleanedHtmlCode = cleanHTMLContent(htmlCode);

        return (
          <div style={containerStyle} dangerouslySetInnerHTML={{ __html: cleanedHtmlCode }} />
        );
      }

      case "embed": {
        // ✅ SAMA PERSIS dengan renderPreview di addProducts3
        const embedCode = content?.code || content || "";

        // ✅ Clean HTML content - remove inline font-family
        const cleanedEmbedCode = cleanHTMLContent(embedCode);

        // ✅ Tambahkan maxWidth 625px untuk embed youtube agar tidak terlalu lebar
        const embedContainerStyle = {
          ...containerStyle,
          maxWidth: "625px",
          width: "100%",
          margin: "0 auto"
        };

        return (
          <div style={embedContainerStyle} dangerouslySetInnerHTML={{ __html: cleanedEmbedCode }} />
        );
      }

      case "image-slider": {
        // ✅ SAMA PERSIS dengan renderPreview di addProducts3
        const sliderData = content || {};

        // Adaptasi dari content/style/config ke format yang diharapkan ImageSliderPreview
        // ✅ Mapping autoplay dan interval dari backend ke autoslide dan autoslideDuration
        const adaptedData = {
          images: sliderData.images || sliderData.items || [],
          sliderType: sliderData.sliderType || "gallery",
          autoslide: sliderData.autoplay !== undefined ? sliderData.autoplay : (sliderData.autoslide || false),
          autoslideDuration: sliderData.interval !== undefined ? sliderData.interval : (sliderData.autoslideDuration || 5),
          showCaption: sliderData.showCaption || false,
          showDots: sliderData.showDots !== undefined ? sliderData.showDots : true,
          showArrows: sliderData.showArrows !== undefined ? sliderData.showArrows : true,
          alignment: style?.image?.alignment || style?.container?.alignment || "center",
          imageWidth: style?.image?.width || style?.container?.imageWidth || 100,
          imageFit: style?.image?.fit || style?.container?.imageFit || "fill",
          aspectRatio: style?.image?.aspectRatio || style?.container?.aspectRatio || "OFF",
          backgroundType: style?.container?.background?.type || "none",
          backgroundColor: style?.container?.background?.color || "#ffffff",
          backgroundImage: style?.container?.background?.image || "",
          paddingTop: style?.container?.padding?.top || style?.container?.paddingTop || 0,
          paddingRight: style?.container?.padding?.right || style?.container?.paddingRight || 0,
          paddingBottom: style?.container?.padding?.bottom || style?.container?.paddingBottom || 0,
          paddingLeft: style?.container?.padding?.left || style?.container?.paddingLeft || 0,
        };

        // ✅ Container style dengan maxwidth 625px untuk wrapper (sama seperti image)
        const sliderContainerStyle = {
          ...containerStyle,
          maxWidth: "625px",
          width: "100%",
          margin: "0 auto"
        };

        return (
          <div style={sliderContainerStyle}>
            <ImageSliderPreview data={adaptedData} isLandingPage={true} />
          </div>
        );
      }

      case "quota-info": {
        // ✅ SAMA PERSIS dengan renderPreview di addProducts3
        const quotaData = content || {};

        return (
          <div style={containerStyle} className="quota-info-container">
            <QuotaInfoPreview data={quotaData} />
          </div>
        );
      }

      case "section": {
        // ✅ SAMA DENGAN addProducts3: Pastikan block memiliki data terbaru dari allBlocks array
        // Di product page, block mungkin tidak punya id, jadi cek berdasarkan config.componentId atau order
        const blockIdentifier = block.config?.componentId || block.id || block.order;
        const latestBlock = allBlocks.find(b => {
          if (b.type !== 'section') return false;
          const bIdentifier = b.config?.componentId || b.id || b.order;
          return bIdentifier === blockIdentifier;
        }) || block;
        const blockToRender = latestBlock;

        // ✅ ARSITEKTUR BENAR: config.componentId adalah SATU-SATUNYA sumber kebenaran (sama dengan addProducts3)
        // ✅ FALLBACK: Untuk kompatibilitas data lama, generate componentId jika tidak ada
        let sectionComponentId = blockToRender.config?.componentId;

        if (!sectionComponentId) {
          // ✅ FALLBACK: Generate componentId untuk data lama yang tidak punya config.componentId
          sectionComponentId = blockToRender.data?.componentId || blockToRender.content?.componentId || `section-${blockToRender.id || blockToRender.order || Date.now()}`;

          console.warn(`[SECTION FALLBACK] Section block tidak memiliki config.componentId, menggunakan fallback: "${sectionComponentId}"`, {
            blockToRenderId: blockToRender.id,
            blockToRenderConfig: blockToRender.config,
            blockToRenderData: blockToRender.data,
            blockToRenderContent: blockToRender.content
          });
        }

        // ✅ ARSITEKTUR FINAL: Filter child HANYA berdasarkan parentId === sectionComponentId
        // ✅ RULE: Frontend TIDAK BOLEH menebak relasi. Jika parentId tidak ada → section memang kosong.
        // ✅ FIX: Check parentId di multiple locations karena saat data dari backend, parentId bisa di config.parentId
        const childComponents = allBlocks.filter(b => {
          if (!b || !b.type) return false;

          // ✅ FIX: Check parentId di multiple locations (root level, config, data)
          // Karena saat data dari backend, parentId bisa di config.parentId
          const blockParentId = b.parentId || b.config?.parentId || b.data?.parentId;

          // ✅ FIX: Ensure sectionComponentId juga check dari multiple locations
          const actualSectionComponentId = sectionComponentId || blockToRender.data?.componentId || blockToRender.content?.componentId;

          if (!blockParentId || !actualSectionComponentId) {
            return false;
          }

          return blockParentId === actualSectionComponentId;
        });

        // ✅ DEBUG: Hanya log warning jika section kosong (untuk debugging)
        if (childComponents.length === 0 && process.env.NODE_ENV === 'development') {
          console.warn(`[SECTION] Section "${sectionComponentId}" kosong - tidak ada child dengan parentId yang sesuai`);
        }

        // ✅ FIX #3: Build section styles from block.style.container, bukan block.data (sama dengan addProducts3)
        const sectionData = blockToRender.data || blockToRender.content || {};
        const sectionContainerStyle = blockToRender.style?.container || style?.container || {};
        // ✅ FIX: Default padding antar section 0 agar rapet
        let sectionPadding = "0px";
        if (sectionContainerStyle.padding) {
          const top = sectionContainerStyle.padding.top ?? 0;
          const right = sectionContainerStyle.padding.right ?? 0;
          const bottom = sectionContainerStyle.padding.bottom ?? 0;
          const left = sectionContainerStyle.padding.left ?? 0;
          sectionPadding = `${top}px ${right}px ${bottom}px ${left}px`;
        } else if (sectionData.padding !== undefined) {
          const paddingValue = typeof sectionData.padding === 'string'
            ? parseInt(sectionData.padding) || 0
            : sectionData.padding || 0;
          sectionPadding = `${paddingValue}px`;
        }

        // ✅ FIX: Section tidak menambahkan extra margin, ikuti nilai asli
        const sectionMarginLeft = sectionContainerStyle.margin?.left ?? sectionContainerStyle.marginLeft ?? sectionData.marginLeft ?? 0;
        const sectionMarginRight = sectionContainerStyle.margin?.right ?? sectionContainerStyle.marginRight ?? sectionData.marginRight ?? 0;

        const sectionStyles = {
          marginRight: `${sectionMarginRight}px`,
          marginLeft: `${sectionMarginLeft}px`,
          marginBottom: `${sectionContainerStyle.margin?.bottom ?? sectionContainerStyle.marginBottom ?? sectionContainerStyle.marginBetween ?? sectionData.marginBetween ?? 0}px`,
          border: sectionContainerStyle.border?.width
            ? `${sectionContainerStyle.border.width}px ${sectionContainerStyle.border.style || 'solid'} ${sectionContainerStyle.border.color || "#000000"}`
            : (sectionData.border ? `${sectionData.border}px solid ${sectionData.borderColor || "#000000"}` : "none"),
          backgroundColor: sectionContainerStyle.background?.color || sectionContainerStyle.backgroundColor || sectionData.backgroundColor || "#ffffff",
          borderRadius: sectionContainerStyle.border?.radius || (sectionData.borderRadius === "none" ? "0" : sectionData.borderRadius || "0"),
          boxShadow: sectionContainerStyle.shadow || (sectionData.boxShadow === "none" ? "none" : sectionData.boxShadow || "none"),
          display: "block",
          width: "100%",
          padding: sectionPadding, // ✅ Gunakan padding yang sudah di-adjust
        };

        return (
          <div className="preview-section" style={sectionStyles}>
            {childComponents.length === 0 ? (
              <div className="preview-placeholder">
                Section kosong - tambahkan komponen
              </div>
            ) : (
              childComponents.map((childBlock, childIndex) => {
                if (!childBlock || !childBlock.type) {
                  console.warn("[SECTION] Child block tidak valid:", childBlock);
                  return null;
                }

                // Suffix index: backend bisa punya componentId duplikat (mis. text-${Date.now()} sama dalam 1ms)
                const childBase =
                  childBlock.config?.componentId || childBlock.id || childBlock.order || `section-child-${childBlock.type}`;
                const childKey = `${childBase}-${childIndex}`;

                return (
                  <div key={childKey} className="preview-section-child" id={childBlock.config?.componentId}>
                    {renderBlock(childBlock, allBlocks)}
                  </div>
                );
              })
            )}
          </div>
        );
      }

      default:
        return (
          <div className="preview-placeholder" style={containerStyle}>{type}</div>
        );
    }
  };



  // handleSubmit logic moved to hooks and wrapper above.

  // Handle Save Draft - Fix untuk error "handleSaveDraft is not defined"
  // handleSaveDraft wrapper defined above

  // window.handleSaveDraft exposure logic moved to hook

  // Province loading logic moved to useAddressData hook


  // ✅ BRIDGE: Ongkir via Biteship — pakai nama wilayah (+ kode pos jika sudah diisi) untuk resolve area/rates
  useEffect(() => {
    if (!selectedWilayahIds.districtId || !selectedWilayahIds.provinceId) return;

    const { provinces, cities, districts } = wilayahData;
    const p = provinces.find((x) => String(x.id) === String(selectedWilayahIds.provinceId));
    const c = cities.find((x) => String(x.id) === String(selectedWilayahIds.cityId));
    const d = districts.find(
      (x) =>
        String(x.id) === String(selectedWilayahIds.districtId) ||
        String(x.district_id) === String(selectedWilayahIds.districtId)
    );
    const destination_search = [d?.name, c?.name, p?.name].filter(Boolean).join(", ");
    if (!destination_search) return;

    const kodePosDigits = formWilayah.kode_pos ? String(formWilayah.kode_pos).replace(/\D/g, "") : "";
    const item_value = Number(productData?.harga_asli || productData?.harga || 100000) || 100000;

    handleCalculateOngkir(selectedWilayahIds.districtId, "jne", selectedWilayahIds.provinceId, {
      destination_search,
      destination_postal_code: kodePosDigits.length >= 3 ? Number(kodePosDigits) : undefined,
      item_value,
    });
  }, [
    selectedWilayahIds.districtId,
    selectedWilayahIds.provinceId,
    selectedWilayahIds.cityId,
    wilayahData.provinces,
    wilayahData.cities,
    wilayahData.districts,
    formWilayah.kode_pos,
    productData?.harga_asli,
    productData?.harga,
    handleCalculateOngkir,
  ]);


  // ✅ MOVED UP: Derived state and hooks MUST be before any conditional returns
  // Derived settings already defined above

  const logoUrl = buildImageUrl(settings?.logo, true) || '/assets/logo.png';
  const backgroundColor = settings?.background_color || '#ffffff';

  // ✅ Normalisasi struktur analytics (mendukung format lama & baru)
  const analytics = settings?.analytics || {};
  const analyticsFacebook = analytics.facebook || {};
  const analyticsFacebookPixels = Array.isArray(analyticsFacebook.pixels)
    ? analyticsFacebook.pixels
    : [];

  let facebookPixelIds = [];

  // Format lama: settings.facebook_pixels bisa string atau array
  if (Array.isArray(settings?.facebook_pixels)) {
    facebookPixelIds = settings.facebook_pixels;
  } else if (typeof settings?.facebook_pixels === 'string') {
    facebookPixelIds = settings.facebook_pixels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Format baru (builder): ambil dari analytics.facebook.pixels[].id
  if (facebookPixelIds.length === 0 && analyticsFacebookPixels.length > 0) {
    facebookPixelIds = analyticsFacebookPixels
      .map((p) => (p && (p.id || p.pixel || p.pixel_id)) || null)
      .filter(Boolean);
  }

  // ✅ TERBARU: Ambil dari pixel_list (relasi ke pixel_meta)
  if (productData?.pixel_list && Array.isArray(productData.pixel_list) && productData.pixel_list.length > 0) {
    facebookPixelIds = productData.pixel_list
      .map((p) => p.pixel)
      .filter(Boolean);

    console.log('setting di pixel', productData?.pixel_list)
  }

  // console.log('analFbPixels', analFbPixels);
  console.log('productData.pixel_list', productData?.pixel_list);

  // ✅ Facebook Pixel: Track Lead ketika landing page produk dibuka
  useEffect(() => {
    if (!productData) return;
    if (!facebookPixelIds || facebookPixelIds.length === 0) return;

    trackFacebookEvent("Lead", {
      content_name: productData.nama || "Product",
      content_category: "Landing",
      value: Number(productData.harga) || 0,
      currency: "IDR",
    });
  }, [productData]);

  // ✅ MOVED UP: SEO & Scripts Management
  useEffect(() => {
    // 1. Set Page Title
    const title = settings?.page_title
      || settings?.seo_title
      || (productData?.nama ? `${productData.nama}` : "Product Page");

    if (title) {
      document.title = title;
    }

    // 2. Helper to set meta tags dynamically
    const setMeta = (name, content, attrName = 'name') => {
      if (!content) return;
      let meta = document.querySelector(`meta[${attrName}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 3. Set standard meta tags
    if (settings?.meta_description) {
      setMeta('description', settings.meta_description);
      setMeta('og:description', settings.meta_description, 'property');
      setMeta('twitter:description', settings.meta_description);
    }

    // 4. Set OpenGraph tags
    setMeta('og:title', settings?.seo_title || title, 'property');
    setMeta('twitter:title', settings?.seo_title || title);

    // Prioritize meta_image, fallback to logo, fallback to default
    const image = settings?.meta_image || settings?.logo;
    if (image) {
      setMeta('og:image', image, 'property');
      setMeta('twitter:image', image);
    }
  }, [settings, productData]);

  // ✅ Handle Right Click Disable
  useEffect(() => {
    if (settings?.disable_rightclick) {
      const handleContextMenu = (e) => {
        // Allow right click on input fields and textareas
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return true;
        }
        e.preventDefault();
        return false;
      };

      const handleKeyDown = (e) => {
        // Block Inspect Element shortcuts
        if (
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
          (e.ctrlKey && e.key === 'u') ||
          e.key === 'F12'
        ) {
          e.preventDefault();
          return false;
        }
      };

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [settings?.disable_rightclick]);

  // ✅ MOVED UP: Global Style Injection (Plain JS - No styled-jsx)
  useEffect(() => {
    // 1. Force Body & HTML Styles directly via DOM
    document.documentElement.style.backgroundColor = backgroundColor;
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.width = '100%';

    document.body.style.backgroundColor = backgroundColor;
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';

    // 2. Inject Custom Scrollbar Style Tag
    const styleId = `dynamic-page-style-${kode_produk}`;
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      html, body {
        background-color: ${backgroundColor} !important;
      }
      ::-webkit-scrollbar {
        width: 12px;
        background-color: ${backgroundColor};
      }
      ::-webkit-scrollbar-thumb {
        background-color: rgba(128, 128, 128, 0.5);
        border-radius: 6px;
        border: 3px solid ${backgroundColor};
      }
      ::-webkit-scrollbar-track {
        background-color: ${backgroundColor};
      }
      .product-page-container {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
      }
      
      /* ✅ MOBILE & TABLET OPTIMIZATION */
      @media (max-width: 768px) {
        .canvas-content-area, .page-builder-canvas {
            padding-left: 8px !important;
            padding-right: 8px !important;
            box-sizing: border-box !important;
        }

        /* Tidy up sections: remove margins, borders, shadows, backgrounds, and padding on mobile */
        .preview-section {
            margin-left: 0px !important;
            margin-right: 0px !important;
            margin-top: 4px !important;
            margin-bottom: 12px !important;
            padding: 0px !important;
            border: none !important;
            box-shadow: none !important;
            /* background: transparent !important; */
            /* background-color: transparent !important; */
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /* Tidy up the large checkout outer form card on mobile */
        .form-outer-card {
            padding: 16px !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            border-radius: 12px !important;
            margin-left: 0px !important;
            margin-right: 0px !important;
            box-sizing: border-box !important;
        }

        /* Tidy up the outer quota-info container on mobile (remove grey background) */
        .quota-info-container {
            padding: 0px !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Tidy up the inner quota-info card on mobile */
        .quota-info-card {
            padding: 12px !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
        }
        
        /* Auto scale images */
        .preview-section-child img {
            max-width: 100% !important;
            height: auto !important;
        }

        /* Responsive Video Height */
        .preview-video-wrapper {
             width: 100% !important; /* Force full width on mobile */
             /* Height is auto handled by aspect-ratio 16/9, making it larger because width is larger */
        }
        
        /* Scale text generally */
        .preview-text {
            font-size: 0.95em !important; /* Slight scale down */
            overflow-wrap: break-word;
        }

        /* Adjust compact form padding */
        .compact-form-card {
            padding: 0 !important;
            border: none !important;
        }

        /* Testimonials navigation adjust */
        .testimoni-nav-btn-new {
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
        }
      }
    `;

    // Cleanup on unmount (optional, but good practice)
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.overflowX = '';
      document.documentElement.style.width = '';

      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflowX = '';
      document.body.style.width = '';

      const tag = document.getElementById(styleId);
      if (tag) tag.remove();
    };
  }, [backgroundColor, kode_produk]);

  // ✅ Loading indicator - Return NULL for clean loading state
  if (loading) return null;

  // ✅ Jika tidak ada productData setelah loading selesai, tampilkan notifikasi
  if (!productData) {
    return (
      <div className="add-products3-container product-page-container">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h2>Produk tidak ditemukan</h2>
          <p>Produk dengan kode "{kode_produk}" tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  // ✅ ARSITEKTUR FINAL: Root render hanya block TANPA parentId
  // ✅ Section render hanya block dengan parentId === section.config.componentId
  // ✅ Child TIDAK BOLEH dirender di root

  // ✅ ARSITEKTUR FINAL: Root render hanya block TANPA parentId
  // ✅ Section render hanya block dengan parentId === section.config.componentId
  // ✅ Child TIDAK BOLEH dirender di root
  // ✅ FIX: Hapus useMemo untuk menghindari React error #310 (dependency array tidak stabil)
  const blocks = landingpage && Array.isArray(landingpage)
    ? landingpage.filter((item) => {
      // Pastikan item valid dan bukan settings
      if (!item || !item.type) return false;
      if (item.type === 'settings') return false;

      // ✅ ARSITEKTUR FINAL: Root skip block dengan parentId
      // parentId HANYA ada di root level (bukan di config)
      if (item.parentId) {
        return false; // Ini adalah child dari section, jangan render di root
      }

      return true;
    })
    : [];

  // ✅ Debug logging hanya di development mode
  if (process.env.NODE_ENV === 'development' && blocks.length > 0) {
    const missingComponentIds = blocks.filter(b => !b.config?.componentId);
    if (missingComponentIds.length > 0) {
      console.warn('[PRODUCT] ⚠️ Blocks tanpa componentId:', missingComponentIds.length);
    }
  }





  return (
    <>
      {/* ✅ OPTIMASI: Preconnect untuk fonts lebih awal */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* ✅ OPTIMASI: Load fonts dengan display=swap dan subset untuk mengurangi size */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ✅ Scripts Injection Strategy */}
      {/* Script injected via next/script component inside JSX */}

      {/* 1. Facebook Pixel */}
      {facebookPixelIds && facebookPixelIds.length > 0 && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            try {
              var pixelIds = ${JSON.stringify(facebookPixelIds)};
              if (Array.isArray(pixelIds)) {
                pixelIds.forEach(function(id) {
                  if (!id) return;
                  fbq('init', id);
                  console.log('[FB PIXEL] init pixel ID:', id);
                });
              }
            } catch (e) {
              console.error('[FB PIXEL] Error initializing pixels:', e);
            }

            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* 2. TikTok Pixel */}
      {settings?.tiktok_pixels && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${settings.tiktok_pixels}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {/* 3. Google GTM */}
      {settings?.google_gtm && (
        <Script id="google-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${settings.google_gtm}');`}
        </Script>
      )}

      {/* 4. Custom Script (if provided) */}
      {settings?.custom_head_script && (
        <Script id="custom-script" strategy="afterInteractive">
          {settings.custom_head_script}
        </Script>
      )}








      {/* ✅ Hapus loading overlay - biarkan halaman kosong sampai data ter-load */}



      <div className="add-products3-container product-page-container" itemScope itemType="https://schema.org/Product" style={{ backgroundColor, margin: 0, padding: 0, minHeight: '100vh', width: '100%' }}>
        <div className="page-builder-canvas" style={{ backgroundColor, padding: 0, margin: 0, width: '100%', maxWidth: '100%' }}>
          <div className="canvas-wrapper" style={{ backgroundColor, padding: 0, margin: 0, width: '100%', maxWidth: '100%', minHeight: '100vh' }}>
            {/* Logo Section - Top */}
            <div className="canvas-logo-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
              <Image
                src={logoUrl}
                alt="Logo"
                className="canvas-logo"
                width={120}
                height={60}
                priority
                style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%' }}
              />
            </div>

            {/* Content Area - Center dengan padding */}
            {/* Content Area - Center dengan padding */}
            <div
              className="canvas-content-area"
              style={{
                padding: 0,
                width: '100%',
                maxWidth: '100%',
                gap: `${Number(settings?.preview_component_gap ?? 0)}px`,
              }}
            >
              {/* ✅ Render Blocks sesuai urutan array dari backend (sumber kebenaran) */}
              {/* ✅ IMPORTANT: Pass landingpage sebagai allBlocks agar section bisa menemukan child-nya */}
              {blocks.length > 0 ? (
                blocks.map((block, index) => {
                  // Suffix index: componentId dari builder bisa tabrakan (Date.now() sama untuk beberapa blok)
                  const componentId = block.config?.componentId;
                  const stableKey = componentId
                    ? `${componentId}-${index}`
                    : `block-${block.type}-${index}`;

                  if (!componentId && process.env.NODE_ENV === 'development') {
                    console.warn(`[PRODUCT] ⚠️ Block tanpa componentId, menggunakan fallback key: ${stableKey}`);
                  }

                  return (
                    <div key={stableKey} id={componentId} className="canvas-preview-block">
                      {renderBlock(block, landingpage || [])}
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay - tanpa animasi/gambar untuk SEO */}
      {submitting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p>Memproses pesanan Anda...</p>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductClient;
