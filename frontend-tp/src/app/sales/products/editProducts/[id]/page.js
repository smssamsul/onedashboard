"use client";


import { useState, useEffect, useRef } from "react";
import { buildImageUrl } from "@/lib/image";
import { buildLandingButtonInlineStyle } from "@/lib/landingPageButtonStyle";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Type, Image as ImageIcon, FileText, List, MessageSquare,
  HelpCircle, Youtube, X, ArrowLeft, ChevronDown, Layout,
  CheckCircle2, Circle, Minus, ArrowRight, ArrowRightCircle,
  ArrowLeft as ArrowLeftIcon, ArrowLeftRight, ChevronRight, CheckSquare, ShieldCheck,
  Lock, Dot, Target, Link as LinkIcon, PlusCircle, MinusCircle,
  Check, Star, Heart, ThumbsUp, Award, Zap, Flame, Sparkles,
  ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle, PlayCircle,
  PauseCircle, StopCircle, Radio, Square, Hexagon, Triangle,
  AlertCircle, Info, HelpCircle as HelpCircleIcon, Ban, Shield, Key, Unlock,
  Clock, Users, Tag, Upload, Globe, Share2, Code, MapPin, Calendar as CalendarIcon,
  Smartphone, Tablet, Laptop, MousePointerClick
} from "lucide-react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { InputSwitch } from "primereact/inputswitch";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { MultiSelect } from "primereact/multiselect";
import { Chips } from "primereact/chips";
import OngkirCalculator from "@/components/OngkirCalculator";
import { getProvinces, getCities, getDistricts } from "@/utils/shippingService";
import {
  TextComponent,
  ImageComponent,
  VideoComponent,
  TestimoniComponent,
  ListComponent,
  FormComponent,
  FAQComponent,
  SectionComponent,
  SliderComponent,
  ButtonComponent,
  EmbedComponent,
  HTMLComponent,
  DividerComponent,
  ScrollTargetComponent,
  AnimationComponent,
  CountdownComponent,
  ImageSliderComponent,
  QuotaInfoComponent,
} from '../../addProducts3/components';
import CountdownPreview from '../../addProducts3/components/CountdownPreview';
import ImageSliderPreview from '../../addProducts3/components/ImageSliderPreview';
import QuotaInfoPreview from '../../addProducts3/components/QuotaInfoPreview';
// PrimeReact Theme & Core
import "primereact/resources/themes/lara-light-amber/theme.css";
import "primereact/resources/primereact.min.css";
import "@/styles/sales/add-products3.css";
import "@/styles/ongkir.css";

// Komponen yang tersedia
const COMPONENT_CATEGORIES = {
  seringDigunakan: {
    label: "Sering Digunakan",
    components: [
      { id: "text", name: "Teks", icon: Type, color: "#6b7280" },
      { id: "image", name: "Gambar", icon: ImageIcon, color: "#6b7280" },
      { id: "youtube", name: "Video", icon: Youtube, color: "#6b7280" },
      { id: "section", name: "Section", icon: Layout, color: "#6b7280" },
      { id: "button", name: "Tombol", icon: MousePointerClick, color: "#6b7280" },
    ]
  },
  formPemesanan: {
    label: "Form Pemesanan Online",
    components: [
      { id: "form", name: "Form Pemesanan", icon: FileText, color: "#6b7280" },
      { id: "list", name: "Daftar", icon: List, color: "#6b7280" },
      { id: "testimoni", name: "Testimoni", icon: MessageSquare, color: "#6b7280" },
      { id: "faq", name: "FAQ", icon: HelpCircle, color: "#6b7280" },
      { id: "countdown", name: "Countdown", icon: Clock, color: "#6b7280" },
      { id: "image-slider", name: "Image Slider", icon: ImageIcon, color: "#6b7280" },
      { id: "quota-info", name: "Info Kuota", icon: Users, color: "#6b7280" },
    ]
  }
};

export default function EditProductsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id;
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("laptop");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [blocks, setBlocks] = useState([]);
  // Default expanded untuk semua komponen - gunakan Set untuk track collapsed blocks
  const [collapsedBlockIds, setCollapsedBlockIds] = useState(new Set());
  const [testimoniIndices, setTestimoniIndices] = useState({});
  const [productKategori, setProductKategori] = useState(null); // Untuk menentukan kategori produk
  const [activeTab, setActiveTab] = useState("pengaturan"); // State untuk tab aktif
  const [selectedBundling, setSelectedBundling] = useState(null); // State untuk bundling yang dipilih

  // State untuk form wilayah (produk non-fisik) - HANYA NAMA, BUKAN ID
  const [regionForm, setRegionForm] = useState({
    provinsi: "", // Nama provinsi (string)
    kabupaten: "", // Nama kabupaten/kota (string)
    kecamatan: "", // Nama kecamatan (string)
    kode_pos: "" // Kode pos (string)
  });

  // State untuk cascading dropdown (internal - untuk fetch)
  const [regionData, setRegionData] = useState({
    provinces: [],
    cities: [],
    districts: []
  });

  // State untuk selected IDs (internal - hanya untuk fetch, tidak disimpan)
  const [selectedRegionIds, setSelectedRegionIds] = useState({
    provinceId: "",
    cityId: "",
    districtId: ""
  });

  // Loading states
  const [loadingRegion, setLoadingRegion] = useState({
    provinces: false,
    cities: false,
    districts: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // State untuk import/export template
  const importFileInputRef = useRef(null);

  // Fungsi untuk Export Template
  const handleExportTemplate = () => {
    try {
      const templateData = JSON.stringify(blocks, null, 2);
      const blob = new Blob([templateData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `landingpage-template-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Template berhasil diunduh!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Gagal mengunduh template");
    }
  };

  // Fungsi untuk Import Template dari File
  const handleImportTemplateFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (!content) {
          toast.error("File kosong!");
          return;
        }
        const parsedData = JSON.parse(content);
        if (Array.isArray(parsedData)) {
          setBlocks(parsedData);
          toast.success("Template berhasil diimport!");
        } else {
          toast.error("Format data tidak valid!");
        }
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Format JSON tidak valid!");
      }
    };
    reader.readAsText(file);
    // Reset input agar bisa upload file yang sama lagi
    e.target.value = '';
  };

  // State untuk form pengaturan
  const [pengaturanForm, setPengaturanForm] = useState({
    nama: "",
    kategori: null,
    kode: "",
    url: "",
    harga: null,
    jenis_produk: "fisik", // "fisik" atau "non-fisik"
    isBundling: false,
    bundling: [], // Array of { nama: string, harga: number }
    assign: [],
    jadwal: [], // [{ nama_jadwal, waktu_mulai, waktu_selesai, kuota, status }]
    tampil_jadwal: true,
    background_color: "#ffffff", // Default putih
    preview_component_gap: 24,
    preview_text_paragraph_gap: 8,
    page_title: "", // Custom page title
    // SEO & Meta
    tags: [],
    seo_title: "",
    meta_description: "",
    meta_image: "",
    favicon: "",
    // Preview
    preview_url: "",
    // Settings
    loading_logo: "",
    disable_crawler: false,
    disable_rightclick: false,
    html_language: "id",
    disable_custom_font: false,
    // Analytics
    facebook_pixels: [],
    facebook_events: [],
    facebook_event_params: {},
    tiktok_pixels: [],
    tiktok_events: [],
    tiktok_event_params: {},
    google_gtm: "",
    // Other
    custom_head_script: "",
    enable_custom_head_script: false,
    payment_methods: {
      manual: true,
      ewallet: true,
      cc: true,
      va: true
    }
  });

  // State untuk options dropdown
  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  // Master Meta Pixel (PixelMeta dari backend)
  const [metaPixelOptions, setMetaPixelOptions] = useState([]);
  const [isLoadingMetaPixel, setIsLoadingMetaPixel] = useState(false);
  const [isCreatingMetaPixel, setIsCreatingMetaPixel] = useState(false);
  const [selectedMetaPixel, setSelectedMetaPixel] = useState(null);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const bgColorPickerRef = useRef(null);
  const calendarRef = useRef(null);
  const componentRefs = useRef({});

  // Close background color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(event.target)) {
        setShowBgColorPicker(false);
      }
    };

    if (showBgColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBgColorPicker]);

  // Preset background colors - Primary color #FF9900 (rgb(255, 153, 0))
  const presetBgColors = [
    { name: "Primary Orange", value: "#FF9900" }, // Primary color - rgb(255, 153, 0)
    { name: "Putih", value: "#ffffff" },
    { name: "Hitam", value: "#000000" },
    { name: "Abu-abu Terang", value: "#f3f4f6" },
    { name: "Abu-abu Gelap", value: "#374151" },
    { name: "Biru Muda", value: "#dbeafe" },
    { name: "Biru", value: "#F1A124" },
    { name: "Hijau Muda", value: "#d1fae5" },
    { name: "Hijau", value: "#10b981" },
    { name: "Kuning Muda", value: "#fef3c7" },
    { name: "Kuning", value: "#f59e0b" },
    { name: "Merah Muda", value: "#fce7f3" },
    { name: "Merah", value: "#ef4444" },
    { name: "Ungu Muda", value: "#e9d5ff" },
    { name: "Ungu", value: "#8b5cf6" },
    { name: "Orange Muda", value: "#fed7aa" },
    { name: "Orange", value: "#f97316" },
  ];


  // Default data untuk setiap komponen
  const getDefaultData = (componentId) => {
    const defaults = {
      text: {
        content: "<p></p>",
        lineHeight: 1.5,
        letterSpacing: 0,
        wordSpacing: 0,
        marginTop: 0,
        marginBottom: 0,
      },
      image: { src: "", alt: "", caption: "" },
      video: { items: [] },
      testimoni: { items: [] },
      list: { items: [], componentTitle: "" },
      form: { kategori: null }, // Kategori untuk form pemesanan
      faq: { items: [] },
      slider: { images: [] },
      "image-slider": {
        images: [],
        sliderType: "gallery",
        autoslide: false,
        autoslideDuration: 5,
        showCaption: false
      },
      "quota-info": {
        totalKuota: 60,
        sisaKuota: 47,
        headline: "Sisa kuota terbatas!",
        subtext: "Jangan tunda lagi, amankan kursi Anda sebelum kuota habis.",
        highlightText: "Daftar sekarang sebelum kehabisan."
      },
      button: {
        text: "Klik Disini",
        link: "#",
        style: "primary",
        sizePreset: "default",
        fontSize: null,
        paddingX: null,
        paddingY: null,
        backgroundColor: "",
        textColor: "",
        borderRadius: null,
        fullWidth: false,
      },
      embed: { code: "" },
      section: {
        children: [], // Array of block IDs that are children of this section
        marginRight: 0,
        marginLeft: 0,
        marginBetween: 16,
        border: 0,
        borderColor: "#000000",
        borderRadius: "none",
        boxShadow: "none",
        responsiveType: "vertical",
        componentId: `section-${Date.now()}`,
        title: "Section"
      },
      html: { code: "" },
      divider: { style: "solid", color: "#e5e7eb" },
      "scroll-target": { target: "" },
      animation: { type: "fade" },
      countdown: {
        hours: 0,
        minutes: 0,
        seconds: 0,
        textColor: "#e5e7eb",
        bgColor: "#1f2937",
        numberStyle: "flip"
      },
    };
    return defaults[componentId] || {};
  };

  // Handler untuk menambah komponen baru
  const handleAddComponent = (componentId) => {
    // Cek apakah form sudah ada
    if (componentId === "form") {
      const formExists = blocks.some(b => b.type === "form");
      if (formExists) {
        alert("Form Pemesanan sudah ada dan tidak bisa ditambahkan lagi");
        setShowComponentModal(false);
        return;
      }
    }

    const newBlock = {
      id: `block-${Date.now()}`,
      type: componentId,
      data: getDefaultData(componentId),
      order: blocks.length + 1,
      // ✅ ARSITEKTUR BENAR: Section HARUS punya config.componentId
      ...(componentId === "section" ? {
        config: {
          componentId: `section-${Date.now()}`
        }
      } : {})
    };

    setBlocks([...blocks, newBlock]);
    // Komponen baru default expanded (tidak perlu ditambahkan ke collapsedBlockIds)
    setShowComponentModal(false);
  };

  // Handler untuk update block data
  const handleUpdateBlock = (blockId, newData) => {
    setBlocks(prevBlocks => prevBlocks.map(block =>
      block.id === blockId
        ? { ...block, data: { ...block.data, ...newData } }
        : block
    ));
  };

  // Handler untuk menambah child block ke section
  const handleAddChildBlock = (newBlock) => {
    setBlocks([...blocks, newBlock]);
  };

  // Handler untuk update child block
  const handleUpdateChildBlock = (childId, newData) => {
    setBlocks(prevBlocks => prevBlocks.map(block =>
      block.id === childId
        ? { ...block, data: { ...block.data, ...newData } }
        : block
    ));
  };

  // Handler untuk delete child block
  const handleDeleteChildBlock = (childId) => {
    setBlocks(blocks.filter(block => block.id !== childId));
  };

  // Handler untuk move child block
  const handleMoveChildBlock = (childId, direction) => {
    // ✅ ARSITEKTUR BENAR: Move child block berdasarkan order, tidak perlu data.children
    const childBlock = blocks.find(b => b.id === childId);
    if (!childBlock || !childBlock.parentId) return;

    // ✅ ARSITEKTUR BENAR: Find parent section HANYA berdasarkan config.componentId
    const sectionComponentId = childBlock.parentId;
    const parentSection = blocks.find(b =>
      b.type === "section" && b.config?.componentId === sectionComponentId
    );
    if (!parentSection) {
      console.error(`[MOVE CHILD ERROR] Section dengan componentId "${sectionComponentId}" tidak ditemukan!`);
      return;
    }

    // Get all child blocks dari section ini, sorted by order
    const childBlocks = blocks
      .filter(b => b.parentId === sectionComponentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = childBlocks.findIndex(b => b.id === childId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= childBlocks.length) return;

    // Swap order
    const tempOrder = childBlocks[currentIndex].order;
    childBlocks[currentIndex].order = childBlocks[newIndex].order;
    childBlocks[newIndex].order = tempOrder;

    // Update blocks dengan order baru
    setBlocks(blocks.map(b => {
      if (b.id === childBlocks[currentIndex].id) {
        return { ...b, order: childBlocks[currentIndex].order };
      }
      if (b.id === childBlocks[newIndex].id) {
        return { ...b, order: childBlocks[newIndex].order };
      }
      return b;
    }));
  };

  // Handler untuk reorder blocks
  const moveBlock = (blockId, direction) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  // Handler untuk delete block
  const deleteBlock = (blockId) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  // Handler untuk expand/collapse komponen
  const handleToggleExpand = (blockId) => {
    console.log('[handleToggleExpand] Called with blockId:', blockId);
    console.log('[handleToggleExpand] Current collapsedBlockIds:', Array.from(collapsedBlockIds));
    console.log('[handleToggleExpand] Block exists?', blocks.find(b => b.id === blockId));

    setCollapsedBlockIds((prev) => {
      const newSet = new Set(prev);
      const wasCollapsed = newSet.has(blockId);
      console.log('[handleToggleExpand] Before toggle - wasCollapsed:', wasCollapsed);

      if (wasCollapsed) {
        // Jika sudah collapsed, expand (hapus dari set)
        newSet.delete(blockId);
        console.log('[handleToggleExpand] Expanding block - removed from set');
      } else {
        // Jika sudah expanded, collapse (tambah ke set)
        newSet.add(blockId);
        console.log('[handleToggleExpand] Collapsing block - added to set');
      }

      console.log('[handleToggleExpand] After toggle - newSet:', Array.from(newSet));
      console.log('[handleToggleExpand] BlockId:', blockId, 'Now Collapsed:', newSet.has(blockId));
      return newSet;
    });
  };

  // Render komponen form editing di sidebar
  const renderComponent = (block, index) => {
    // Default expanded, kecuali jika ada di collapsedBlockIds
    const isExpanded = !collapsedBlockIds.has(block.id);

    console.log('[renderComponent] Block:', block.id, 'Type:', block.type, 'isExpanded:', isExpanded, 'inCollapsedSet:', collapsedBlockIds.has(block.id));

    const commonProps = {
      data: block.data,
      allBlocks: blocks,
      onUpdate: (newData) => handleUpdateBlock(block.id, newData),
      blockId: block.id,
      index: index,
      onMoveUp: () => moveBlock(block.id, 'up'),
      onMoveDown: () => moveBlock(block.id, 'down'),
      onDelete: () => deleteBlock(block.id),
      isExpanded: isExpanded,
      onToggleExpand: () => {
        console.log('[renderComponent] onToggleExpand callback called for block:', block.id);
        handleToggleExpand(block.id);
      },
    };

    switch (block.type) {
      case "text":
        return <TextComponent {...commonProps} />;
      case "image":
        return <ImageComponent {...commonProps} />;
      case "youtube":
      case "video":
        return <VideoComponent {...commonProps} />;
      case "testimoni":
        return <TestimoniComponent {...commonProps} />;
      case "list":
        return <ListComponent {...commonProps} />;
      case "form":
        return <FormComponent {...commonProps} productKategori={productKategori} />;
      case "faq":
        return <FAQComponent {...commonProps} productKategori={productKategori} />;
      case "slider":
        return <SliderComponent {...commonProps} />;
      case "button":
        return <ButtonComponent {...commonProps} />;
      case "embed":
        return <EmbedComponent {...commonProps} />;
      case "section":
        return (
          <SectionComponent
            {...commonProps}
            block={block} // ✅ FIX: Pass block lengkap, bukan hanya data
            allBlocks={blocks}
            onAddChildBlock={handleAddChildBlock}
            onUpdateChildBlock={handleUpdateChildBlock}
            onDeleteChildBlock={handleDeleteChildBlock}
            onMoveChildBlock={handleMoveChildBlock}
          />
        );
      case "html":
        return <HTMLComponent {...commonProps} />;
      case "divider":
        return <DividerComponent {...commonProps} />;
      case "scroll-target":
        return <ScrollTargetComponent {...commonProps} />;
      case "animation":
        return <AnimationComponent {...commonProps} />;
      case "countdown":
        return <CountdownComponent {...commonProps} />;
      case "image-slider":
        return <ImageSliderComponent {...commonProps} />;
      case "quota-info":
        return <QuotaInfoComponent {...commonProps} />;
      default:
        return <div>Unknown component: {block.type}</div>;
    }
  };

  // Render preview di canvas
  const renderPreview = (block) => {
    // ✅ Pastikan block memiliki data terbaru dari blocks array (sinkron dengan addProducts3)
    const latestBlock = blocks.find(b => b.id === block.id) || block;
    const blockToRender = latestBlock.id === block.id ? latestBlock : block;

    switch (blockToRender.type) {
      case "text":
        const textData = blockToRender.data || {};
        const textStyles = {
          lineHeight: Number.isFinite(Number(textData.lineHeight)) ? Number(textData.lineHeight) : 1.5,
          fontFamily: textData.fontFamily && textData.fontFamily !== "Page Font"
            ? textData.fontFamily
            : "inherit",
          color: textData.textColor || "#000000",
          backgroundColor: textData.backgroundColor && textData.backgroundColor !== "transparent"
            ? textData.backgroundColor
            : "transparent",
          textAlign: textData.textAlign || "left",
          fontWeight: textData.fontWeight || "normal",
          fontStyle: textData.fontStyle || "normal",
          textDecoration: textData.textDecoration || "none",
          textTransform: textData.textTransform || "none",
          letterSpacing: textData.letterSpacing ? `${textData.letterSpacing}px` : "0px",
          wordSpacing: Number.isFinite(Number(textData.wordSpacing)) ? `${Number(textData.wordSpacing)}px` : "0px",
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

        // ✅ FIX: Enhanced check for empty content (handles <p></p>, <p>&nbsp;</p>, etc)
        const rawContent = textData.content || "";
        const isActuallyEmpty = !rawContent ||
          rawContent === "<p></p>" ||
          rawContent === "<p><br></p>" ||
          rawContent.replace(/<[^>]*>/g, '').trim() === "";

        const richContent = isActuallyEmpty ? "<p>Teks...</p>" : rawContent;

        const formattedFont = textData.fontFamily && textData.fontFamily !== "Page Font"
          ? (textData.fontFamily.includes(' ') && !textData.fontFamily.startsWith("'") ? `'${textData.fontFamily}'` : textData.fontFamily)
          : "inherit";

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
              // ✅ FIX: fontFamily must NOT use !important in React style object
              fontFamily: formattedFont,
              ["--preview-text-paragraph-gap"]: `${Number(pengaturanForm.preview_text_paragraph_gap ?? 8)}px`,
            }}
            dangerouslySetInnerHTML={{ __html: richContent }}
          />
        );
      case "image":
        const imageData = blockToRender.data || {};
        if (!imageData.src) {
          return <div className="preview-placeholder">Gambar belum diupload</div>;
        }

        // Advanced settings
        const alignment = imageData.alignment || "center";
        const imageWidth = imageData.imageWidth || 100;
        const imageFit = imageData.imageFit || "fill";
        const aspectRatio = imageData.aspectRatio || "OFF";
        const backgroundType = imageData.backgroundType || "none";
        const backgroundColor = imageData.backgroundColor || "#ffffff";
        const backgroundImage = imageData.backgroundImage || "";
        const paddingTop = imageData.paddingTop || 0;
        const paddingRight = imageData.paddingRight || 0;
        const paddingBottom = imageData.paddingBottom || 0;
        const paddingLeft = imageData.paddingLeft || 0;

        // Calculate aspect ratio - ketika dipilih, gambar akan di-crop sesuai ratio
        let aspectRatioStyle = {};
        if (aspectRatio !== "OFF") {
          const [width, height] = aspectRatio.split(":").map(Number);
          if (width && height) {
            // Set aspect ratio pada wrapper untuk membuat frame crop
            // Ini akan membuat wrapper memiliki ukuran sesuai aspect ratio
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

        // Container style with alignment
        const containerStyle = {
          display: "flex",
          justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
          width: "100%",
          ...imagePaddingStyle,
        };

        // Image wrapper style - ukuran akan berubah sesuai aspect ratio yang dipilih
        const imageWrapperStyle = {
          width: `${imageWidth}%`,
          ...aspectRatioStyle,
          ...imageBackgroundStyle,
          overflow: "hidden",
          borderRadius: "4px",
          position: "relative",
        };

        // Ketika aspect ratio dipilih, wrapper akan otomatis memiliki tinggi sesuai ratio
        // CSS aspect-ratio akan menghitung tinggi berdasarkan lebar dan ratio

        return (
          <div style={containerStyle}>
            <div style={imageWrapperStyle}>
              <img
                src={buildImageUrl(imageData.src)}
                alt={imageData.alt || ""}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: objectFitValue,
                  objectPosition: "center",
                  display: "block",
                }}
              />
            </div>
            {imageData.caption && <p className="preview-caption">{imageData.caption}</p>}
          </div>
        );
      case "youtube":
      case "video":
        const videoItems = blockToRender.data?.items || [];
        if (videoItems.length === 0) {
          return <div className="preview-placeholder">Belum ada video</div>;
        }

        // Advanced settings untuk video
        const videoData = block.data || {};
        const videoAlignment = videoData.alignment || "center";
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

        // Video wrapper style dengan width dan aspect ratio 16:9
        const videoWrapperStyle = {
          width: `${videoWidth}%`,
          maxWidth: "100%", // Pastikan tidak melebihi container
          aspectRatio: "16 / 9",
          position: "relative",
          overflow: "hidden",
          borderRadius: "8px",
          display: "flex",
          justifyContent: videoAlignment === "left" ? "flex-start" : videoAlignment === "right" ? "flex-end" : "center",
        };

        return (
          <div className="preview-videos" style={videoContainerStyle}>
            {videoItems.map((item, i) => (
              item.embedUrl ? (
                <div key={i} className="preview-video-wrapper" style={videoWrapperStyle}>
                  <iframe
                    src={item.embedUrl}
                    title={`Video ${i + 1}`}
                    className="preview-video-iframe"
                    allowFullScreen
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px"
                    }}
                  />
                </div>
              ) : null
            ))}
          </div>
        );
      case "testimoni":
        const testimoniItems = blockToRender.data?.items || [];
        if (testimoniItems.length === 0) {
          return <div className="preview-placeholder">Belum ada testimoni</div>;
        }

        const currentIndex = testimoniIndices[blockToRender.id] || 0;
        const maxIndex = Math.max(0, testimoniItems.length - 3);

        const handlePrev = () => {
          setTestimoniIndices(prev => ({
            ...prev,
            [blockToRender.id]: Math.max(0, currentIndex - 1)
          }));
        };

        const handleNext = () => {
          setTestimoniIndices(prev => ({
            ...prev,
            [blockToRender.id]: Math.min(maxIndex, currentIndex + 1)
          }));
        };

        const testimoniTitle = blockToRender.data?.componentTitle || "";

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
                              <img
                                src={buildImageUrl(item.gambar)}
                                alt={`Foto ${item.nama}`}
                                className="testi-avatar-new"
                                itemProp="author"
                                loading="lazy"
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
                            __html: item.isiTestimony || item.deskripsi || "<p>Deskripsi testimoni</p>"
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
      case "list":
        const listItems = blockToRender.data?.items || [];

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

        const listTitle = blockToRender.data?.componentTitle || "";
        const listData = blockToRender.data || {};

        // Build styles from advance settings
        const listStyles = {
          paddingTop: `${listData.paddingTop || 0}px`,
          paddingRight: `${listData.paddingRight || 0}px`,
          paddingBottom: `${listData.paddingBottom || 0}px`,
          paddingLeft: `${listData.paddingLeft || 0}px`,
        };

        // Background dari advance settings
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
                  color: blockToRender.data?.titleColor || "#000000",
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
                      <div className="preview-list-content" dangerouslySetInnerHTML={{ __html: content || `<p>Point ${i + 1}</p>` }} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      case "faq":
        // Generate FAQ berdasarkan kategori produk
        const faqItems = generateFAQByKategori(productKategori);

        // FAQ Item Component untuk preview
        const FAQItem = ({ question, answer }) => {
          const [isOpen, setIsOpen] = useState(false);
          return (
            <div className="faq-item">
              <button
                className="faq-question"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
              >
                <span>{question}</span>
                <span className="faq-icon">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="faq-answer">
                  <p>{answer}</p>
                </div>
              )}
            </div>
          );
        };

        if (!productKategori) {
          return (
            <section className="preview-faq-section">
              <h2 className="faq-title">Pertanyaan yang Sering Diajukan</h2>
              <div className="faq-container">
                <div className="preview-placeholder">
                  Pilih kategori produk di tab Pengaturan untuk melihat FAQ otomatis
                </div>
              </div>
            </section>
          );
        }

        return (
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
        );
      case "form":
        // Gunakan productKategori dari state pengaturan
        const isFormBuku = productKategori === 4; // Kategori Buku (4)
        const isFormWorkshop = productKategori === 6; // Kategori Workshop (6)
        // Cek jenis produk untuk menentukan apakah perlu ongkir
        const isProdukFisik = pengaturanForm.jenis_produk === "fisik";

        return (
          <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            {/* ✅ Card besar yang merangkum semua form - SAMA dengan addProducts3 */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb"
            }}>
              {/* ✅ Section: Bundling/Pilihan Paket (jika ada) */}
              {pengaturanForm.isBundling && pengaturanForm.bundling && pengaturanForm.bundling.length > 0 && (
                <section style={{ marginBottom: "24px" }}>
                  <h2 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#000000",
                    marginBottom: "8px",
                    lineHeight: "1.4"
                  }}>
                    {pengaturanForm.nama || "Produk"}
                  </h2>
                  <p style={{
                    fontSize: "18px",
                    color: "#000000",
                    marginBottom: "20px",
                    fontWeight: "600"
                  }}>
                    Pilihan Paket
                  </p>
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}>
                    {pengaturanForm.bundling.map((item, index) => {
                      const isSelected = selectedBundling === index;
                      const formatHarga = (harga) => {
                        if (!harga || harga === 0) return "0";
                        return harga.toLocaleString("id-ID");
                      };

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setSelectedBundling(index);
                            // Update harga di Rincian Pemesanan
                            requestAnimationFrame(() => {
                              const hargaElement = document.querySelector('.rincian-pesanan-item .rincian-pesanan-price');
                              const totalElement = document.getElementById('rincian-total');
                              const ongkirElement = document.getElementById('rincian-ongkir');

                              const harga = item.harga || 0;

                              if (hargaElement && !hargaElement.id) {
                                hargaElement.textContent = `Rp ${formatHarga(harga)}`;
                              }

                              if (totalElement) {
                                // Get ongkir jika ada (untuk kategori 4)
                                const ongkir = ongkirElement && ongkirElement.textContent !== "Rp 0"
                                  ? parseInt(ongkirElement.textContent.replace(/[^0-9]/g, '')) || 0
                                  : 0;
                                const total = harga + ongkir;
                                totalElement.textContent = `Rp ${formatHarga(total)}`;
                              }
                            });
                          }}
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
                <h2 className="compact-form-title" style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#000000",
                  marginBottom: "16px"
                }}>Lengkapi Data:</h2>
                <div className="compact-form-card">
                  <div className="compact-field">
                    <label className="compact-label">Nama Lengkap <span className="required">*</span></label>
                    <input type="text" placeholder="Contoh: Krisdayanti" className="compact-input" />
                  </div>
                  <div className="compact-field">
                    <label className="compact-label">No. WhatsApp <span className="required">*</span></label>
                    <div className="wa-input-wrapper">
                      <div className="wa-prefix">
                        <span className="flag">🇮🇩</span>
                        <span className="code">+62</span>
                      </div>
                      <input type="tel" placeholder="812345678" className="compact-input wa-input" />
                    </div>
                  </div>
                  <div className="compact-field">
                    <label className="compact-label">Email <span className="required">*</span></label>
                    <input type="email" placeholder="email@example.com" className="compact-input" />
                  </div>

                  {/* ✅ LOGIC PEMISAHAN FORM: FISIK vs NON-FISIK */}
                  {isFormBuku ? (
                    /* === FORM PRODUK FISIK (LENGKAP: PROV -> KOTA -> KEC -> KODEPOS) === */
                    <>
                      <div className="compact-field">
                        <label className="compact-label">Provinsi <span className="required">*</span></label>
                        <select
                          className="compact-input"
                          value={selectedRegionIds.provinceId}
                          onChange={(e) => handleRegionChange("provinsi", e.target.value)}
                          disabled={loadingRegion.provinces}
                          style={{
                            appearance: 'auto',
                            cursor: loadingRegion.provinces ? 'not-allowed' : 'pointer',
                            backgroundColor: loadingRegion.provinces ? '#f9fafb' : 'white'
                          }}
                        >
                          <option value="">Pilih Provinsi</option>
                          {regionData.provinces.map((province) => (
                            <option key={province.id} value={province.id}>
                              {province.name}
                            </option>
                          ))}
                        </select>
                        {loadingRegion.provinces && (
                          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                            Memuat provinsi...
                          </small>
                        )}
                      </div>

                      <div className="compact-field">
                        <label className="compact-label">Kabupaten/Kota <span className="required">*</span></label>
                        <select
                          className="compact-input"
                          value={selectedRegionIds.cityId}
                          onChange={(e) => handleRegionChange("kabupaten", e.target.value)}
                          disabled={!selectedRegionIds.provinceId || loadingRegion.cities}
                          style={{
                            appearance: 'auto',
                            cursor: (!selectedRegionIds.provinceId || loadingRegion.cities) ? 'not-allowed' : 'pointer',
                            backgroundColor: (!selectedRegionIds.provinceId || loadingRegion.cities) ? '#f9fafb' : 'white'
                          }}
                        >
                          <option value="">Pilih Kabupaten/Kota</option>
                          {regionData.cities.map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                        {loadingRegion.cities && (
                          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                            Memuat kabupaten/kota...
                          </small>
                        )}
                      </div>

                      <div className="compact-field">
                        <label className="compact-label">Kecamatan <span className="required">*</span></label>
                        <select
                          className="compact-input"
                          value={selectedRegionIds.districtId}
                          onChange={(e) => handleRegionChange("kecamatan", e.target.value)}
                          disabled={!selectedRegionIds.cityId || loadingRegion.districts}
                          style={{
                            appearance: 'auto',
                            cursor: (!selectedRegionIds.cityId || loadingRegion.districts) ? 'not-allowed' : 'pointer',
                            backgroundColor: (!selectedRegionIds.cityId || loadingRegion.districts) ? '#f9fafb' : 'white'
                          }}
                        >
                          <option value="">Pilih Kecamatan</option>
                          {regionData.districts.map((district) => (
                            <option key={district.id || district.district_id} value={district.id || district.district_id}>
                              {district.name}
                            </option>
                          ))}
                        </select>
                        {loadingRegion.districts && (
                          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                            Memuat kecamatan...
                          </small>
                        )}
                      </div>

                      <div className="compact-field">
                        <label className="compact-label">Kode Pos <span className="required">*</span></label>
                        <input
                          type="text"
                          placeholder="Contoh: 12120"
                          className="compact-input"
                          value={regionForm.kode_pos}
                          onChange={(e) => handleRegionChange("kode_pos", e.target.value)}
                          disabled={!selectedRegionIds.districtId}
                          style={{
                            cursor: !selectedRegionIds.districtId ? 'not-allowed' : 'text',
                            backgroundColor: !selectedRegionIds.districtId ? '#f9fafb' : 'white'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    /* === FORM PRODUK NON-FISIK (HANYA SEARCH KECAMATAN) === */
                    <div className="compact-field" style={{ position: 'relative' }}>
                      <label className="compact-label">Kecamatan <span className="required">*</span></label>
                      <input
                        type="text"
                        className="compact-input"
                        placeholder="Ketik untuk mencari kecamatan..."
                        style={{
                          cursor: 'text',
                          backgroundColor: 'white'
                        }}
                        readOnly // Read only for preview in admin panel
                      />
                      <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        *Fitur pencarian aktif di halaman publik
                      </small>
                    </div>
                  )}
                  {/* Closing tag for the conditional wrapper if needed, but here we just replaced the block */}

                  {/* Form Ongkir - Hanya untuk produk Fisik */}
                  {isProdukFisik && (
                    <div className="compact-field">
                      <OngkirCalculator
                        onSelectOngkir={(info) => {
                          // Update ongkir di Rincian Pemesanan
                          const ongkirElement = document.getElementById('rincian-ongkir');
                          const totalElement = document.getElementById('rincian-total');

                          const formatHarga = (harga) => {
                            if (!harga || harga === 0) return "0";
                            return harga.toLocaleString("id-ID");
                          };

                          // Get harga yang aktif (bundling atau default)
                          let activeHarga = pengaturanForm.harga || 0;
                          if (pengaturanForm.isBundling && selectedBundling !== null && pengaturanForm.bundling && pengaturanForm.bundling[selectedBundling]) {
                            activeHarga = pengaturanForm.bundling[selectedBundling].harga || 0;
                          }

                          if (ongkirElement && info && info.cost) {
                            const ongkir = info.cost;

                            // Update ongkir display
                            ongkirElement.textContent = `Rp ${formatHarga(ongkir)}`;

                            // Update total (harga aktif + ongkir)
                            if (totalElement) {
                              const total = activeHarga + ongkir;
                              totalElement.textContent = `Rp ${formatHarga(total)}`;
                            }
                          } else if (ongkirElement) {
                            ongkirElement.textContent = "Rp 0";
                            // Reset total ke harga aktif saja
                            if (totalElement) {
                              totalElement.textContent = `Rp ${formatHarga(activeHarga)}`;
                            }
                          }
                        }}
                        onAddressChange={(address) => {
                          // Reset ongkir saat alamat berubah
                          const ongkirElement = document.getElementById('rincian-ongkir');
                          const totalElement = document.getElementById('rincian-total');

                          const formatHarga = (harga) => {
                            if (!harga || harga === 0) return "0";
                            return harga.toLocaleString("id-ID");
                          };

                          // Get harga yang aktif (bundling atau default)
                          let activeHarga = pengaturanForm.harga || 0;
                          if (pengaturanForm.isBundling && selectedBundling !== null && pengaturanForm.bundling && pengaturanForm.bundling[selectedBundling]) {
                            activeHarga = pengaturanForm.bundling[selectedBundling].harga || 0;
                          }

                          if (ongkirElement) {
                            ongkirElement.textContent = "Rp 0";
                          }

                          if (totalElement) {
                            totalElement.textContent = `Rp ${formatHarga(activeHarga)}`;
                          }
                        }}
                        defaultCourier="jne"
                        compact={true}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Rincian Pesanan */}
              <section className="preview-form-section rincian-pesanan-section" aria-label="Rincian Pesanan" style={{ marginBottom: "24px" }}>
                <div className="rincian-pesanan-card">
                  <h3 className="rincian-pesanan-title">RINCIAN PESANAN:</h3>
                  <div className="rincian-pesanan-item">
                    <div className="rincian-pesanan-detail">
                      <div className="rincian-pesanan-name">{pengaturanForm.nama || "Nama Produk"}</div>
                    </div>
                    <div className="rincian-pesanan-price">
                      {(() => {
                        const formatHarga = (harga) => {
                          if (!harga || harga === 0) return "0";
                          return harga.toLocaleString("id-ID");
                        };
                        // Gunakan harga bundling jika dipilih, jika tidak gunakan harga default
                        let harga = pengaturanForm.harga || 0;
                        if (pengaturanForm.isBundling && selectedBundling !== null && pengaturanForm.bundling && pengaturanForm.bundling[selectedBundling]) {
                          harga = pengaturanForm.bundling[selectedBundling].harga || 0;
                        }
                        return `Rp ${formatHarga(harga)}`;
                      })()}
                    </div>
                  </div>
                  {/* Ongkir - Hanya untuk produk Fisik */}
                  {isProdukFisik && (
                    <>
                      <div className="rincian-pesanan-item">
                        <div className="rincian-pesanan-detail">
                          <div className="rincian-pesanan-name">Ongkos Kirim</div>
                        </div>
                        <div className="rincian-pesanan-price" id="rincian-ongkir">
                          Rp 0
                        </div>
                      </div>
                    </>
                  )}
                  <div className="rincian-pesanan-divider"></div>
                  <div className="rincian-pesanan-total">
                    <span className="rincian-pesanan-total-label">Total</span>
                    <span className="rincian-pesanan-total-price" id="rincian-total">
                      {(() => {
                        const formatHarga = (harga) => {
                          if (!harga || harga === 0) return "0";
                          return harga.toLocaleString("id-ID");
                        };
                        // Gunakan harga bundling jika dipilih, jika tidak gunakan harga default
                        let harga = pengaturanForm.harga || 0;
                        if (pengaturanForm.isBundling && selectedBundling !== null && pengaturanForm.bundling && pengaturanForm.bundling[selectedBundling]) {
                          harga = pengaturanForm.bundling[selectedBundling].harga || 0;
                        }
                        // Untuk produk fisik, ongkir akan ditambahkan saat user pilih ongkir
                        // Untuk non-fisik, total = harga saja (tidak ada ongkir)
                        return `Rp ${formatHarga(harga)}`;
                      })()}
                    </span>
                  </div>
                </div>
              </section>

              {/* Section: Metode Pembayaran */}
              <section className="preview-payment-section payment-section" aria-label="Payment methods" style={{ marginBottom: "24px" }}>
                <h2 className="payment-title">Metode Pembayaran</h2>
                <div className="payment-options-vertical">
                  <label className="payment-option-row">
                    <input type="radio" name="payment" value="manual" />
                    <span className="payment-label">Bank Transfer (Manual)</span>
                    <div className="payment-icons-inline">
                      <img className="pay-icon" src="/assets/bca.png" alt="BCA" />
                    </div>
                  </label>
                  <label className="payment-option-row">
                    <input type="radio" name="payment" value="ewallet" />
                    <span className="payment-label">E-Payment</span>
                    <div className="payment-icons-inline">
                      <img className="pay-icon" src="/assets/qris.svg" alt="QRIS" />
                      <img className="pay-icon" src="/assets/dana.png" alt="DANA" />
                      <img className="pay-icon" src="/assets/ovo.png" alt="OVO" />
                      <img className="pay-icon" src="/assets/link.png" alt="LinkAja" />
                    </div>
                  </label>
                  <label className="payment-option-row">
                    <input type="radio" name="payment" value="cc" />
                    <span className="payment-label">Credit / Debit Card</span>
                    <div className="payment-icons-inline">
                      <img className="pay-icon" src="/assets/visa.svg" alt="Visa" />
                      <img className="pay-icon" src="/assets/master.png" alt="Mastercard" />
                      <img className="pay-icon" src="/assets/jcb.png" alt="JCB" />
                    </div>
                  </label>
                  <label className="payment-option-row">
                    <input type="radio" name="payment" value="va" />
                    <span className="payment-label">Virtual Account</span>
                    <div className="payment-icons-inline">
                      <img className="pay-icon" src="/assets/bca.png" alt="BCA" />
                      <img className="pay-icon" src="/assets/mandiri.png" alt="Mandiri" />
                      <img className="pay-icon" src="/assets/bni.png" alt="BNI" />
                      <img className="pay-icon" src="/assets/permata.svg" alt="Permata" />
                    </div>
                  </label>
                </div>
              </section>

              {/* Submit Button */}
              <div className="preview-form-submit-wrapper">
                <button
                  type="button"
                  className="preview-form-submit-btn"
                >
                  Pesan Sekarang
                </button>
              </div>
            </div>
          </div>
        );
      case "button": {
        const buttonData = blockToRender.data || {};
        const preset = buttonData.style || "primary";
        const btnInline = buildLandingButtonInlineStyle(buttonData);

        if (buttonData.fixedBottom) {
          // Di builder preview: kembalikan placeholder transparan
          // Tombol sesungguhnya dirender di luar loop via fixedBottomBlocks agar sticky di bawah frame
          return (
            <div
              style={{
                height: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
              data-fixed-bottom-placeholder="true"
            />
          );
        }

        return (
          <div
            style={{
              width: "100%",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              className={`preview-button preview-button-${preset}`}
              style={btnInline}
            >
              {buttonData.text || "Klik Disini"}
            </button>
          </div>
        );
      }
      case "html":
        return <div dangerouslySetInnerHTML={{ __html: blockToRender.data?.code || "" }} />;
      case "embed":
        return <div dangerouslySetInnerHTML={{ __html: blockToRender.data?.code || "" }} />;
      case "countdown":
        return <CountdownPreview data={blockToRender.data || {}} index={blockToRender.id} />;
      case "image-slider":
        return <ImageSliderPreview data={blockToRender.data || {}} />;
      case "quota-info":
        return <QuotaInfoPreview data={blockToRender.data || {}} />;
      case "section":
        // ✅ SAMA DENGAN addProducts3: Pastikan block memiliki data terbaru dari blocks array
        const latestBlock = blocks.find(b => b.id === block.id) || block;
        const blockToRender = latestBlock.id === block.id ? latestBlock : block;

        // ✅ ARSITEKTUR BENAR: config.componentId adalah SATU-SATUNYA sumber kebenaran (sama dengan addProducts3)
        // ✅ FALLBACK: Untuk kompatibilitas data lama, generate componentId jika tidak ada
        let sectionComponentId = blockToRender.config?.componentId;

        if (!sectionComponentId) {
          // ✅ FALLBACK: Generate componentId untuk data lama yang tidak punya config.componentId
          sectionComponentId = blockToRender.data?.componentId || `section-${blockToRender.id}`;

          // ✅ Auto-fix: Update block dengan config.componentId untuk data lama
          if (!blockToRender.config) {
            blockToRender.config = {};
          }
          blockToRender.config.componentId = sectionComponentId;

          console.warn(`[SECTION FALLBACK] Section block "${blockToRender.id}" tidak memiliki config.componentId, menggunakan fallback: "${sectionComponentId}"`);
        }

        // ✅ ARSITEKTUR BENAR: Filter child berdasarkan parentId === sectionComponentId (sama dengan addProducts3)
        // ✅ FIX: Check parentId di multiple locations karena saat parsing dari backend, parentId bisa di config.parentId
        const childComponents = blocks.filter(b => {
          if (!b || !b.type) return false;

          // ✅ FIX: Check parentId di multiple locations (root level, config, data)
          // Karena saat parsing dari backend, parentId bisa di config.parentId
          const blockParentId = b.parentId || b.config?.parentId || b.data?.parentId;

          // ✅ FIX: Ensure sectionComponentId juga check dari data.componentId sebagai fallback
          const actualSectionComponentId = sectionComponentId || blockToRender.data?.componentId;

          if (!blockParentId || !actualSectionComponentId) {
            return false;
          }

          return blockParentId === actualSectionComponentId;
        });

        // ✅ DEBUG: Log untuk tracking identifier
        console.log(`[SECTION RENDER] Section ID: "${sectionComponentId}"`, {
          sectionBlockId: blockToRender.id,
          sectionConfigComponentId: blockToRender.config?.componentId,
          sectionDataComponentId: blockToRender.data?.componentId,
          childCount: childComponents.length,
          allBlocksWithParentId: blocks
            .filter(b => {
              const bpId = b.parentId || b.config?.parentId || b.data?.parentId;
              return !!bpId;
            })
            .map(b => {
              const bpId = b.parentId || b.config?.parentId || b.data?.parentId;
              const actualSectionComponentId = sectionComponentId || blockToRender.data?.componentId;
              return {
                id: b.id,
                type: b.type,
                parentId_root: b.parentId,
                parentId_config: b.config?.parentId,
                parentId_data: b.data?.parentId,
                parentId_final: bpId,
                match: bpId === actualSectionComponentId ? "✅ MATCH" : "❌ NO MATCH"
              };
            })
        });

        // ✅ FIX #3: Build section styles from block.style.container, bukan block.data (sama dengan addProducts3)
        const sectionData = blockToRender.data || {};
        const sectionContainerStyle = blockToRender.style?.container || {};
        const sectionStyles = {
          marginRight: `${sectionContainerStyle.margin?.right || sectionContainerStyle.marginRight || sectionData.marginRight || 0}px`,
          marginLeft: `${sectionContainerStyle.margin?.left || sectionContainerStyle.marginLeft || sectionData.marginLeft || 0}px`,
          marginBottom: `${sectionContainerStyle.margin?.bottom || sectionContainerStyle.marginBottom || sectionContainerStyle.marginBetween || sectionData.marginBetween || 16}px`,
          border: sectionContainerStyle.border?.width
            ? `${sectionContainerStyle.border.width}px ${sectionContainerStyle.border.style || 'solid'} ${sectionContainerStyle.border.color || "#000000"}`
            : (sectionData.border ? `${sectionData.border}px solid ${sectionData.borderColor || "#000000"}` : "none"),
          backgroundColor: sectionContainerStyle.background?.color || sectionContainerStyle.backgroundColor || sectionData.backgroundColor || "#ffffff",
          borderRadius: sectionContainerStyle.border?.radius || (sectionData.borderRadius === "none" ? "0" : sectionData.borderRadius || "0"),
          boxShadow: sectionContainerStyle.shadow || (sectionData.boxShadow === "none" ? "none" : sectionData.boxShadow || "none"),
          display: "block",
          width: "100%",
          padding: sectionContainerStyle.padding
            ? `${sectionContainerStyle.padding.top || 0}px ${sectionContainerStyle.padding.right || 0}px ${sectionContainerStyle.padding.bottom || 0}px ${sectionContainerStyle.padding.left || 0}px`
            : (sectionData.padding || "16px"),
        };

        return (
          <div className="preview-section" style={sectionStyles}>
            {childComponents.length === 0 ? (
              <div className="preview-placeholder">
                Section kosong - tambahkan komponen
              </div>
            ) : (
              childComponents.map((childBlock) => {
                if (!childBlock || !childBlock.type || !childBlock.id) {
                  console.warn("[SECTION] Child block tidak valid:", childBlock);
                  return null;
                }

                return (
                  <div key={childBlock.id} className="preview-section-child">
                    {renderPreview(childBlock)}
                  </div>
                );
              })
            )}
          </div>
        );
      default:
        return <div className="preview-placeholder">{block.type}</div>;
    }
  };

  // Fungsi untuk generate FAQ berdasarkan kategori
  const generateFAQByKategori = (kategoriId) => {
    // Mapping FAQ berdasarkan kategori (1-7)
    const faqMap = {
      // Kategori Ebook (1)
      1: [
        {
          question: "Apa saja yang akan saya dapatkan jika membeli ebook ini?",
          answer: "Anda akan mendapatkan akses ke file ebook dalam format PDF yang dapat diunduh dan dibaca kapan saja, plus bonus materi tambahan jika tersedia."
        },
        {
          question: "Bagaimana cara mengakses ebook setelah pembelian?",
          answer: "Setelah pembayaran dikonfirmasi, Anda akan menerima email berisi link download dan akses ke member area untuk mengunduh ebook."
        },
        {
          question: "Apakah ebook bisa diunduh berkali-kali?",
          answer: "Ya, setelah pembelian, Anda memiliki akses seumur hidup dan dapat mengunduh ebook berkali-kali sesuai kebutuhan."
        },
        {
          question: "Apakah ebook bisa dibaca di semua perangkat?",
          answer: "Ya, ebook dalam format PDF dapat dibaca di smartphone, tablet, laptop, dan komputer dengan aplikasi PDF reader."
        },
        {
          question: "Apakah ada garansi untuk ebook yang dibeli?",
          answer: "Kami memberikan garansi kepuasan. Jika tidak puas dengan konten ebook, silakan hubungi customer service kami untuk bantuan."
        }
      ],
      // Kategori Webinar (2)
      2: [
        {
          question: "Apa saja yang akan saya dapatkan dari webinar ini?",
          answer: "Anda akan mendapatkan akses live webinar, rekaman lengkap yang dapat ditonton ulang, materi presentasi, dan sertifikat kehadiran."
        },
        {
          question: "Bagaimana cara mengikuti webinar?",
          answer: "Setelah pembayaran dikonfirmasi, Anda akan menerima email berisi link Zoom/meeting room dan jadwal webinar. Link akan dikirim 1 hari sebelum acara."
        },
        {
          question: "Apakah ada rekaman jika saya tidak bisa hadir live?",
          answer: "Ya, semua peserta akan mendapatkan akses ke rekaman webinar yang dapat ditonton ulang kapan saja setelah acara selesai."
        },
        {
          question: "Berapa lama akses rekaman webinar tersedia?",
          answer: "Akses rekaman webinar tersedia seumur hidup. Anda dapat menonton ulang kapan saja melalui member area."
        },
        {
          question: "Apakah saya bisa bertanya langsung kepada pembicara?",
          answer: "Ya, pada sesi live webinar akan ada waktu untuk tanya jawab langsung dengan pembicara melalui fitur Q&A atau chat."
        }
      ],
      // Kategori Seminar (3)
      3: [
        {
          question: "Apa saja yang akan saya dapatkan dari seminar ini?",
          answer: "Anda akan mendapatkan tiket masuk seminar, materi presentasi, sertifikat kehadiran, networking session, dan coffee break."
        },
        {
          question: "Di mana lokasi seminar akan dilaksanakan?",
          answer: "Lokasi seminar akan diinformasikan melalui email setelah pembayaran dikonfirmasi. Biasanya di hotel atau venue yang mudah dijangkau."
        },
        {
          question: "Apakah ada rekaman seminar yang bisa saya akses?",
          answer: "Tergantung kebijakan acara. Jika tersedia, rekaman akan dibagikan kepada peserta setelah seminar selesai melalui email."
        },
        {
          question: "Bagaimana jika saya tidak bisa hadir di tanggal yang ditentukan?",
          answer: "Silakan hubungi customer service kami untuk informasi refund atau transfer tiket ke peserta lain. Kebijakan dapat berbeda tergantung waktu pemberitahuan."
        },
        {
          question: "Apakah ada diskon untuk pembelian tiket grup?",
          answer: "Ya, tersedia diskon khusus untuk pembelian tiket grup minimal 5 orang. Hubungi customer service kami untuk informasi lebih lanjut."
        }
      ],
      // Kategori Buku (4)
      4: [
        {
          question: "Apa saja yang akan saya dapatkan jika membeli buku ini?",
          answer: "Anda akan mendapatkan buku fisik berkualitas tinggi dengan konten lengkap dan terpercaya, plus akses ke materi tambahan jika tersedia."
        },
        {
          question: "Berapa lama waktu pengiriman buku?",
          answer: "Waktu pengiriman bervariasi tergantung lokasi Anda. Untuk wilayah Jabodetabek biasanya 2-3 hari kerja, sedangkan luar kota 3-7 hari kerja."
        },
        {
          question: "Apakah buku ini tersedia dalam format digital?",
          answer: "Saat ini buku tersedia dalam format fisik. Format digital akan diinformasikan lebih lanjut jika tersedia."
        },
        {
          question: "Bagaimana cara menghitung ongkos kirim?",
          answer: "Ongkos kirim akan dihitung otomatis berdasarkan alamat pengiriman Anda. Anda dapat melihat estimasi ongkir setelah memasukkan alamat lengkap."
        },
        {
          question: "Apakah ada garansi untuk buku yang dibeli?",
          answer: "Kami memberikan garansi untuk buku yang rusak atau cacat saat pengiriman. Silakan hubungi customer service kami jika mengalami masalah."
        }
      ],
      // Kategori Ecourse (5)
      5: [
        {
          question: "Apa saja yang akan saya dapatkan dari ecourse ini?",
          answer: "Anda akan mendapatkan akses ke semua modul pembelajaran, video tutorial, materi download, quiz, sertifikat, dan akses ke komunitas eksklusif."
        },
        {
          question: "Berapa lama akses ke ecourse tersedia?",
          answer: "Akses ke ecourse tersedia seumur hidup. Anda dapat belajar kapan saja dan mengulang materi sesuai kebutuhan."
        },
        {
          question: "Apakah ada support atau mentoring selama belajar?",
          answer: "Ya, tersedia support melalui grup komunitas, email, atau sesi Q&A berkala dengan instruktur untuk membantu proses pembelajaran Anda."
        },
        {
          question: "Apakah ecourse bisa diakses dari mobile?",
          answer: "Ya, platform ecourse kami mobile-friendly dan dapat diakses melalui smartphone, tablet, atau laptop dengan koneksi internet."
        },
        {
          question: "Apakah ada ujian atau sertifikat setelah menyelesaikan ecourse?",
          answer: "Ya, setelah menyelesaikan semua modul dan quiz, Anda akan mendapatkan sertifikat kelulusan yang dapat diunduh dan dicetak."
        }
      ],
      // Kategori Workshop (6)
      6: [
        {
          question: "Apa saja yang akan saya dapatkan dari workshop ini?",
          answer: "Anda akan mendapatkan materi lengkap, sertifikat, akses ke recording, dan komunitas eksklusif peserta workshop."
        },
        {
          question: "Apakah workshop ini cocok untuk pemula?",
          answer: "Ya, workshop ini dirancang untuk semua level, termasuk pemula. Materi akan disampaikan secara bertahap dan mudah dipahami."
        },
        {
          question: "Bagaimana sistem pembayaran untuk workshop?",
          answer: "Anda dapat melakukan pembayaran penuh atau menggunakan sistem down payment (uang muka) terlebih dahulu, kemudian melunasi sebelum workshop dimulai."
        },
        {
          question: "Apakah ada rekaman workshop yang bisa saya akses nanti?",
          answer: "Ya, semua peserta akan mendapatkan akses ke rekaman workshop yang dapat ditonton ulang kapan saja."
        },
        {
          question: "Bagaimana jika saya tidak bisa hadir di tanggal yang ditentukan?",
          answer: "Anda tetap bisa mengikuti workshop melalui rekaman yang akan diberikan. Namun, untuk interaksi langsung, disarankan hadir sesuai jadwal."
        }
      ],
      // Kategori Private Mentoring (7)
      7: [
        {
          question: "Apa saja yang akan saya dapatkan dari private mentoring ini?",
          answer: "Anda akan mendapatkan sesi mentoring one-on-one dengan mentor berpengalaman, personalized action plan, follow-up support, dan akses ke materi eksklusif."
        },
        {
          question: "Berapa kali sesi mentoring yang akan saya dapatkan?",
          answer: "Jumlah sesi mentoring tergantung paket yang dipilih. Detail lengkap akan diinformasikan setelah pembayaran dikonfirmasi."
        },
        {
          question: "Bagaimana cara menjadwalkan sesi mentoring?",
          answer: "Setelah pembayaran dikonfirmasi, tim kami akan menghubungi Anda untuk mengatur jadwal sesi mentoring yang sesuai dengan waktu luang Anda."
        },
        {
          question: "Apakah sesi mentoring dilakukan online atau offline?",
          answer: "Tersedia pilihan online (via Zoom/Google Meet) atau offline (jika memungkinkan). Detail akan dibahas saat konfirmasi jadwal."
        },
        {
          question: "Apakah ada follow-up setelah sesi mentoring selesai?",
          answer: "Ya, tersedia follow-up support melalui email atau grup komunitas untuk memastikan Anda dapat menerapkan ilmu yang didapat."
        }
      ]
    };

    // Return FAQ sesuai kategori, atau default jika tidak ada
    return faqMap[kategoriId] || [
      {
        question: "Apa saja yang akan saya dapatkan dari produk ini?",
        answer: "Anda akan mendapatkan akses penuh ke semua fitur dan konten yang tersedia dalam paket produk ini."
      },
      {
        question: "Bagaimana cara menggunakan produk ini?",
        answer: "Setelah pembayaran dikonfirmasi, Anda akan mendapatkan panduan lengkap dan akses ke platform produk."
      },
      {
        question: "Apakah ada garansi untuk produk ini?",
        answer: "Kami memberikan garansi kepuasan. Jika tidak puas, silakan hubungi customer service kami untuk bantuan."
      },
      {
        question: "Bagaimana sistem pembayarannya?",
        answer: "Pembayaran dapat dilakukan melalui berbagai metode yang tersedia. Setelah pembayaran dikonfirmasi, akses akan segera diberikan."
      },
      {
        question: "Apakah ada dukungan setelah pembelian?",
        answer: "Ya, tim customer service kami siap membantu Anda selama menggunakan produk ini. Hubungi kami kapan saja jika ada pertanyaan."
      }
    ];
  };

  // ==========================================================
  // LOGIC FORM WILAYAH (CASCADING DROPDOWN) - FORM CUSTOMER
  // ==========================================================

  // Load provinces
  const loadProvinces = async () => {
    setLoadingRegion(prev => ({ ...prev, provinces: true }));
    try {
      const data = await getProvinces();
      setRegionData(prev => ({ ...prev, provinces: data }));
    } catch (err) {
      console.error("Load provinces error:", err);
    } finally {
      setLoadingRegion(prev => ({ ...prev, provinces: false }));
    }
  };

  // Load cities
  const loadCities = async (provinceId) => {
    setLoadingRegion(prev => ({ ...prev, cities: true }));
    try {
      const data = await getCities(provinceId);
      setRegionData(prev => ({ ...prev, cities: data }));
    } catch (err) {
      console.error("Load cities error:", err);
    } finally {
      setLoadingRegion(prev => ({ ...prev, cities: false }));
    }
  };

  // Load districts
  const loadDistricts = async (cityId) => {
    setLoadingRegion(prev => ({ ...prev, districts: true }));
    try {
      const data = await getDistricts(cityId);
      setRegionData(prev => ({ ...prev, districts: data }));
    } catch (err) {
      console.error("Load districts error:", err);
    } finally {
      setLoadingRegion(prev => ({ ...prev, districts: false }));
    }
  };

  // Handler untuk update region form (HANYA NAMA)
  const handleRegionChange = (field, value, id = null) => {
    if (field === "provinsi") {
      // Konversi value ke string untuk matching yang lebih robust
      const provinceId = String(value || "");
      // Cari province dengan konversi tipe data (handle string/number)
      const province = regionData.provinces.find(p =>
        String(p.id) === provinceId || p.id === value || p.id === Number(value)
      );
      setSelectedRegionIds(prev => ({ ...prev, provinceId: value || "", cityId: "", districtId: "" }));
      setRegionForm(prev => ({
        ...prev,
        provinsi: province?.name || "",
        kabupaten: "",
        kecamatan: "",
        kode_pos: ""
      }));
    } else if (field === "kabupaten") {
      // Konversi value ke string untuk matching yang lebih robust
      const cityId = String(value || "");
      // Cari city dengan konversi tipe data (handle string/number)
      const city = regionData.cities.find(c =>
        String(c.id) === cityId || c.id === value || c.id === Number(value)
      );
      setSelectedRegionIds(prev => ({ ...prev, cityId: value || "", districtId: "" }));
      setRegionForm(prev => ({
        ...prev,
        kabupaten: city?.name || "",
        kecamatan: "",
        kode_pos: ""
      }));
    } else if (field === "kecamatan") {
      // Konversi value ke string untuk matching yang lebih robust
      const districtId = String(value || "");
      // Cari district dengan konversi tipe data (handle string/number dan id/district_id)
      const district = regionData.districts.find(d =>
        String(d.id) === districtId ||
        String(d.district_id) === districtId ||
        d.id === value ||
        d.district_id === value ||
        d.id === Number(value) ||
        d.district_id === Number(value)
      );
      setSelectedRegionIds(prev => ({ ...prev, districtId: value || "" }));
      setRegionForm(prev => ({
        ...prev,
        kecamatan: district?.name || "",
        kode_pos: district?.postal_code || "" // Ambil kode pos dari district jika ada
      }));
    } else if (field === "kode_pos") {
      setRegionForm(prev => ({ ...prev, kode_pos: value }));
    }
  };

  // Load provinces on mount (selalu load untuk form customer)
  useEffect(() => {
    loadProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load cities when province selected
  useEffect(() => {
    if (selectedRegionIds.provinceId) {
      loadCities(selectedRegionIds.provinceId);
      // Reset child selections
      setSelectedRegionIds(prev => ({ ...prev, cityId: "", districtId: "" }));
      setRegionForm(prev => ({ ...prev, kabupaten: "", kecamatan: "", kode_pos: "" }));
      setRegionData(prev => ({ ...prev, cities: [], districts: [] }));
    } else {
      setRegionData(prev => ({ ...prev, cities: [], districts: [] }));
      setSelectedRegionIds(prev => ({ ...prev, cityId: "", districtId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionIds.provinceId]);

  // Load districts when city selected
  useEffect(() => {
    if (selectedRegionIds.cityId) {
      loadDistricts(selectedRegionIds.cityId);
      // Reset child selections
      setSelectedRegionIds(prev => ({ ...prev, districtId: "" }));
      setRegionForm(prev => ({ ...prev, kecamatan: "", kode_pos: "" }));
      setRegionData(prev => ({ ...prev, districts: [] }));
    } else {
      setRegionData(prev => ({ ...prev, districts: [] }));
      setSelectedRegionIds(prev => ({ ...prev, districtId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionIds.cityId]);

  // Loading state untuk edit mode
  const [loading, setLoading] = useState(true);


  // Function untuk parse landingpage array dari backend ke blocks dan pengaturanForm
  const parseLandingpageArray = (landingpageArray) => {
    if (!landingpageArray || !Array.isArray(landingpageArray) || landingpageArray.length === 0) {
      return { blocks: [], settings: {} };
    }

    // Index 0 adalah settings object
    const settings = landingpageArray[0] || {};

    // Index 1+ adalah blocks
    const blocksData = landingpageArray.slice(1) || [];

    // Transform blocks dari struktur baru (content/style/config) ke struktur editor (data)
    // ✅ FIX: Ambil parentId dari root level block (bukan hanya dari config.parentId)
    const parsedBlocks = blocksData.map((block, index) => {
      const { type, content, style, config, order, parentId: blockParentId } = block;

      // Transform kembali ke struktur editor
      let data = {};

      switch (type) {
        case "text":
          data = {
            content: content?.html || "",
            fontFamily: style?.text?.fontFamily || "Page Font",
            textColor: style?.text?.color || "#1a1a1a",
            textAlign: style?.text?.align || "left",
            lineHeight: Number.isFinite(Number(style?.text?.lineHeight))
              ? Number(style.text.lineHeight)
              : 1.5,
            fontWeight: style?.text?.fontWeight || "normal",
            fontStyle: style?.text?.fontStyle || "normal",
            textDecoration: style?.text?.textDecoration || "none",
            textTransform: style?.text?.textTransform || "none",
            letterSpacing: style?.text?.letterSpacing || 0,
            wordSpacing: style?.text?.wordSpacing ?? 0,
            backgroundColor: style?.text?.backgroundColor || "transparent",
            paddingTop: style?.container?.padding?.top || 0,
            paddingRight: style?.container?.padding?.right || 0,
            paddingBottom: style?.container?.padding?.bottom || 0,
            paddingLeft: style?.container?.padding?.left || 0,
            marginTop: style?.container?.margin?.top ?? 0,
            marginBottom: style?.container?.margin?.bottom ?? 0,
            bgType: style?.container?.background?.type || "none",
            bgColor: style?.container?.background?.color || "#ffffff",
            bgImage: style?.container?.background?.image || "",
            componentId: config?.componentId || `text-${Date.now()}`,
            deviceView: config?.deviceView || "desktop",
            parentId: blockParentId || config?.parentId || null // ✅ Gunakan parentId dari root level dulu
          };
          break;
        case "image":
          data = {
            src: content?.src || "",
            alt: content?.alt || "",
            caption: content?.caption || "",
            alignment: style?.image?.alignment || "center",
            imageWidth: style?.image?.width || 100,
            imageFit: style?.image?.fit || "fill",
            aspectRatio: style?.image?.aspectRatio || "OFF",
            paddingTop: style?.container?.padding?.top || 0,
            paddingRight: style?.container?.padding?.right || 0,
            paddingBottom: style?.container?.padding?.bottom || 0,
            paddingLeft: style?.container?.padding?.left || 0,
            backgroundType: style?.container?.background?.type || "none",
            backgroundColor: style?.container?.background?.color || "#ffffff",
            backgroundImage: style?.container?.background?.image || "",
            componentId: config?.componentId || `image-${Date.now()}`,
            device: config?.device || "mobile",
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk image
          };
          break;
        case "youtube":
        case "video":
          data = {
            items: (content?.items || []).map(item => ({
              url: item.url || "",
              embedUrl: item.embedUrl || item.url || ""
            })),
            alignment: style?.video?.alignment || "center",
            videoWidth: style?.video?.width || 100,
            paddingTop: style?.container?.padding?.top || 0,
            paddingRight: style?.container?.padding?.right || 0,
            paddingBottom: style?.container?.padding?.bottom || 0,
            paddingLeft: style?.container?.padding?.left || 0,
            componentId: config?.componentId || `video-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk video
          };
          break;
        case "testimoni":
          data = {
            items: (content?.items || []).map(item => ({
              gambar: item.gambar || "",
              nama: item.nama || "",
              jabatan: item.jabatan || "",
              isiTestimony: item.isiTestimony || item.deskripsi || "<p></p>",
              deskripsi: item.isiTestimony || item.deskripsi || "<p></p>",
              showRating: item.showRating !== false,
              rating: item.rating || 5
            })),
            componentTitle: config?.componentTitle || "",
            componentId: config?.componentId || `testimoni-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk testimoni
          };
          break;
        case "list":
          data = {
            items: (content?.items || []).map(item => ({
              nama: item.nama || "",
              content: item.content || "<p></p>",
              icon: item.icon || "CheckCircle2",
              iconColor: item.iconColor || "#10b981"
            })),
            style: content?.style || "icon",
            componentTitle: config?.componentTitle || content?.title || "",
            paddingTop: style?.container?.padding?.top || 20,
            paddingRight: style?.container?.padding?.right || 0,
            paddingBottom: style?.container?.padding?.bottom || 20,
            paddingLeft: style?.container?.padding?.left || 0,
            componentId: config?.componentId || `list-${Date.now()}`,
            parentId: blockParentId || config?.parentId || data.parentId || null // ✅ Gunakan parentId dari root level dulu
          };
          break;
        case "section":
          data = {
            title: content?.title || "",
            children: content?.children || [],
            marginBetween: style?.container?.marginBetween || 24,
            border: {
              width: style?.container?.border?.width || 2,
              color: style?.container?.border?.color || "#e5e7eb",
              radius: style?.container?.border?.radius || "16px"
            },
            backgroundColor: style?.container?.background?.color || "#f9fafb",
            padding: {
              top: style?.container?.padding?.top || 40,
              right: style?.container?.padding?.right || 40,
              bottom: style?.container?.padding?.bottom || 40,
              left: style?.container?.padding?.left || 40
            },
            shadow: style?.container?.shadow || "0 4px 6px rgba(0,0,0,0.1)",
            responsiveType: style?.container?.responsiveType || "vertical",
            componentId: config?.componentId || `section-${Date.now()}`
          };
          break;
        case "countdown":
          data = {
            hours: content?.hours !== undefined ? content.hours : 0,
            minutes: content?.minutes !== undefined ? content.minutes : 0,
            seconds: content?.seconds !== undefined ? content.seconds : 0,
            textColor: style?.text?.color || "#ffffff",
            bgColor: style?.container?.background?.color || "#1a1a1a",
            numberStyle: style?.numberStyle || "flip",
            componentId: config?.componentId || `countdown-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk countdown
          };
          break;
        case "image-slider":
          data = {
            images: (content?.images || []).map(img => ({
              src: img.src || "",
              alt: img.alt || "",
              caption: img.caption || "",
              link: img.link || "",
              postal_code: img.postal_code || ""
            })),
            autoslide: content?.autoplay || false,
            autoslideDuration: content?.interval ? content.interval / 1000 : 5, // Konversi ms ke detik
            showCaption: false,
            componentId: config?.componentId || `image-slider-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk image-slider
          };
          break;
        case "quota-info":
          data = {
            totalKuota: content?.totalQuota || 60,
            sisaKuota: content?.currentQuota || 47,
            headline: "Sisa kuota terbatas!",
            subtext: "Jangan tunda lagi, amankan kursi Anda sebelum kuota habis.",
            highlightText: "Daftar sekarang sebelum kehabisan.",
            componentId: config?.componentId || `quota-info-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk quota-info
          };
          break;
        case "button": {
          const sb = style?.button || {};
          const brFromStyle =
            typeof sb.borderRadius === "string"
              ? parseInt(String(sb.borderRadius).replace(/px/i, ""), 10)
              : Number(sb.borderRadius);
          const fs =
            content?.fontSize != null && content.fontSize !== ""
              ? Number(content.fontSize)
              : sb.fontSize != null && sb.fontSize !== ""
                ? Number(sb.fontSize)
                : NaN;
          const px =
            content?.paddingX != null && content.paddingX !== ""
              ? Number(content.paddingX)
              : sb.padding?.right != null
                ? Number(sb.padding.right)
                : NaN;
          const py =
            content?.paddingY != null && content.paddingY !== ""
              ? Number(content.paddingY)
              : sb.padding?.top != null
                ? Number(sb.padding.top)
                : NaN;
          const brContent =
            content?.borderRadius != null && content?.borderRadius !== ""
              ? Number(content.borderRadius)
              : NaN;
          data = {
            text: content?.text || "Klik Disini",
            link: content?.link || "#",
            fbPixelEvent: content?.fbPixelEvent || "",
            style: content?.style ?? sb.style ?? "primary",
            sizePreset: content?.sizePreset ?? sb.sizePreset ?? "default",
            fontSize: Number.isFinite(fs) ? fs : null,
            paddingX: Number.isFinite(px) ? px : null,
            paddingY: Number.isFinite(py) ? py : null,
            backgroundColor:
              typeof content?.backgroundColor === "string"
                ? content.backgroundColor
                : typeof sb.backgroundColor === "string"
                  ? sb.backgroundColor
                  : "",
            textColor:
              typeof content?.textColor === "string"
                ? content.textColor
                : typeof sb.textColor === "string"
                  ? sb.textColor
                  : "",
            borderRadius: Number.isFinite(brContent)
              ? brContent
              : Number.isFinite(brFromStyle)
                ? brFromStyle
                : null,
            fullWidth: Boolean(content?.fullWidth ?? sb.fullWidth),
            fixedBottom: Boolean(content?.fixedBottom ?? sb.fixedBottom),
            componentId: config?.componentId || `button-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null,
          };
          break;
        }
        case "html":
          data = {
            code: content?.code || "",
            componentId: config?.componentId || `html-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk html
          };
          break;
        case "embed":
          data = {
            code: content?.code || "",
            componentId: config?.componentId || `embed-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk embed
          };
          break;
        case "divider":
          data = {
            style: content?.style || "solid",
            color: content?.color || "#e5e7eb",
            height: content?.height || 2,
            componentId: config?.componentId || `divider-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk divider
          };
          break;
        case "scroll-target":
          data = {
            target: content?.target || "",
            label: content?.label || "",
            componentId: config?.componentId || `scroll-target-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk scroll-target
          };
          break;
        case "animation":
          data = {
            type: content?.type || "fadeIn",
            duration: content?.duration || 1000,
            delay: content?.delay || 0,
            easing: content?.easing || "ease-in-out",
            componentId: config?.componentId || `animation-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk animation
          };
          break;
        case "faq":
          data = {
            componentId: config?.componentId || `faq-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk faq
          };
          break;
        case "form":
          data = {
            kategori: settings?.form?.submitConfig?.kategori || null,
            componentId: config?.componentId || `form-${Date.now()}`,
            parentId: blockParentId || config?.parentId || null // ✅ TAMBAHKAN parentId untuk form
          };
          break;
        default:
          data = {
            ...content,
            componentId: config?.componentId || `${type}-${Date.now()}`
          };
      }

      // ✅ FIX: parentId harus di root level block, bukan hanya di data
      // Prioritas: blockParentId (root level) > config.parentId > data.parentId
      const finalParentId = blockParentId || config?.parentId || data.parentId || null;

      // ✅ FIX: componentId harus di config, bukan hanya di data
      // Prioritas: config.componentId > data.componentId > generate baru
      const finalComponentId = config?.componentId || data.componentId || `${type}-${Date.now()}-${index}`;

      // ✅ FIX: Pastikan data.componentId juga di-set untuk kompatibilitas
      if (!data.componentId && finalComponentId) {
        data.componentId = finalComponentId;
      }

      return {
        id: `block-${Date.now()}-${index}`,
        type: type,
        data: data,
        order: order !== undefined ? order : index + 1,
        parentId: finalParentId, // ✅ Gunakan parentId dari root level
        config: {
          componentId: finalComponentId, // ✅ Gunakan componentId yang sudah di-normalize
          // ✅ FIX: Preserve parentId in config for compatibility (non-section blocks only)
          ...(finalParentId && type !== 'section' ? { parentId: finalParentId } : {})
        }
      };
    });

    return { blocks: parsedBlocks, settings };
  };

  // Function untuk fetch data produk existing
  const fetchProductData = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch produk berdasarkan ID
      const produkRes = await fetch(`/api/sales/produk/${productId}`, {
        headers,
        cache: 'no-store'
      });
      const produkResponse = await produkRes.json();

      if (!produkRes.ok || !produkResponse.success) {
        throw new Error(produkResponse.message || "Gagal memuat data produk");
      }

      // Handle response yang bisa berupa array atau object
      let produkData = null;
      if (Array.isArray(produkResponse.data)) {
        produkData = produkResponse.data.length > 0 ? produkResponse.data[0] : null;
      } else if (produkResponse.data && typeof produkResponse.data === "object") {
        produkData = produkResponse.data;
      } else {
        produkData = produkResponse;
      }

      if (!produkData) {
        throw new Error("Data produk tidak ditemukan");
      }

      // Parse landingpage array
      let landingpageArray = [];
      if (produkData.landingpage) {
        if (Array.isArray(produkData.landingpage)) {
          landingpageArray = produkData.landingpage;
        } else if (typeof produkData.landingpage === "string") {
          try {
            landingpageArray = JSON.parse(produkData.landingpage);
          } catch {
            landingpageArray = [];
          }
        }
      }

      // Parse landingpage array ke blocks dan settings
      const { blocks: parsedBlocks, settings } = parseLandingpageArray(landingpageArray);

      // Set blocks
      setBlocks(parsedBlocks);

      // ✅ FIX: Button fixed-bottom (position: sticky) kadang tidak ter-render
      // sampai ada scroll/resize event di container preview setelah data di-load
      // secara async. Paksa reflow kecil agar browser langsung hitung ulang.
      requestAnimationFrame(() => {
        const frame = document.querySelector('.preview-device-frame');
        if (frame) {
          frame.scrollTop += 1;
          frame.scrollTop -= 1;
        }
      });

      // Set pengaturanForm dari produkData dan settings
      const kategoriId = produkData.kategori_rel?.id
        ? Number(produkData.kategori_rel.id)
        : (produkData.kategori_id ? Number(produkData.kategori_id) : (produkData.kategori ? Number(produkData.kategori) : null));

      // Parse tanggal_event
      let parsedTanggalEvent = null;
      if (produkData.tanggal_event) {
        const dateStr = produkData.tanggal_event.replace(" ", "T");
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          parsedTanggalEvent = date;
        }
      }

      // ✅ FIX: Parse bundling dari bundling_rel (relasi database)
      let parsedBundling = [];
      if (produkData.bundling_rel && Array.isArray(produkData.bundling_rel)) {
        // Map bundling_rel ke format yang diharapkan
        parsedBundling = produkData.bundling_rel
          .filter(item => item.status === 'A') // Hanya ambil yang status aktif
          .map(item => ({
            id: item.id, // Simpan ID untuk update/delete
            nama: item.nama,
            harga: typeof item.harga === 'string' ? parseInt(item.harga) : item.harga
          }));
      } else if (produkData.bundling) {
        // Fallback untuk data lama (legacy)
        if (Array.isArray(produkData.bundling)) {
          parsedBundling = produkData.bundling;
        } else if (typeof produkData.bundling === "string") {
          try {
            parsedBundling = JSON.parse(produkData.bundling);
          } catch {
            parsedBundling = [];
          }
        }
      }

      // Parse analytics dari settings
      const analytics = settings?.analytics || {};
      const facebookPixels = analytics?.facebook?.pixels || [];
      const tiktokPixels = analytics?.tiktok?.pixels || [];
      const googleGtm = analytics?.google?.gtm || "";

      // Extract Facebook pixels - format: array of numbers (pixel meta ID)
      // Prioritaskan dari database column fb_pixel, fallback ke settings
      let parsedFacebookPixels = [];
      if (produkData.fb_pixel) {
        try {
          const fbPixelArray = typeof produkData.fb_pixel === 'string' ? JSON.parse(produkData.fb_pixel) : produkData.fb_pixel;
          if (Array.isArray(fbPixelArray)) {
            parsedFacebookPixels = fbPixelArray.map(v => Number(v)).filter(n => !Number.isNaN(n));
          }
        } catch (e) {
          console.error("Error parsing fb_pixel", e);
        }
      }
      
      // Jika kosong, coba ambil dari analytics (format lama string)
      if (parsedFacebookPixels.length === 0 && facebookPixels && facebookPixels.length > 0) {
        parsedFacebookPixels = facebookPixels.map(p => {
          if (typeof p === 'string') return p;
          if (p && typeof p === 'object' && p.id) return p.id;
          return '';
        }).filter(p => p);
      }

      // Extract Facebook events
      const facebookEvents = [];
      const facebookEventParams = {};
      facebookPixels.forEach((pixel, index) => {
        if (pixel && typeof pixel === 'object' && pixel.events && Array.isArray(pixel.events)) {
          facebookEvents[index] = pixel.events.map(e => e.name);
          facebookEventParams[index] = pixel.events.map(e => e.params || {});
        }
      });

      // Extract TikTok events
      const tiktokEvents = [];
      tiktokPixels.forEach((pixel, index) => {
        if (pixel && typeof pixel === 'object' && pixel.events && Array.isArray(pixel.events)) {
          tiktokEvents[index] = pixel.events.map(e => e.name);
        }
      });

      // Parse custom scripts
      const customScripts = settings?.customScripts || {};
      const customHeadScript = customScripts.customCode || "";
      const enableCustomHeadScript = customScripts.enabled || false;

      // Parse form preview address
      const formPreviewAddress = settings?.form_preview_address || {};
      if (formPreviewAddress.provinsi || formPreviewAddress.kabupaten || formPreviewAddress.kecamatan || formPreviewAddress.kode_pos) {
        setRegionForm({
          provinsi: formPreviewAddress.provinsi || "",
          kabupaten: formPreviewAddress.kabupaten || "",
          kecamatan: formPreviewAddress.kecamatan || "",
          kode_pos: formPreviewAddress.kode_pos || ""
        });
      }

      // Parse assign - check multiple possible field names from backend
      let parsedAssign = [];
      if (produkData.assign_rel && Array.isArray(produkData.assign_rel)) {
        parsedAssign = produkData.assign_rel.map((u) => String(u.id));
      } else if (produkData.assign_users && Array.isArray(produkData.assign_users)) {
        parsedAssign = produkData.assign_users.map((u) => String(u.id));
      } else if (Array.isArray(produkData.assign)) {
        parsedAssign = produkData.assign.map(a => String(a));
      } else if (typeof produkData.assign === "string") {
        try {
          const assignArray = JSON.parse(produkData.assign);
          if (Array.isArray(assignArray)) {
            parsedAssign = assignArray.map(a => String(a));
          }
        } catch {
          parsedAssign = [];
        }
      }

      // Parse harga - check both harga and harga_asli
      let parsedHarga = null;
      if (produkData.harga !== null && produkData.harga !== undefined && produkData.harga !== "") {
        parsedHarga = Number(produkData.harga);
      } else if (produkData.harga_asli !== null && produkData.harga_asli !== undefined && produkData.harga_asli !== "") {
        parsedHarga = Number(produkData.harga_asli);
      }

      // ✅ Parse jadwal dari jadwal_rel (relasi database)
      let parsedJadwal = [];
      if (produkData.jadwal_rel && Array.isArray(produkData.jadwal_rel) && produkData.jadwal_rel.length > 0) {
        parsedJadwal = produkData.jadwal_rel.map(item => ({
          id: item.id,
          nama_jadwal: item.nama_jadwal || '',
          waktu_mulai: item.waktu_mulai ? parseServerDate(item.waktu_mulai) : null,
          waktu_selesai: item.waktu_selesai ? parseServerDate(item.waktu_selesai) : null,
          kuota: item.kuota || 9999,
          status: item.status || 'A',
        }));
      }

      // Set pengaturanForm - struktur sama dengan addProducts3
      setPengaturanForm({
        nama: produkData.nama || "",
        kategori: kategoriId ? String(kategoriId) : null,
        kode: produkData.kode || formatSlug(produkData.nama || ""),
        url: produkData.url || `/${formatSlug(produkData.nama || "")}`,
        harga: parsedHarga,
        jenis_produk: produkData.jenis_produk || "fisik",
        // ✅ FIX: Cek bundling array, bukan hanya isBundling flag
        isBundling: (parsedBundling && Array.isArray(parsedBundling) && parsedBundling.length > 0) || false,
        bundling: parsedBundling,
        jadwal: parsedJadwal, // ✅ Load jadwal dari jadwal_rel
        tampil_jadwal: produkData.tampil_jadwal ?? true,
        tanggal_event: parsedTanggalEvent,
        kota: produkData.kota || "",
        tempat: produkData.tempat || "",
        alamat: produkData.alamat || "",
        assign: parsedAssign,
        background_color: settings?.background_color || "#ffffff",
        preview_component_gap: Number(settings?.preview_component_gap ?? 24),
        preview_text_paragraph_gap: Number(settings?.preview_text_paragraph_gap ?? 8),
        page_title: settings?.page_title || "",
        tags: settings?.tags || [],
        seo_title: settings?.seo_title || "",
        meta_description: settings?.meta_description || "",
        meta_image: settings?.meta_image || "",
        favicon: settings?.favicon || "",
        preview_url: settings?.preview_url || "",
        loading_logo: settings?.loading_logo || "",
        disable_crawler: settings?.disable_crawler || false,
        disable_rightclick: settings?.disable_rightclick || false,
        html_language: settings?.html_language || "id",
        disable_custom_font: settings?.disable_custom_font || false,
        facebook_pixels: parsedFacebookPixels,
        facebook_events: facebookEvents,
        facebook_event_params: facebookEventParams,
        tiktok_pixels: tiktokPixels.map(p => p.id || ""),
        tiktok_events: tiktokEvents,
        tiktok_event_params: {},
        google_gtm: googleGtm,
        custom_head_script: customHeadScript,
        enable_custom_head_script: enableCustomHeadScript,
        payment_methods: settings?.payment_methods || {
          manual: true,
          ewallet: true,
          cc: true,
          va: true
        }
      });

      // Set productKategori untuk FAQ
      if (kategoriId) {
        setProductKategori(kategoriId);
      }

    } catch (err) {
      console.error("Error fetching product data:", err);
      toast.error(`Gagal memuat data produk: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch kategori dan user options
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch kategori
        const kategoriRes = await fetch("/api/sales/kategori-produk", { headers });
        const kategoriData = await kategoriRes.json();

        const activeCategories = Array.isArray(kategoriData.data)
          ? kategoriData.data.filter((k) => k.status === "1")
          : [];

        const kategoriOpts = activeCategories.map((k) => ({
          label: k.nama,
          value: String(k.id),
        }));
        setKategoriOptions(kategoriOpts);

        // Fetch sales list from /api/sales/lead/sales-list
        const salesRes = await fetch("/api/sales/lead/sales-list", { headers });
        const salesJson = await salesRes.json();

        const salesOpts = Array.isArray(salesJson.data)
          ? salesJson.data.map((sales) => ({
            label: sales.nama || sales.name || `Sales ${sales.id}`,
            value: String(sales.id),
          }))
          : [];
        setUserOptions(salesOpts);

        // Fetch master Meta Pixel list
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
            console.error("[META PIXEL] Gagal fetch pixel list:", pixelJson);
          } else {
            const pixels = Array.isArray(pixelJson.data) ? pixelJson.data : [];
            const pixelOpts = pixels.map((p) => ({
              label: p.nama ? p.nama : `${p.id} - ${p.pixel}`,
              value: Number(p.id),
            }));
            setMetaPixelOptions(pixelOpts);
            console.log("📋 Meta Pixel Options (edit):", pixelOpts);
          }
        } catch (error) {
          console.error("[META PIXEL] Error fetch pixel list:", error);
        } finally {
          setIsLoadingMetaPixel(false);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    }
    fetchInitialData();
  }, []);

  // Fetch product data on mount (edit mode)
  useEffect(() => {
    if (productId) {
      fetchProductData();
    } else {
      setLoading(false);
    }
  }, [productId]);

  // Format Date lokal (bukan UTC) ke string "YYYY-MM-DD HH:mm:ss" untuk dikirim ke backend.
  // Jangan pakai date.toISOString() / JSON.stringify(date) langsung - itu convert ke UTC
  // dan menyebabkan jam yang tersimpan bergeser dari yang dipilih user.
  const formatDateForBackend = (date) => {
    if (!date) return null;
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

  const formatJadwalForBackend = (jadwal) => (jadwal || []).map((j) => ({
    ...j,
    waktu_mulai: j.waktu_mulai ? formatDateForBackend(j.waktu_mulai) : null,
    waktu_selesai: j.waktu_selesai ? formatDateForBackend(j.waktu_selesai) : null,
  }));

  // Parse tanggal dari backend sebagai waktu lokal (bukan UTC), jaga-jaga kalau
  // backend masih mengirim sufiks "Z" (Laravel default serializeDate).
  const parseServerDate = (val) => {
    if (!val) return null;
    const cleaned = String(val).replace(" ", "T").replace(/\.\d+Z?$/, "").replace(/Z$/, "");
    return new Date(cleaned);
  };

  // Fungsi untuk generate kode dari nama (slugify) - Single source of truth
  const formatSlug = (text) => {
    if (!text) return "";

    return text
      .toLowerCase()
      .replace(/\s+/g, "-")        // ⬅️ spasi DIUBAH dulu
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  };


  // Handler khusus untuk input kode produk - lebih stabil untuk ketik manual
  const handleKodeChange = (e) => {
    const input = e.target;
    const rawValue = input.value;

    const cursorPos = input.selectionStart ?? 0;

    const formattedValue = formatSlug(rawValue);
    const url = formattedValue ? `/${formattedValue}` : "";

    const beforeCursor = rawValue.slice(0, cursorPos);
    const formattedBeforeCursor = formatSlug(beforeCursor);

    const newCursorPos = Math.min(
      formattedBeforeCursor.length,
      formattedValue.length
    );

    setPengaturanForm(prev => ({
      ...prev,
      kode: formattedValue,
      url
    }));
  };


  // Handler untuk update form pengaturan
  const handlePengaturanChange = (key, value) => {
    if (key === "nama") {
      // Nama produk tidak auto-generate kode dan URL
      setPengaturanForm((prev) => ({
        ...prev,
        nama: value
      }));

      // Update nama produk di Rincian Pemesanan
      requestAnimationFrame(() => {
        const namaElement = document.querySelector('.rincian-pesanan-name');
        if (namaElement) {
          namaElement.textContent = value || "Nama Produk";
        }
      });
    } else if (key === "kode") {
      // Auto-format kode menggunakan single source of truth
      const formattedKode = formatSlug(value);
      const url = formattedKode ? `/${formattedKode}` : "";
      setPengaturanForm((prev) => ({
        ...prev,
        kode: formattedKode,
        url: url
      }));
    } else {
      setPengaturanForm((prev) => ({ ...prev, [key]: value }));

      // Update total di Rincian Pemesanan saat harga berubah
      if (key === "harga") {
        requestAnimationFrame(() => {
          const totalElement = document.getElementById('rincian-total');
          const ongkirElement = document.getElementById('rincian-ongkir');

          if (totalElement) {
            const harga = value || 0;
            // Hanya hitung ongkir jika produk fisik
            const ongkir = (pengaturanForm.jenis_produk === "fisik" && ongkirElement)
              ? parseInt(ongkirElement.textContent.replace(/[^0-9]/g, '')) || 0
              : 0;
            const total = harga + ongkir;

            const formatHarga = (harga) => {
              if (!harga || harga === 0) return "0";
              return harga.toLocaleString("id-ID");
            };

            totalElement.textContent = `Rp ${formatHarga(total)}`;
          }

          // Update harga produk di Rincian Pemesanan
          const hargaElement = document.querySelector('.rincian-pesanan-item .rincian-pesanan-price');
          if (hargaElement && !hargaElement.id) {
            const formatHarga = (harga) => {
              if (!harga || harga === 0) return "0";
              return harga.toLocaleString("id-ID");
            };
            hargaElement.textContent = `Rp ${formatHarga(value || 0)}`;
          }
        });
      }

      // Reset ongkir saat jenis produk berubah
      if (key === "jenis_produk") {
        requestAnimationFrame(() => {
          const ongkirElement = document.getElementById('rincian-ongkir');
          const totalElement = document.getElementById('rincian-total');

          const formatHarga = (harga) => {
            if (!harga || harga === 0) return "0";
            return harga.toLocaleString("id-ID");
          };

          // Get harga aktif (bundling atau default)
          let activeHarga = pengaturanForm.harga || 0;
          if (pengaturanForm.isBundling && selectedBundling !== null && pengaturanForm.bundling && pengaturanForm.bundling[selectedBundling]) {
            activeHarga = pengaturanForm.bundling[selectedBundling].harga || 0;
          }

          if (value === "non-fisik") {
            // Non-fisik: reset ongkir dan total = harga saja
            if (ongkirElement) {
              ongkirElement.textContent = "Rp 0";
            }
            if (totalElement) {
              totalElement.textContent = `Rp ${formatHarga(activeHarga)}`;
            }
          } else {
            // Fisik: reset ongkir ke 0, total = harga (ongkir akan dihitung saat user pilih)
            if (ongkirElement) {
              ongkirElement.textContent = "Rp 0";
            }
            if (totalElement) {
              totalElement.textContent = `Rp ${formatHarga(activeHarga)}`;
            }
          }
        });
      }
    }
  };

  // ============================================
  // FUNGSI TRANSFORMASI PAYLOAD (Struktur Baru)
  // ============================================

  // Transformasi block dari flat data ke content/style/config
  const transformBlock = (block) => {
    // ✅ FIX: Ambil parentId dari root level block, bukan dari data.parentId
    const { type, data = {}, order, parentId } = block;

    // Extract content, style, dan config berdasarkan type
    let content = {};
    let style = {};
    let config = {};

    switch (type) {
      case "text":
        content = {
          html: data.content || "<p></p>"
        };
        style = {
          text: {
            fontFamily: data.fontFamily && data.fontFamily !== "Page Font" ? data.fontFamily : "Inter, sans-serif",
            color: data.textColor || "#1a1a1a",
            align: data.textAlign || "left",
            lineHeight: Number.isFinite(Number(data.lineHeight)) ? Number(data.lineHeight) : 1.5,
            fontWeight: data.fontWeight || "normal",
            fontStyle: data.fontStyle || "normal",
            textDecoration: data.textDecoration || "none",
            textTransform: data.textTransform || "none",
            letterSpacing: data.letterSpacing || 0,
            wordSpacing: data.wordSpacing ?? 0,
            backgroundColor: data.backgroundColor || "transparent"
          },
          container: {
            padding: {
              top: data.paddingTop || 0,
              right: data.paddingRight || 0,
              bottom: data.paddingBottom || 0,
              left: data.paddingLeft || 0
            },
            margin: {
              top: data.marginTop ?? 0,
              right: 0,
              bottom: data.marginBottom ?? 0,
              left: 0
            },
            background: {
              type: data.bgType || "none",
              color: data.bgColor || "#ffffff",
              image: data.bgImage || "",
              size: "cover",
              position: "center",
              repeat: "no-repeat"
            },
            border: {
              width: 0,
              style: "solid",
              color: "#e5e7eb",
              radius: "0px"
            },
            shadow: "none"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `text-${Date.now()}`,
          deviceView: data.deviceView || "desktop",
          ...(parentId ? { parentId } : {}) // ✅ Gunakan parentId dari root level
        };
        break;

      case "image":
        content = {
          src: data.src || "",
          alt: data.alt || "",
          caption: data.caption || ""
        };
        style = {
          image: {
            alignment: data.alignment || "center",
            width: data.imageWidth || 100,
            fit: data.imageFit || "fill",
            aspectRatio: data.aspectRatio || "OFF"
          },
          container: {
            padding: {
              top: data.paddingTop || 0,
              right: data.paddingRight || 0,
              bottom: data.paddingBottom || 0,
              left: data.paddingLeft || 0
            },
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0
            },
            background: {
              type: data.backgroundType || "none",
              color: data.backgroundColor || "#ffffff",
              image: data.backgroundImage || ""
            },
            border: {
              width: 0,
              style: "solid",
              color: "#e5e7eb",
              radius: "0px"
            },
            shadow: "none"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `image-${Date.now()}`,
          device: data.device || "mobile",
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk image
        };
        break;

      case "youtube":
      case "video":
        content = {
          items: (data.items || []).map(item => ({
            url: item.url || "",
            embedUrl: item.embedUrl || item.url || ""
          }))
        };
        style = {
          video: {
            alignment: data.alignment || "center",
            width: data.videoWidth || 100
          },
          container: {
            padding: {
              top: data.paddingTop || 0,
              right: data.paddingRight || 0,
              bottom: data.paddingBottom || 0,
              left: data.paddingLeft || 0
            }
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `video-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk video
        };
        break;

      case "testimoni":
        content = {
          items: (data.items || []).map(item => ({
            gambar: item.gambar || "",
            nama: item.nama || "",
            jabatan: item.jabatan || "",
            isiTestimony: item.isiTestimony || item.deskripsi || "<p></p>",
            showRating: item.showRating !== false,
            rating: item.rating || 5
          }))
        };
        style = {
          text: {
            fontFamily: "Inter, sans-serif",
            color: "#1a1a1a"
          },
          container: {
            padding: {
              top: 60,
              right: 40,
              bottom: 60,
              left: 40
            },
            background: {
              type: "color",
              color: "#f8f9fa"
            },
            border: {
              width: 0,
              radius: "16px"
            },
            shadow: "0 2px 8px rgba(0,0,0,0.1)"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `testimoni-${Date.now()}`,
          componentTitle: data.componentTitle || "",
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk testimoni
        };
        break;

      case "list":
        content = {
          title: data.componentTitle || "",
          items: (data.items || []).map(item => ({
            nama: item.nama || "",
            content: item.content || "<p></p>",
            icon: item.icon || "CheckCircle2",
            iconColor: item.iconColor || "#10b981"
          })),
          style: data.style || "icon"
        };
        style = {
          text: {
            fontFamily: "Inter, sans-serif",
            color: "#1a1a1a",
            fontSize: 18,
            lineHeight: 1.8
          },
          container: {
            padding: {
              top: data.paddingTop || 20,
              right: data.paddingRight || 0,
              bottom: data.paddingBottom || 20,
              left: data.paddingLeft || 0
            },
            spacing: 16,
            alignment: "left"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `list-${Date.now()}`,
          componentTitle: data.componentTitle || "",
          ...(parentId ? { parentId } : {}) // ✅ Gunakan parentId dari root level
        };
        break;

      case "section":
        content = {
          title: data.title || "",
          children: data.children || []
        };
        style = {
          container: {
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0
            },
            marginBetween: data.marginBetween || 24,
            border: {
              width: data.border?.width || 2,
              style: "solid",
              color: data.border?.color || "#e5e7eb",
              radius: data.border?.radius || "16px"
            },
            background: {
              type: "color",
              color: data.backgroundColor || "#f9fafb"
            },
            padding: {
              top: data.padding?.top || 40,
              right: data.padding?.right || 40,
              bottom: data.padding?.bottom || 40,
              left: data.padding?.left || 40
            },
            shadow: data.shadow || "0 4px 6px rgba(0,0,0,0.1)",
            responsiveType: data.responsiveType || "vertical"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `section-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ Untuk nested section
        };
        break;

      case "countdown":
        content = {
          hours: data.hours !== undefined ? data.hours : 0,
          minutes: data.minutes !== undefined ? data.minutes : 0,
          seconds: data.seconds !== undefined ? data.seconds : 0,
        };
        style = {
          text: {
            color: data.textColor || "#ffffff",
            fontFamily: "monospace"
          },
          container: {
            background: {
              type: "color",
              color: data.bgColor || "#1a1a1a"
            }
          },
          numberStyle: data.numberStyle || "flip"
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `countdown-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk countdown
        };
        break;

      case "faq":
        content = {};
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `faq-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk faq
        };
        break;

      case "form":
        content = {};
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `form-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk form
        };
        break;

      case "image-slider":
        content = {
          images: (data.images || []).map(img => ({
            src: img.src || "",
            alt: img.alt || "",
            caption: img.caption || "",
            link: img.link || "",
            postal_code: img.postal_code || ""
          })),
          autoplay: data.autoslide || false,
          interval: (data.autoslideDuration || 5) * 1000, // Konversi detik ke ms untuk backend
          showDots: true,
          showArrows: true
        };
        style = {
          container: {
            height: "500px",
            borderRadius: "12px",
            shadow: "0 4px 12px rgba(0,0,0,0.15)"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `image-slider-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk image-slider
        };
        break;

      case "quota-info":
        content = {
          totalQuota: data.totalKuota || 60,
          currentQuota: data.sisaKuota || 47,
          remainingQuota: (data.totalKuota || 60) - (data.sisaKuota || 47),
          showProgress: true,
          showNumber: true
        };
        style = {
          text: {
            fontFamily: "Inter, sans-serif",
            color: "#1a1a1a",
            numberColor: "#2563eb",
            fontSize: 24,
            fontWeight: "600"
          },
          container: {
            padding: {
              top: 30,
              right: 30,
              bottom: 30,
              left: 30
            },
            background: {
              type: "color",
              color: "#f0f9ff"
            },
            border: {
              width: 0,
              radius: "12px"
            },
            shadow: "0 2px 8px rgba(0,0,0,0.1)"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `quota-info-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk quota-info
        };
        break;

      case "button": {
        const sizePreset = data.sizePreset || "default";
        const customBg = typeof data.backgroundColor === "string" ? data.backgroundColor.trim() : "";
        const customTc = typeof data.textColor === "string" ? data.textColor.trim() : "";
        const br = Number(data.borderRadius);
        const fs = Number(data.fontSize);
        const px = Number(data.paddingX);
        const py = Number(data.paddingY);

        content = {
          text: data.text || "Klik Disini",
          link: data.link || "#",
          fbPixelEvent: data.fbPixelEvent || "",
          style: data.style || "primary",
          sizePreset,
          ...(Number.isFinite(fs) ? { fontSize: fs } : {}),
          ...(Number.isFinite(px) ? { paddingX: px } : {}),
          ...(Number.isFinite(py) ? { paddingY: py } : {}),
          ...(customBg ? { backgroundColor: customBg } : {}),
          ...(customTc ? { textColor: customTc } : {}),
          ...(Number.isFinite(br) ? { borderRadius: br } : {}),
          fullWidth: Boolean(data.fullWidth),
          fixedBottom: Boolean(data.fixedBottom),
        };

        style = {
          button: {
            style: data.style || "primary",
            backgroundColor: customBg || "#ff6c00",
            textColor: customTc || "#ffffff",
            hoverColor: "#c85400",
            fontSize: Number.isFinite(fs) ? fs : 18,
            fontWeight: "600",
            borderRadius: Number.isFinite(br) ? `${br}px` : "8px",
            padding: {
              top: Number.isFinite(py) ? py : 16,
              right: Number.isFinite(px) ? px : 32,
              bottom: Number.isFinite(py) ? py : 16,
              left: Number.isFinite(px) ? px : 32,
            },
            shadow: "0 4px 12px rgba(255, 108, 0, 0.3)",
            alignment: data.fullWidth ? "stretch" : "center",
            fullWidth: Boolean(data.fullWidth),
            fixedBottom: Boolean(data.fixedBottom),
            sizePreset,
          },
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `button-${Date.now()}`,
          ...(parentId ? { parentId } : {}),
        };
        break;
      }

      case "html":
        content = {
          code: data.code || ""
        };
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `html-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk html
        };
        break;

      case "embed":
        content = {
          code: data.code || ""
        };
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `embed-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk embed
        };
        break;

      case "divider":
        content = {
          style: data.style || "solid",
          color: data.color || "#e5e7eb",
          width: "100%",
          height: data.height || 2
        };
        style = {
          container: {
            margin: {
              top: 60,
              right: 0,
              bottom: 60,
              left: 0
            },
            alignment: "center"
          }
        };
        config = {
          componentId: data.componentId || block.config?.componentId || `divider-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk divider
        };
        break;

      case "scroll-target":
        content = {
          target: data.target || "",
          label: data.label || ""
        };
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `scroll-target-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk scroll-target
        };
        break;

      case "animation":
        content = {
          type: data.type || "fadeIn",
          duration: data.duration || 1000,
          delay: data.delay || 0,
          easing: data.easing || "ease-in-out"
        };
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `animation-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk animation
        };
        break;

      default:
        // Fallback untuk komponen lain
        content = data;
        style = {};
        config = {
          componentId: data.componentId || block.config?.componentId || `${type}-${Date.now()}`,
          ...(parentId ? { parentId } : {}) // ✅ TAMBAHKAN parentId untuk default case
        };
    }

    return {
      type,
      order: order || 0,
      content,
      style,
      config,
      ...(parentId ? { parentId } : {}) // ✅ FIX: Tambahkan parentId di root level block object (sama dengan addProducts3)
    };
  };

  // Transformasi analytics dari flat ke terstruktur dengan valueSource
  const transformAnalytics = () => {
    const analytics = {
      facebook: {
        pixels: []
      },
      tiktok: {
        pixels: []
      },
      google: {
        gtm: pengaturanForm.google_gtm || ""
      }
    };

    // Transform Facebook Pixels
    if (pengaturanForm.facebook_pixels && pengaturanForm.facebook_pixels.length > 0) {
      pengaturanForm.facebook_pixels.forEach((pixelId, index) => {
        if (pixelId && String(pixelId).trim()) {
          const events = [];

          // Transform Facebook Events
          if (pengaturanForm.facebook_events && pengaturanForm.facebook_events[index]) {
            const eventNames = Array.isArray(pengaturanForm.facebook_events[index])
              ? pengaturanForm.facebook_events[index]
              : [];

            eventNames.forEach((eventName, eventIndex) => {
              const eventParams = pengaturanForm.facebook_event_params?.[index]?.[eventIndex] || {};

              // Convert value ke valueSource jika ada
              const params = { ...eventParams };
              if (params.value !== undefined) {
                // Tentukan valueSource berdasarkan event name
                if (eventName === "ViewContent") {
                  params.valueSource = "product.price";
                } else if (eventName === "AddToCart") {
                  params.valueSource = "selectedBundle.price";
                } else if (eventName === "Purchase") {
                  params.valueSource = "order.total";
                } else {
                  params.valueSource = "product.price";
                }
                delete params.value; // Hapus value hard-coded
              }

              events.push({
                name: eventName,
                params: {
                  content_name: pengaturanForm.nama || "Product",
                  content_category: "Education",
                  currency: "IDR",
                  ...params
                }
              });
            });
          }

          analytics.facebook.pixels.push({
            id: pixelId,
            events: events.length > 0 ? events : [
              {
                name: "ViewContent",
                params: {
                  content_name: pengaturanForm.nama || "Product",
                  content_category: "Education",
                  valueSource: "product.price",
                  currency: "IDR"
                }
              }
            ]
          });
        }
      });
    }

    // Transform TikTok Pixels
    if (pengaturanForm.tiktok_pixels && pengaturanForm.tiktok_pixels.length > 0) {
      pengaturanForm.tiktok_pixels.forEach((pixelId, index) => {
        if (pixelId && String(pixelId).trim()) {
          const events = [];

          // Transform TikTok Events
          if (pengaturanForm.tiktok_events && pengaturanForm.tiktok_events[index]) {
            const eventNames = Array.isArray(pengaturanForm.tiktok_events[index])
              ? pengaturanForm.tiktok_events[index]
              : [];

            eventNames.forEach((eventName) => {
              events.push({
                name: eventName,
                params: {
                  content_name: pengaturanForm.nama || "Product",
                  content_type: "course",
                  valueSource: "product.price",
                  currency: "IDR"
                }
              });
            });
          }

          analytics.tiktok.pixels.push({
            id: pixelId,
            events: events.length > 0 ? events : [
              {
                name: "ViewContent",
                params: {
                  content_name: pengaturanForm.nama || "Product",
                  content_type: "course",
                  valueSource: "product.price",
                  currency: "IDR"
                }
              }
            ]
          });
        }
      });
    }

    return analytics;
  };

  // Buat Meta Pixel baru via backend dan tambahkan ke list
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

      const created = data.data || {};
      const createdPixel = (created.pixel || pixel).trim();
      const newOption = {
        label: `${created.id} - ${createdPixel}`,
        value: createdPixel,
      };
      setMetaPixelOptions((prev) => [...prev, newOption]);

      const current = pengaturanForm.facebook_pixels || [];
      if (!current.includes(createdPixel)) {
        handlePengaturanChange("facebook_pixels", [...current, createdPixel]);
      }
      setSelectedMetaPixel(createdPixel);

      alert("Meta Pixel berhasil dibuat dan ditambahkan ke Facebook Pixels.");
    } catch (error) {
      console.error("[META PIXEL] Error create pixel:", error);
      alert("Terjadi kesalahan saat membuat Meta Pixel baru");
    } finally {
      setIsCreatingMetaPixel(false);
    }
  };

  // Transformasi custom scripts
  const transformCustomScripts = () => {
    const templates = [];

    // Facebook Pixel Templates
    if (pengaturanForm.facebook_pixels && pengaturanForm.facebook_pixels.length > 0) {
      pengaturanForm.facebook_pixels.forEach((pixelId, index) => {
        if (pixelId && String(pixelId).trim()) {
          templates.push({
            id: `fb-pixel-${index + 1}`,
            type: "facebook-pixel",
            pixelId: pixelId,
            autoEvents: true
          });
        }
      });
    }

    // Google GTM Template
    if (pengaturanForm.google_gtm && String(pengaturanForm.google_gtm).trim()) {
      templates.push({
        id: "google-gtm-1",
        type: "google-gtm",
        gtmId: pengaturanForm.google_gtm
      });
    }

    return {
      enabled: pengaturanForm.enable_custom_head_script || false,
      templates,
      customCode: pengaturanForm.custom_head_script || ""
    };
  };

  // Transformasi form untuk landingpage
  const transformForm = () => {
    const isFisik = pengaturanForm.jenis_produk === "fisik";

    return {
      type: pengaturanForm.jenis_produk || "non-fisik",
      fields: [
        {
          name: "nama",
          label: "Nama Lengkap",
          type: "text",
          required: true,
          placeholder: "Masukkan nama lengkap"
        },
        {
          name: "wa",
          label: "Nomor WhatsApp",
          type: "tel",
          required: true,
          placeholder: "6281234567890"
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: false,
          placeholder: "email@example.com"
        }
      ],
      optionalFields: {
        address: {
          enabled: isFisik
        }
      },
      submitConfig: {
        buttonText: "Daftar Sekarang",
        buttonColor: "#F1A124",
        kategori: pengaturanForm.kategori ? Number(pengaturanForm.kategori) : null
      }
    };
  };

  // Transformasi form preview address (untuk preview/style form builder)
  const transformFormPreviewAddress = () => {
    // Hanya kirim jika ada data (untuk preview form builder)
    if (regionForm.provinsi || regionForm.kabupaten || regionForm.kecamatan || regionForm.kode_pos) {
      return {
        provinsi: regionForm.provinsi || "",
        kabupaten: regionForm.kabupaten || "",
        kecamatan: regionForm.kecamatan || "",
        kode_pos: regionForm.kode_pos || ""
      };
    }
    return null;
  };

  // Handler untuk save draft (tanpa publish)
  const handleSaveDraft = async () => {
    // Prevent double click
    if (isSaving) {
      return;
    }

    // Validasi minimal (hanya nama wajib untuk draft)
    if (!pengaturanForm.nama || !pengaturanForm.nama.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    // Set loading state
    setIsSaving(true);

    // Format tanggal event
    let formattedDate = null;
    if (pengaturanForm.tanggal_event) {
      const date = new Date(pengaturanForm.tanggal_event);
      formattedDate = date.toISOString();
    }

    // Transform blocks
    const transformedBlocks = blocks.map(transformBlock);

    // Transform analytics
    const analytics = transformAnalytics();

    // Transform custom scripts
    const customScripts = transformCustomScripts();

    // Transform form
    const form = transformForm();

    // Transform form preview address
    const formPreviewAddress = transformFormPreviewAddress();

    // Build settings object untuk landingpage array
    const settingsObject = {
      type: "settings",
      background_color: pengaturanForm.background_color || "#ffffff",
      preview_component_gap: Number(pengaturanForm.preview_component_gap ?? 24),
      preview_text_paragraph_gap: Number(pengaturanForm.preview_text_paragraph_gap ?? 8),
      page_title: pengaturanForm.page_title || "",
      tags: pengaturanForm.tags || [],
      seo_title: pengaturanForm.seo_title || "",
      meta_description: pengaturanForm.meta_description || "",
      meta_image: pengaturanForm.meta_image || "",
      favicon: pengaturanForm.favicon || "",
      preview_url: pengaturanForm.preview_url || "",
      loading_logo: pengaturanForm.loading_logo || "",
      disable_crawler: pengaturanForm.disable_crawler || false,
      disable_rightclick: pengaturanForm.disable_rightclick || false,
      html_language: pengaturanForm.html_language || "id",
      disable_custom_font: pengaturanForm.disable_custom_font || false,
      payment_methods: pengaturanForm.payment_methods || {
        manual: true,
        ewallet: true,
        cc: true,
        va: true
      },
      analytics,
      customScripts,
      form,
      ...(formPreviewAddress ? { form_preview_address: formPreviewAddress } : {})
    };

    // Build landingpage array: [settings, ...blocks]
    const landingpageArray = [
      settingsObject,
      ...transformedBlocks
    ];

    // Prepare bundling untuk relasi database
    const bundlingPayload = (pengaturanForm.bundling || []).map(item => ({
      ...(item.id ? { id: item.id } : {}),
      nama: item.nama || "",
      harga: String(item.harga || 0),
      status: "A"
    }));

    // Prepare payload dengan status draft (status: "0")
    const payload = {
      nama: pengaturanForm.nama.trim(),
      kategori: pengaturanForm.kategori ? String(pengaturanForm.kategori) : null,
      kode: pengaturanForm.kode || formatSlug(pengaturanForm.nama),
      url: pengaturanForm.url || `/${formatSlug(pengaturanForm.nama)}`,
      harga: pengaturanForm.harga ? String(pengaturanForm.harga) : "0",
      jenis_produk: pengaturanForm.jenis_produk || "fisik",
      isBundling: pengaturanForm.isBundling || false,
      bundling: bundlingPayload,
      tanggal_event: formattedDate,
      assign: pengaturanForm.assign || [],
      status: "0", // DRAFT STATUS
      fb_pixel: pengaturanForm.facebook_pixels || [],
      landingpage: landingpageArray,
      // LOKASI
      ...(String(pengaturanForm.kategori) === "3" ? {
        kota: pengaturanForm.kota || "",
        tempat: pengaturanForm.tempat || "",
        alamat: pengaturanForm.alamat || "",
      } : {})
    };

    try {
      toast.loading("Menyimpan draft...", { id: "save-draft" });

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!productId) {
        toast.error("Product ID tidak ditemukan!", { id: "save-draft" });
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/sales/produk/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        toast.error("Gagal memparse response dari server", { id: "save-draft" });
        setIsSaving(false);
        return;
      }

      if (!response.ok || !data?.success) {
        const errorMessage = data?.message || data?.error || "Gagal menyimpan draft";
        console.error("Save draft error:", { status: response.status, data });
        toast.error(errorMessage, { id: "save-draft" });
        setIsSaving(false);
        return;
      }

      toast.success("Draft berhasil disimpan!", { id: "save-draft" });

      // ✅ Trik Ajaib: Beritahu tab lain (Landing Page) untuk refresh
      try {
        const bc = new BroadcastChannel('product_update');
        bc.postMessage({ type: 'REFRESH_PRODUCT', kode: payload.kode });
        bc.close();
      } catch (e) { }

      setIsSaving(false);
      setShowExitModal(false);

      // ✅ FIX: Invalidate cache and instant navigation
      router.refresh();

      // ✅ TETAP DI HALAMAN INI: Tidak redirect ke menu produk


    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(error?.message || "Terjadi kesalahan saat menyimpan draft", { id: "save-draft" });
      setIsSaving(false);
    }
  };
  // Handler untuk save dan publish
  const handleSaveAndPublish = async () => {
    // Prevent double click
    if (isSaving) {
      return;
    }

    // Validasi
    if (!pengaturanForm.nama || !pengaturanForm.nama.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    if (!pengaturanForm.kategori) {
      toast.error("Kategori wajib dipilih");
      return;
    }

    if (!pengaturanForm.harga) {
      toast.error("Harga wajib diisi");
      return;
    }

    if (!pengaturanForm.assign || pengaturanForm.assign.length === 0) {
      toast.error("Penanggung jawab wajib dipilih");
      return;
    }

    // Set loading state
    setIsSaving(true);

    // Format tanggal event
    let formattedDate = null;
    if (pengaturanForm.tanggal_event) {
      const date = new Date(pengaturanForm.tanggal_event);
      formattedDate = date.toISOString();
    }

    // Transform blocks
    const transformedBlocks = blocks.map(transformBlock);

    // Transform analytics
    const analytics = transformAnalytics();

    // Transform custom scripts
    const customScripts = transformCustomScripts();

    // Transform form
    const form = transformForm();

    // Transform form preview address
    const formPreviewAddress = transformFormPreviewAddress();

    // Build settings object untuk landingpage array
    const settingsObject = {
      type: "settings",
      background_color: pengaturanForm.background_color || "#ffffff",
      preview_component_gap: Number(pengaturanForm.preview_component_gap ?? 24),
      preview_text_paragraph_gap: Number(pengaturanForm.preview_text_paragraph_gap ?? 8),
      page_title: pengaturanForm.page_title || "",
      tags: pengaturanForm.tags || [],
      seo_title: pengaturanForm.seo_title || "",
      meta_description: pengaturanForm.meta_description || "",
      meta_image: pengaturanForm.meta_image || "",
      favicon: pengaturanForm.favicon || "",
      preview_url: pengaturanForm.preview_url || "",
      loading_logo: pengaturanForm.loading_logo || "",
      disable_crawler: pengaturanForm.disable_crawler || false,
      disable_rightclick: pengaturanForm.disable_rightclick || false,
      html_language: pengaturanForm.html_language || "id",
      disable_custom_font: pengaturanForm.disable_custom_font || false,
      payment_methods: pengaturanForm.payment_methods || {
        manual: true,
        ewallet: true,
        cc: true,
        va: true
      },
      analytics,
      customScripts,
      form,
      ...(formPreviewAddress ? { form_preview_address: formPreviewAddress } : {})
    };

    // Build landingpage array: [settings, ...blocks]
    const landingpageArray = [
      settingsObject,
      ...transformedBlocks
    ];

    // ✅ FIX: Prepare bundling untuk relasi database
    // Format: array of { id?, nama, harga, status }
    // - Jika ada id: update existing
    // - Jika tidak ada id: create new
    const bundlingPayload = (pengaturanForm.bundling || []).map(item => ({
      ...(item.id ? { id: item.id } : {}), // Hanya kirim id jika ada (untuk update)
      nama: item.nama || "",
      harga: String(item.harga || 0),
      status: "A" // Default aktif
    }));

    // Prepare payload dengan struktur baru
    const payload = {
      nama: pengaturanForm.nama.trim(),
      kategori: String(pengaturanForm.kategori),
      kode: pengaturanForm.kode || formatSlug(pengaturanForm.nama),
      url: pengaturanForm.url || `/${formatSlug(pengaturanForm.nama)}`,
      harga: String(pengaturanForm.harga || 0),
      jenis_produk: pengaturanForm.jenis_produk || "fisik",
      isBundling: pengaturanForm.isBundling || false,
      bundling: bundlingPayload, // ✅ Array untuk relasi database
      tanggal_event: formattedDate,
      assign: pengaturanForm.assign,
      status: "1",
      fb_pixel: pengaturanForm.facebook_pixels || [],
      jadwal: formatJadwalForBackend(pengaturanForm.jadwal),
      tampil_jadwal: pengaturanForm.tampil_jadwal ?? true,
      landingpage: landingpageArray,
      // LOKASI
      ...(String(pengaturanForm.kategori) === "3" ? {
        kota: pengaturanForm.kota || "",
        tempat: pengaturanForm.tempat || "",
        alamat: pengaturanForm.alamat || "",
      } : {})
    };

    try {
      toast.loading("Menyimpan produk...", { id: "save-product" });

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!productId) {
        toast.error("Product ID tidak ditemukan!", { id: "save-product" });
        setIsSaving(false); // ✅ FIX: Set loading state ke false
        return;
      }

      const response = await fetch(`/api/sales/produk/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      // ✅ FIX: Better error handling untuk response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        const responseText = await response.text().catch(() => "Unknown error");
        console.error("Response text:", responseText);
        toast.error("Gagal memparse response dari server", { id: "save-product" });
        setIsSaving(false);
        return;
      }

      if (!response.ok || !data?.success) {
        const errorMessage = data?.message || data?.error || "Gagal menyimpan produk";
        console.error("Save error:", { status: response.status, data });
        toast.error(errorMessage, { id: "save-product" });
        setIsSaving(false);
        return;
      }

      toast.success("Produk berhasil diupdate dan dipublish!", { id: "save-product" });

      // ✅ Trik Ajaib: Beritahu tab lain (Landing Page) untuk refresh
      try {
        const bc = new BroadcastChannel('product_update');
        bc.postMessage({ type: 'REFRESH_PRODUCT', kode: payload.kode });
        bc.close();
      } catch (e) { }

      // ✅ FIX: Set loading state ke false sebelum redirect
      setIsSaving(false);

      // ✅ FIX: Invalidate cache and instant navigation
      // ✅ FIX: Invalidate cache and instant navigation
      router.refresh();

      // ✅ TETAP DI HALAMAN INI: Tidak redirect ke menu produk


    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(error?.message || "Terjadi kesalahan saat menyimpan produk", { id: "save-product" });
      setIsSaving(false);
    }
  };

  // Handler untuk back button dengan konfirmasi
  const handleBackClick = () => {
    setShowExitModal(true);
  };

  // Handler untuk exit tanpa save
  const handleExitWithoutSave = () => {
    setShowExitModal(false);
    console.log("Exiting to /sales/products...");
    window.location.href = "/sales/products";
  };

  // Render grid komponen dalam modal
  const renderComponentGrid = () => {
    // ✅ FIX: Komponen bisa digunakan berkali-kali, baik di dalam section maupun di luar section
    // TIDAK perlu filter komponen yang sudah digunakan di section
    // User bebas menambahkan komponen yang sama berkali-kali

    return (
      <div className="component-modal-content">
        {Object.entries(COMPONENT_CATEGORIES).map(([key, category]) => (
          <div key={key} className="component-category">
            <h3 className="component-category-title">{category.label}</h3>
            <div className="component-grid">
              {category.components
                // ✅ FIX: Tampilkan semua komponen, tidak ada filter
                .map((component) => {
                  const IconComponent = component.icon;
                  return (
                    <div
                      key={component.id}
                      className="component-item"
                      onClick={() => handleAddComponent(component.id)}
                      title={component.name}
                    >
                      <div
                        className="component-icon"
                        style={{ backgroundColor: "#f3f4f6" }}
                      >
                        <IconComponent
                          size={20}
                          style={{ color: "#6b7280" }}
                        />
                      </div>
                      <span className="component-name">{component.name}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="add-products3-container">
      {/* Overlay Loading - NON-BLOCKING */}
      {loading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999
        }}>
          <div style={{
            background: "white",
            padding: "32px 48px",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}>
            <p style={{
              margin: 0,
              fontSize: "16px",
              color: "#374151"
            }}>
              Sebentar ya, sedang disiapkan datanya...
            </p>
          </div>
        </div>
      )}
      {/* Header Section with Back Button and Save Button */}
      <div className="page-header-section">
        <button
          className="back-to-products-btn"
          onClick={handleBackClick}
          aria-label="Back to products list"
        >
          <ArrowLeft size={18} />
          <span>Back to Products</span>
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportTemplateFile}
          />
          <button
            className="action-btn-secondary"
            onClick={() => importFileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
            title="Import Template dari file JSON"
          >
            <Upload size={16} />
            <span>Import</span>
          </button>
          <button
            className="action-btn-secondary"
            onClick={handleExportTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
            title="Download Template JSON"
          >
            <Code size={16} />
            <span>Export</span>
          </button>
          <button
            className={`save-publish-btn ${isSaving ? 'btn-loading' : ''}`}
            onClick={handleSaveAndPublish}
            aria-label="Simpan dan Publish"
            disabled={isSaving}
          >
            <span>{isSaving ? "Menyimpan..." : "Simpan dan Publish"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="page-builder-main">
        {/* Left Sidebar - Form Editing */}
        <div className="page-builder-sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === "pengaturan" ? "active" : ""}`}
              onClick={() => setActiveTab("pengaturan")}
            >
              Pengaturan
            </button>
            <button
              className={`sidebar-tab ${activeTab === "konten" ? "active" : ""}`}
              onClick={() => setActiveTab("konten")}
            >
              Konten
            </button>
          </div>

          {/* Tab Content */}
          <div className="sidebar-content">
            {activeTab === "konten" ? (
              <>
                {/* ✅ Filter: Jangan tampilkan komponen yang adalah child dari section */}
                {(() => {
                  // ✅ ARSITEKTUR BENAR: Cari semua section componentIds untuk filter child blocks
                  // Hanya pakai config.componentId, TIDAK ADA fallback
                  const sectionComponentIds = new Set();
                  blocks.forEach(block => {
                    if (block && block.type === 'section' && block.config?.componentId) {
                      sectionComponentIds.add(block.config.componentId);
                    }
                  });

                  // Filter blocks: jangan tampilkan block yang adalah child dari section
                  const filteredBlocks = blocks.filter(block => {
                    if (!block || !block.type) return false;

                    // ✅ Jangan tampilkan block yang adalah child dari section
                    // Check by parentId
                    if (block.parentId && sectionComponentIds.has(block.parentId)) {
                      return false; // Ini adalah child dari section, jangan tampilkan di sidebar
                    }

                    // ✅ ARSITEKTUR BENAR: Check by parentId sudah dilakukan di atas, tidak perlu check data.children

                    return true;
                  });

                  return filteredBlocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="sidebar-component-item"
                      ref={(el) => {
                        if (el) {
                          componentRefs.current[block.id] = el;
                        }
                      }}
                    >
                      {renderComponent(block, index)}
                    </div>
                  ));
                })()}

                {/* Button Tambah Komponen Baru - Selalu di bawah komponen terakhir */}
                <button
                  className="add-component-btn"
                  onClick={() => setShowComponentModal(true)}
                >
                  <span className="add-component-icon">+</span>
                  <span className="add-component-text">Tambah Komponen Baru</span>
                </button>
              </>
            ) : (
              <div className="pengaturan-content">
                {/* Informasi Dasar */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Informasi Dasar</h3>
                  <p className="pengaturan-section-description">Data utama produk yang akan ditampilkan</p>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Nama Produk <span className="required">*</span>
                    </label>
                    <InputText
                      className="pengaturan-input"
                      value={pengaturanForm.nama}
                      onChange={(e) => handlePengaturanChange("nama", e.target.value)}
                      placeholder="Masukkan nama produk"
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">
                      Kategori <span className="required">*</span>
                    </label>
                    <Dropdown
                      className="w-full form-input"
                      value={pengaturanForm.kategori}
                      options={kategoriOptions}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(e) => {
                        const selectedValue = e.value;
                        const finalValue = selectedValue !== null && selectedValue !== undefined && selectedValue !== ""
                          ? String(selectedValue)
                          : null;
                        handlePengaturanChange("kategori", finalValue);
                        setProductKategori(finalValue ? Number(finalValue) : null);
                      }}
                      placeholder="Pilih Kategori"
                      showClear
                      filter
                      filterPlaceholder="Cari kategori..."
                    />
                    {!pengaturanForm.kategori && (
                      <small className="field-hint" style={{ color: "#ef4444" }}>
                        Kategori wajib dipilih
                      </small>
                    )}
                  </div>

                  {/* LOKASI (KHUSUS SEMINAR / KATEGORI == "3") */}
                  {String(pengaturanForm.kategori) === "3" && (
                    <>
                      <div className="form-field-group">
                        <label className="form-label">
                          Kota (Contoh: Medan) <span className="required">*</span>
                        </label>
                        <InputText
                          className="w-full form-input"
                          value={pengaturanForm.kota || ""}
                          onChange={(e) => handlePengaturanChange("kota", e.target.value)}
                          placeholder="Masukkan nama kota"
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-label">
                          Tempat (Contoh: AIHO Hotel) <span className="required">*</span>
                        </label>
                        <InputText
                          className="w-full form-input"
                          value={pengaturanForm.tempat || ""}
                          onChange={(e) => handlePengaturanChange("tempat", e.target.value)}
                          placeholder="Masukkan nama tempat/gedung"
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-label">
                          Alamat Lengkap <span className="required">*</span>
                        </label>
                        <InputTextarea
                          className="w-full form-input"
                          value={pengaturanForm.alamat || ""}
                          onChange={(e) => handlePengaturanChange("alamat", e.target.value)}
                          placeholder="Masukkan alamat lengkap lokasi acara"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Kode Produk</label>
                    <InputText
                      className="pengaturan-input"
                      value={pengaturanForm.kode || ""}
                      onChange={handleKodeChange}
                      placeholder="seminar-as-bandung"
                    />
                    <small className="pengaturan-hint">
                      Spasi otomatis menjadi dash (-) dan huruf menjadi kecil saat mengetik. URL akan otomatis mengikuti.
                    </small>
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">URL</label>
                    <InputText
                      className="pengaturan-input"
                      value={pengaturanForm.url || ""}
                      placeholder="Otomatis dari kode produk"
                      readOnly
                      style={{ background: "#f9fafb", cursor: "not-allowed" }}
                    />
                    <small className="pengaturan-hint">URL otomatis di-generate dari kode produk</small>
                  </div>
                </div>

                {/* Jenis Produk */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Jenis Produk</h3>
                  <p className="pengaturan-section-description">Tentukan jenis produk untuk menghitung ongkos kirim</p>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Jenis Produk <span className="required">*</span>
                    </label>
                    <Dropdown
                      className="pengaturan-input"
                      value={pengaturanForm.jenis_produk || "fisik"}
                      options={[
                        { label: "Fisik", value: "fisik" },
                        { label: "Non-Fisik", value: "non-fisik" }
                      ]}
                      onChange={(e) => handlePengaturanChange("jenis_produk", e.value)}
                      placeholder="Pilih jenis produk"
                    />
                    <small className="pengaturan-hint">
                      Produk Fisik memerlukan ongkos kirim, Non-Fisik tidak memerlukan ongkos kirim
                    </small>
                  </div>
                </div>

                {/* Harga */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Harga</h3>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Harga <span className="required">*</span>
                    </label>
                    <InputNumber
                      className="pengaturan-input"
                      value={pengaturanForm.harga}
                      onValueChange={(e) => handlePengaturanChange("harga", e.value)}
                      placeholder="Masukkan harga"
                      mode="currency"
                      currency="IDR"
                      locale="id-ID"
                      useGrouping={true}
                    />
                  </div>

                  {/* Checkbox Bundling */}
                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={pengaturanForm.isBundling || false}
                        onChange={(e) => handlePengaturanChange("isBundling", e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <span>Bundling</span>
                    </label>
                  </div>

                  {/* Form Bundling */}
                  {pengaturanForm.isBundling && (
                    <div className="pengaturan-form-group" style={{ marginTop: "16px" }}>
                      <label className="pengaturan-label" style={{ marginBottom: "12px" }}>Daftar Bundling</label>
                      {(pengaturanForm.bundling || []).map((item, index) => (
                        <div key={index} style={{ marginBottom: "12px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                          <div className="pengaturan-form-group" style={{ marginBottom: "8px" }}>
                            <label className="pengaturan-label" style={{ fontSize: "14px" }}>Nama Bundling</label>
                            <InputText
                              className="pengaturan-input"
                              value={item.nama || ""}
                              onChange={(e) => {
                                const newBundling = [...(pengaturanForm.bundling || [])];
                                newBundling[index] = { ...newBundling[index], nama: e.target.value };
                                handlePengaturanChange("bundling", newBundling);
                              }}
                              placeholder="Masukkan nama bundling"
                            />
                          </div>
                          <div className="pengaturan-form-group">
                            <label className="pengaturan-label" style={{ fontSize: "14px" }}>Harga</label>
                            <InputNumber
                              className="pengaturan-input"
                              value={item.harga || null}
                              onValueChange={(e) => {
                                const newBundling = [...(pengaturanForm.bundling || [])];
                                newBundling[index] = { ...newBundling[index], harga: e.value };
                                handlePengaturanChange("bundling", newBundling);
                              }}
                              placeholder="Masukkan harga bundling"
                              mode="currency"
                              currency="IDR"
                              locale="id-ID"
                              useGrouping={true}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newBundling = (pengaturanForm.bundling || []).filter((_, i) => i !== index);
                              handlePengaturanChange("bundling", newBundling);
                            }}
                            style={{
                              marginTop: "8px",
                              padding: "6px 12px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newBundling = [...(pengaturanForm.bundling || []), { nama: "", harga: null }];
                          handlePengaturanChange("bundling", newBundling);
                        }}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#F1A124",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500"
                        }}
                      >
                        + Tambah Bundling
                      </button>
                    </div>
                  )}

                  {/* JADWAL PRODUK */}
                  <div className="pengaturan-form-group" style={{ marginTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <label className="pengaturan-label" style={{ marginBottom: 0 }}>
                        Jadwal Produk
                      </label>
                      <Button
                        type="button"
                        icon="pi pi-plus"
                        label="Tambah"
                        className="p-button-outlined p-button-xs"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => {
                          const newJadwal = [...(pengaturanForm.jadwal || []), { nama_jadwal: "", waktu_mulai: null, waktu_selesai: null, kuota: 9999, status: "A" }];
                          handlePengaturanChange("jadwal", newJadwal);
                        }}
                      />
                    </div>

                    <div className="jadwal-list-builder" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(pengaturanForm.jadwal || []).map((j, i) => (
                        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#f9fafb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Jadwal {i + 1}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="pengaturan-form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Nama Jadwal</label>
                              <InputText
                                className="pengaturan-input p-inputtext-sm"
                                value={j.nama_jadwal}
                                onChange={(e) => {
                                  const newJadwal = [...pengaturanForm.jadwal];
                                  newJadwal[i].nama_jadwal = e.target.value;
                                  handlePengaturanChange("jadwal", newJadwal);
                                }}
                                placeholder="Nama Jadwal (e.g. Batch 1)"
                                style={{ fontSize: '13px' }}
                              />
                            </div>

                            <div className="pengaturan-form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Mulai</label>
                              <Calendar
                                className="p-inputtext-sm"
                                value={j.waktu_mulai}
                                showTime
                                hourFormat="24"
                                onChange={(e) => {
                                  const newJadwal = [...pengaturanForm.jadwal];
                                  newJadwal[i].waktu_mulai = e.value;
                                  handlePengaturanChange("jadwal", newJadwal);
                                }}
                                placeholder="Pilih Tanggal & Waktu"
                                style={{ width: '100%' }}
                                inputStyle={{ fontSize: '12px' }}
                                showButtonBar
                                footerTemplate={() => (
                                  <div style={{ padding: '8px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
                                    <Button
                                      label="OK"
                                      className="p-button-sm"
                                      style={{ backgroundColor: '#F1A124', border: 'none' }}
                                      onClick={() => {
                                        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                                      }}
                                    />
                                  </div>
                                )}
                              />
                            </div>

                            <Button
                              type="button"
                              label="Hapus Jadwal"
                              icon="pi pi-trash"
                              className="p-button-danger p-button-text p-button-sm"
                              style={{ color: '#ef4444', fontSize: '12px', padding: '4px 0', justifyContent: 'flex-start' }}
                              onClick={() => {
                                const newJadwal = pengaturanForm.jadwal.filter((_, idx) => idx !== i);
                                handlePengaturanChange("jadwal", newJadwal);
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      {(!pengaturanForm.jadwal || pengaturanForm.jadwal.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '15px', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#9ca3af', fontSize: '12px' }}>
                          Belum ada jadwal
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Munculkan di Jadwal */}
                <div className="pengaturan-section">
                  <div className="form-field-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <label className="form-label" style={{ marginBottom: "4px" }}>
                          Munculkan di Jadwal?
                        </label>
                        <p className="field-hint" style={{ marginTop: 0 }}>
                          Aktifkan jika produk ini ingin ditampilkan di halaman Jadwal Seminar.
                        </p>
                      </div>
                      <InputSwitch
                        checked={pengaturanForm.tampil_jadwal ?? true}
                        onChange={(e) => handlePengaturanChange("tampil_jadwal", e.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Penanggung Jawab */}
                <div className="pengaturan-section">
                  <div className="form-field-group">
                    <label className="form-label">
                      Penanggung Jawab (Assign By) <span className="required">*</span>
                    </label>
                    <MultiSelect
                      className="w-full form-input"
                      value={pengaturanForm.assign}
                      options={userOptions}
                      onChange={(e) => handlePengaturanChange("assign", e.value || [])}
                      placeholder="Pilih penanggung jawab produk"
                      display="chip"
                      showClear
                      filter
                      filterPlaceholder="Cari user..."
                    />
                    <p className="field-hint">Pilih user yang bertanggung jawab menangani produk ini</p>
                  </div>
                </div>

                {/* Custom Payment Methods */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Opsi Metode Pembayaran</h3>
                  <p className="pengaturan-section-description">Pilih metode pembayaran apa saja yang akan aktif dan ditampilkan pada landing page ini.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={pengaturanForm.payment_methods?.manual ?? true}
                        onChange={(e) => handlePengaturanChange("payment_methods", { ...(pengaturanForm.payment_methods || { manual: true, ewallet: true, cc: true, va: true }), manual: e.target.checked })}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span>Bank Transfer (Manual)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={pengaturanForm.payment_methods?.ewallet ?? true}
                        onChange={(e) => handlePengaturanChange("payment_methods", { ...(pengaturanForm.payment_methods || { manual: true, ewallet: true, cc: true, va: true }), ewallet: e.target.checked })}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span>E-Payment (QRIS, DANA, OVO, dll)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={pengaturanForm.payment_methods?.cc ?? true}
                        onChange={(e) => handlePengaturanChange("payment_methods", { ...(pengaturanForm.payment_methods || { manual: true, ewallet: true, cc: true, va: true }), cc: e.target.checked })}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span>Credit / Debit Card</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={pengaturanForm.payment_methods?.va ?? true}
                        onChange={(e) => handlePengaturanChange("payment_methods", { ...(pengaturanForm.payment_methods || { manual: true, ewallet: true, cc: true, va: true }), va: e.target.checked })}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span>Virtual Account</span>
                    </label>
                  </div>
                </div>

                {/* Divider untuk memisahkan settingan produk dengan settingan landing page */}
                <div style={{
                  margin: "32px 0",
                  borderTop: "2px solid #e5e7eb",
                  paddingTop: "24px"
                }}>
                  <div style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "16px"
                  }}>
                    Pengaturan Landing Page
                  </div>
                </div>

                {/* Page Title - SEO Meta Tag */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">SEO & Meta</h3>
                  <p className="pengaturan-section-description">Pengaturan untuk SEO dan meta tag halaman - Optimalkan untuk Google, DuckDuckGo, dan semua search engine</p>

                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className="pengaturan-label">
                        Page Title (Browser Tab Title) <span style={{ color: "#F1A124", fontSize: "12px" }}>⭐ SEO Critical</span>
                      </label>
                      <span style={{
                        fontSize: "12px",
                        color: (pengaturanForm.page_title || "").length > 60 ? "#ef4444" : (pengaturanForm.page_title || "").length >= 50 ? "#10b981" : "#6b7280",
                        fontWeight: "500"
                      }}>
                        {(pengaturanForm.page_title || "").length}/60 karakter
                      </span>
                    </div>
                    <InputText
                      className="pengaturan-input"
                      value={pengaturanForm.page_title || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 60) {
                          handlePengaturanChange("page_title", value);
                        }
                      }}
                      placeholder="Contoh: BANDUNG - Seminar Ternak Properti | Daftar Sekarang"
                      maxLength={60}
                    />
                    <small className="pengaturan-hint" style={{
                      color: (pengaturanForm.page_title || "").length > 60 ? "#ef4444" : "#6b7280",
                      display: "block",
                      marginTop: "4px"
                    }}>
                      {pengaturanForm.page_title && pengaturanForm.page_title.length > 60 ? (
                        <span style={{ color: "#ef4444" }}>⚠️ Terlalu panjang! Google akan memotong di 60 karakter. Optimal: 50-60 karakter.</span>
                      ) : pengaturanForm.page_title && pengaturanForm.page_title.length < 50 ? (
                        <span>💡 Tips: Panjang optimal 50-60 karakter untuk tampil sempurna di Google Search Results. Judul ini akan muncul di browser tab dan hasil pencarian Google, DuckDuckGo, dan semua search engine.</span>
                      ) : (
                        <span>✅ Panjang optimal! Judul ini akan muncul di browser tab dan hasil pencarian Google, DuckDuckGo, dan semua search engine. Jika kosong, akan menggunakan nama produk.</span>
                      )}
                    </small>
                  </div>
                </div>

                {/* Background Color */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Tampilan</h3>
                  <p className="pengaturan-section-description">Pengaturan tampilan halaman landing page</p>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Background Color
                    </label>

                    {/* Modern Background Color Picker */}
                    <div className="modern-bg-color-picker" ref={bgColorPickerRef}>
                      {/* Current Color Preview */}
                      <div
                        className="modern-bg-color-preview"
                        style={{ backgroundColor: pengaturanForm.background_color || "#ffffff" }}
                        onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                      >
                        <div className="modern-bg-color-preview-inner">
                          <span className="modern-bg-color-hex">
                            {pengaturanForm.background_color || "#ffffff"}
                          </span>
                          <ChevronDown size={16} />
                        </div>
                      </div>

                      {/* Color Picker Dropdown */}
                      {showBgColorPicker && (
                        <div className="modern-bg-color-picker-popup">
                          <div className="modern-bg-color-header">
                            <span>Pilih Warna Background</span>
                            <button
                              className="modern-bg-color-close"
                              onClick={() => setShowBgColorPicker(false)}
                            >
                              <X size={16} />
                            </button>
                          </div>

                          {/* Preset Colors Grid */}
                          <div className="modern-bg-color-presets">
                            <div className="modern-bg-color-presets-label">Warna Cepat</div>
                            <div className="modern-bg-color-presets-grid">
                              {presetBgColors.map((color, idx) => (
                                <button
                                  key={idx}
                                  className={`modern-bg-color-preset-item ${(pengaturanForm.background_color || "#ffffff") === color.value ? "selected" : ""
                                    }`}
                                  style={{ backgroundColor: color.value }}
                                  onClick={() => {
                                    handlePengaturanChange("background_color", color.value);
                                    setShowBgColorPicker(false);
                                  }}
                                  title={color.name}
                                >
                                  {(pengaturanForm.background_color || "#ffffff") === color.value && (
                                    <div className="modern-bg-color-check">✓</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="modern-bg-color-divider"></div>

                          {/* Custom Color Picker */}
                          <div className="modern-bg-color-custom">
                            <div className="modern-bg-color-custom-label">Warna Kustom</div>
                            <div className="modern-bg-color-custom-picker">
                              <input
                                type="color"
                                value={pengaturanForm.background_color || "#ffffff"}
                                onChange={(e) => handlePengaturanChange("background_color", e.target.value)}
                                className="modern-bg-color-input"
                              />
                              <InputText
                                className="pengaturan-input"
                                value={pengaturanForm.background_color || "#ffffff"}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === "") {
                                    handlePengaturanChange("background_color", value || "#ffffff");
                                  }
                                }}
                                placeholder="#ffffff"
                                style={{ flex: 1, fontFamily: "monospace" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <small className="pengaturan-hint">Pilih warna background untuk halaman landing page</small>
                  </div>

                  <div className="pengaturan-form-group" style={{ marginTop: "20px" }}>
                    <label className="pengaturan-label">Jarak antar komponen (px)</label>
                    <InputNumber
                      className="pengaturan-input"
                      value={pengaturanForm.preview_component_gap ?? 24}
                      onValueChange={(e) => handlePengaturanChange("preview_component_gap", e.value != null ? e.value : 24)}
                      min={0}
                      max={120}
                    />
                    <small className="pengaturan-hint">Jarak vertikal antara blok di preview dan di halaman produk publik</small>
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Jarak antar paragraf teks (px)</label>
                    <InputNumber
                      className="pengaturan-input"
                      value={pengaturanForm.preview_text_paragraph_gap ?? 8}
                      onValueChange={(e) => handlePengaturanChange("preview_text_paragraph_gap", e.value != null ? e.value : 8)}
                      min={0}
                      max={64}
                    />
                    <small className="pengaturan-hint">Jarak antar paragraf pada komponen Teks (rich text)</small>
                  </div>
                </div>

                {/* Tags Section */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Tags</h3>
                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <Tag size={16} color="#F1A124" />
                      <button
                        type="button"
                        onClick={() => {
                          const newTags = [...(pengaturanForm.tags || []), ""];
                          handlePengaturanChange("tags", newTags);
                        }}
                        style={{
                          color: "#F1A124",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          padding: 0
                        }}
                      >
                        Add Tag
                      </button>
                    </div>
                    {(pengaturanForm.tags || []).map((tag, index) => (
                      <div key={index} style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
                        <InputText
                          className="pengaturan-input"
                          value={tag}
                          onChange={(e) => {
                            const newTags = [...(pengaturanForm.tags || [])];
                            newTags[index] = e.target.value;
                            handlePengaturanChange("tags", newTags);
                          }}
                          placeholder="Masukkan tag"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = (pengaturanForm.tags || []).filter((_, i) => i !== index);
                            handlePengaturanChange("tags", newTags);
                          }}
                          style={{
                            padding: "8px 12px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO Metadata Section */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Pengaturan SEO Metadata</h3>
                  <p className="pengaturan-section-description" style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
                    Optimalkan untuk Google, DuckDuckGo, Bing, dan semua search engine. Field ini akan digunakan sebagai meta tags di HTML untuk meningkatkan ranking di hasil pencarian.
                  </p>

                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className="pengaturan-label">
                        Judul Tag (SEO Title) <span style={{ color: "#F1A124", fontSize: "12px" }}>⭐ SEO Critical</span>
                      </label>
                      <span style={{
                        fontSize: "12px",
                        color: (pengaturanForm.seo_title || "").length > 60 ? "#ef4444" : (pengaturanForm.seo_title || "").length >= 50 ? "#10b981" : "#6b7280",
                        fontWeight: "500"
                      }}>
                        {(pengaturanForm.seo_title || "").length}/60 karakter
                      </span>
                    </div>
                    <InputText
                      className="pengaturan-input"
                      value={pengaturanForm.seo_title || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 60) {
                          handlePengaturanChange("seo_title", value);
                        }
                      }}
                      placeholder="Contoh: Seminar Ternak Properti Bandung 2024 - Daftar Sekarang"
                      maxLength={60}
                    />
                    <small className="pengaturan-hint" style={{
                      color: (pengaturanForm.seo_title || "").length > 60 ? "#ef4444" : "#6b7280",
                      display: "block",
                      marginTop: "4px"
                    }}>
                      {pengaturanForm.seo_title && pengaturanForm.seo_title.length > 60 ? (
                        <span style={{ color: "#ef4444" }}>⚠️ Terlalu panjang! Google akan memotong di 60 karakter. Optimal: 50-60 karakter.</span>
                      ) : pengaturanForm.seo_title && pengaturanForm.seo_title.length < 50 ? (
                        <span>💡 Tips: Panjang optimal 50-60 karakter. Gunakan kata kunci utama di awal. Judul ini akan muncul sebagai &lt;title&gt; tag di HTML dan digunakan oleh semua search engine untuk indexing.</span>
                      ) : (
                        <span>✅ Panjang optimal! Judul ini akan muncul sebagai &lt;title&gt; tag di HTML dan digunakan oleh Google, DuckDuckGo, Bing, dan semua search engine untuk indexing dan ranking.</span>
                      )}
                    </small>
                  </div>

                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className="pengaturan-label">
                        Meta Description <span style={{ color: "#F1A124", fontSize: "12px" }}>⭐ SEO Critical</span>
                      </label>
                      <span style={{
                        fontSize: "12px",
                        color: (pengaturanForm.meta_description || "").length > 160 ? "#ef4444" : (pengaturanForm.meta_description || "").length >= 150 ? "#10b981" : "#6b7280",
                        fontWeight: "500"
                      }}>
                        {(pengaturanForm.meta_description || "").length}/160 karakter
                      </span>
                    </div>
                    <InputTextarea
                      className="pengaturan-input"
                      value={pengaturanForm.meta_description || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 160) {
                          handlePengaturanChange("meta_description", value);
                        }
                      }}
                      placeholder="Contoh: Daftar Seminar Ternak Properti di Bandung 2024. Pelajari strategi investasi properti terbaik dari para ahli. Harga spesial, tempat terbatas!"
                      rows={4}
                      style={{ resize: "vertical" }}
                      maxLength={160}
                    />
                    <small className="pengaturan-hint" style={{
                      color: (pengaturanForm.meta_description || "").length > 160 ? "#ef4444" : "#6b7280",
                      display: "block",
                      marginTop: "4px"
                    }}>
                      {pengaturanForm.meta_description && pengaturanForm.meta_description.length > 160 ? (
                        <span style={{ color: "#ef4444" }}>⚠️ Terlalu panjang! Google akan memotong di 160 karakter. Optimal: 150-160 karakter.</span>
                      ) : pengaturanForm.meta_description && pengaturanForm.meta_description.length < 150 ? (
                        <span>💡 Tips: Panjang optimal 150-160 karakter. Gunakan kalimat yang menarik dengan call-to-action. Deskripsi ini akan muncul di hasil pencarian Google, DuckDuckGo, dan semua search engine sebagai snippet.</span>
                      ) : (
                        <span>✅ Panjang optimal! Deskripsi ini akan muncul di hasil pencarian Google, DuckDuckGo, Bing, dan semua search engine sebagai snippet. Buat deskripsi yang menarik dan informatif untuk meningkatkan click-through rate.</span>
                      )}
                    </small>
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Upload Meta Gambar</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handlePengaturanChange("meta_image", event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="component-file-input"
                      id="meta-image-upload"
                    />
                    <label htmlFor="meta-image-upload" className="meta-upload-label">
                      <ImageIcon size={32} color="#F1A124" />
                      <span>Upload Meta Gambar</span>
                      <small>.jpg, .jpeg, .png, .webp</small>
                    </label>
                    {pengaturanForm.meta_image && (
                      <div style={{ marginTop: "8px" }}>
                        <img src={buildImageUrl(pengaturanForm.meta_image)} alt="Meta preview" style={{ maxWidth: "100%", borderRadius: "6px", maxHeight: "200px" }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Sections */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Pratinjau</h3>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label" style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Pratinjau di Google Search</label>
                    <div style={{
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "20px", color: "#F1A124", marginBottom: "4px", fontWeight: "400" }}>
                        {pengaturanForm.seo_title || "Produk Baru"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#006621" }}>
                        {pengaturanForm.kode ? `https://app.ternakproperti.com/product/${pengaturanForm.kode}` : "https://app.ternakproperti.com/product/landing-page-baru"}
                      </div>
                    </div>
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label" style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Pratinjau di Sosial Media</label>
                    <div style={{
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "16px", color: "#1f2937", marginBottom: "4px", fontWeight: "500" }}>
                        {pengaturanForm.seo_title || "Produk Baru"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {pengaturanForm.kode ? `https://app.ternakproperti.com/product/${pengaturanForm.kode}` : "https://app.ternakproperti.com/product/landing-page-baru"}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Loading Logo Section - KOMENTAR DULU
                <div className="pengaturan-section">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <h3 className="pengaturan-section-title" style={{ margin: 0 }}>Loading Logo</h3>
                    <Info size={16} color="#6b7280" />
                  </div>
                  <div className="pengaturan-form-group">
                    <input
                      type="file"
                      accept=".png,.jpeg,.jpg,.webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handlePengaturanChange("loading_logo", event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="component-file-input"
                      id="loading-logo-upload"
                    />
                    <label htmlFor="loading-logo-upload" className="meta-upload-label">
                      <ImageIcon size={32} color="#F1A124" />
                      <span>Upload Loading Logo</span>
                      <small>.png, .jpeg, .jpg, .webp</small>
                    </label>
                    {pengaturanForm.loading_logo && (
                      <div style={{ marginTop: "8px" }}>
                        <img src={pengaturanForm.loading_logo} alt="Loading logo preview" style={{ maxWidth: "100%", borderRadius: "6px", maxHeight: "200px" }} />
                      </div>
                    )}
                  </div>
                </div>
                */}

                {/* Settings Toggles */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Pengaturan</h3>

                  {/* Matikan Search Engine Crawler - KOMENTAR DULU
                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label className="pengaturan-label" style={{ margin: 0 }}>Matikan Search Engine Crawler</label>
                        <Info size={16} color="#6b7280" />
                      </div>
                      <InputSwitch
                        checked={pengaturanForm.disable_crawler || false}
                        onChange={(e) => handlePengaturanChange("disable_crawler", e.value)}
                      />
                    </div>
                  </div>
                  */}

                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label className="pengaturan-label" style={{ margin: 0 }}>Matikan Fungsi Klik Kanan</label>
                        <Info size={16} color="#6b7280" />
                      </div>
                      <InputSwitch
                        checked={pengaturanForm.disable_rightclick || false}
                        onChange={(e) => handlePengaturanChange("disable_rightclick", e.value)}
                      />
                    </div>
                  </div>

                  {/* HTML Language - KOMENTAR DULU
                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">HTML Language</label>
                    <Dropdown
                      className="pengaturan-input"
                      value={pengaturanForm.html_language || "id"}
                      options={[
                        { label: "Indonesian", value: "id" },
                        { label: "English", value: "en" },
                        { label: "Arabic", value: "ar" },
                        { label: "Chinese", value: "zh" },
                        { label: "Japanese", value: "ja" }
                      ]}
                      onChange={(e) => handlePengaturanChange("html_language", e.value)}
                    />
                  </div>
                  */}
                </div>

                {/* Speed Boost Section - KOMENTAR DULU
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Speed Boost</h3>

                  <div className="pengaturan-form-group">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label className="pengaturan-label" style={{ margin: 0 }}>Matikan Custom Font</label>
                      <InputSwitch
                        checked={pengaturanForm.disable_custom_font || false}
                        onChange={(e) => handlePengaturanChange("disable_custom_font", e.value)}
                      />
                    </div>
                  </div>
                </div>
                */}

                {/* Analytics - Facebook */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Facebook</h3>
                  
                  {/* Master Meta Pixel dari backend */}
                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Meta Pixel (Facebook Pixel ID)</label>
                    <MultiSelect
                      className="w-full form-input"
                      value={
                        Array.isArray(pengaturanForm.facebook_pixels)
                          ? pengaturanForm.facebook_pixels.filter(Boolean)
                          : []
                      }
                      options={metaPixelOptions}
                      onChange={(e) =>
                        handlePengaturanChange(
                          "facebook_pixels",
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
                </div>



                {/* Analytics - Google */}
                <div className="pengaturan-section">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <h3 className="pengaturan-section-title" style={{ margin: 0 }}>Google</h3>
                    <button
                      type="button"
                      onClick={() => {
                        handlePengaturanChange("google_gtm", "");
                      }}
                      style={{
                        color: "#F1A124",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        padding: 0
                      }}
                    >
                      + Tambah
                    </button>
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Google Tag Manager</label>
                    <Dropdown
                      className="pengaturan-input"
                      value={pengaturanForm.google_gtm || ""}
                      options={[
                        { label: "Tidak menggunakan GTM", value: "" },
                        { label: "GTM-XXXXXXX", value: "GTM-XXXXXXX" }
                      ]}
                      onChange={(e) => handlePengaturanChange("google_gtm", e.value)}
                      placeholder="Tidak menggunakan GTM"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Right Canvas - Preview + simulasi perangkat */}
        <div className="page-builder-canvas">
          <div className="preview-device-toolbar">
            <span className="preview-device-toolbar-label">Simulasi tampilan</span>
            <div className="preview-device-tabs" role="tablist" aria-label="Ukuran preview landing page">
              {[
                { id: "mobile", label: "Mobile", Icon: Smartphone },
                { id: "tablet", label: "Tablet", Icon: Tablet },
                { id: "laptop", label: "Laptop", Icon: Laptop },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={previewDevice === id}
                  className={`preview-device-tab ${previewDevice === id ? "is-active" : ""}`}
                  onClick={() => setPreviewDevice(id)}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="preview-device-stage">
            <div className={`preview-device-frame preview-device-frame--${previewDevice}`}>
              <div
                className="canvas-wrapper"
                style={{
                  backgroundColor: pengaturanForm.background_color || "#ffffff"
                }}
              >
                {/* Logo - Hardcode di bagian atas center */}
                <div className="canvas-logo-wrapper">
                  <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="canvas-logo"
                  />
                </div>

                {/* Content Area */}
                <div
                  className="canvas-content-area"
                  style={{
                    gap: `${Number(pengaturanForm.preview_component_gap ?? 24)}px`,
                  }}
                >
                  {/* Placeholder jika belum ada komponen */}
                  {blocks.length === 0 && !pengaturanForm.nama && (
                    <div className="canvas-empty">
                      <p>Klik &quot;Tambah Komponen Baru&quot; untuk memulai</p>
                    </div>
                  )}

                  {/* Preview komponen - hanya render blocks NON-CHILD */}
                  {/* ✅ RULE: Child component TIDAK BOLEH dirender oleh root renderer */}
                  {/* ✅ Hanya section yang boleh render child blocks */}
                  {/* ✅ FIX UTAMA: Filter blocks yang punya parentId - TIDAK BOLEH dirender di root */}
                  {blocks
                    .filter(block => {
                      if (!block || !block.type) return false;

                      // ✅ ARSITEKTUR BENAR: Hanya child yang di-skip (bukan section)
                      // Section boleh punya parentId jika nested, tapi child tidak boleh dirender di root
                      if (block.parentId && block.type !== 'section') {
                        return false;
                      }

                      return true;
                    })
                    .map((block) => (
                      <div
                        key={block.id}
                        className="canvas-preview-block"
                        onClick={() => {
                          // Scroll ke komponen di sidebar
                          const componentElement = componentRefs.current[block.id];
                          if (componentElement) {
                            componentElement.scrollIntoView({ behavior: "smooth", block: "center" });
                            // Expand komponen jika collapsed
                            if (collapsedBlockIds.has(block.id)) {
                              handleToggleExpand(block.id);
                            }
                          }
                        }}
                        style={{ cursor: "pointer" }}
                        title="Klik untuk scroll ke komponen di sidebar"
                      >
                        {renderPreview(block)}
                      </div>
                    ))}
                </div>
              </div>

              {/* Fixed-bottom buttons: sticky di bawah frame preview */}
              {blocks
                .filter(block => block?.type === 'button' && block?.data?.fixedBottom && !block?.parentId)
                .map(block => {
                  const bd = block.data || {};
                  const btnInline = buildLandingButtonInlineStyle(bd);
                  const preset = bd.style || 'primary';
                  return (
                    <div
                      key={`fixed-${block.id}`}
                      style={{
                        position: 'sticky',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 200,
                        padding: 0,
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        pointerEvents: 'auto',
                      }}
                      onClick={() => {
                        const componentElement = componentRefs.current[block.id];
                        if (componentElement) {
                          componentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          if (collapsedBlockIds.has(block.id)) handleToggleExpand(block.id);
                        }
                      }}
                      title="Klik untuk scroll ke komponen di sidebar"
                    >
                      <button
                        type="button"
                        className={`preview-button preview-button-${preset}`}
                        style={{ ...btnInline, borderRadius: 0, width: '100%', margin: 0 }}
                      >
                        {bd.text || 'Klik Disini'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Component Selection Modal - Simple */}
      {showComponentModal && (
        <div className="simple-modal-overlay" onClick={() => setShowComponentModal(false)}>
          <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="simple-modal-header">
              <h2 className="simple-modal-title">Pilih Komponen</h2>
              <button
                className="simple-modal-close"
                onClick={() => setShowComponentModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="simple-modal-content">
              {renderComponentGrid()}
            </div>

            {/* Footer */}
            <div className="simple-modal-footer">
              <button
                className="simple-modal-cancel"
                onClick={() => setShowComponentModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Exit */}
      {showExitModal && (
        <div
          className="exit-confirm-modal-overlay"
          onClick={(e) => {
            // Tutup modal jika klik di overlay (bukan di modal content)
            if (e.target === e.currentTarget) {
              setShowExitModal(false);
            }
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            className="exit-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
          >
            {/* Header dengan X button */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "#111827",
              }}>
                Yakin Exit?
              </h3>
              <button
                onClick={() => setShowExitModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#111827"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Text "Save dulu lah!" */}
            <p style={{
              margin: "0 0 24px 0",
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.5,
            }}>
              Save dulu lah!
            </p>

            {/* Button Actions */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={handleExitWithoutSave}
                disabled={isSaving}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isSaving ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }
                }}
              >
                Exit
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#F1A124",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isSaving ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = "#d68910";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = "#F1A124";
                  }
                }}
              >
                {isSaving ? "Menyimpan..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

