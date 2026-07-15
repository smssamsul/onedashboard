"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Type, Image as ImageIcon, FileText, List, MessageSquare,
  HelpCircle, Image as SliderIcon, Youtube, Link as LinkIcon,
  MapPin, Film, Minus, Code, X, ArrowLeft, Upload,
  Smartphone, Tablet, Laptop, MousePointerClick
} from "lucide-react";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import OngkirCalculator from "@/components/OngkirCalculator";
import {
  TextComponent,
  ImageComponent,
  VideoComponent,
  TestimoniComponent,
  ListComponent,
  FormComponent,
  FAQComponent,
  SliderComponent,
  ButtonComponent,
  EmbedComponent,
  SectionComponent,
  HTMLComponent,
  DividerComponent,
  ScrollTargetComponent,
  AnimationComponent,
} from './components';
import "@/styles/sales/add-products3.css";
import { buildLandingButtonInlineStyle } from "@/lib/landingPageButtonStyle";
import "@/styles/ongkir.css";

// Komponen yang tersedia sesuai gambar
const COMPONENT_CATEGORIES = {
  seringDigunakan: {
    label: "Sering Digunakan",
    components: [
      { id: "text", name: "Teks", icon: Type, color: "#3b82f6" },
      { id: "image", name: "Gambar", icon: ImageIcon, color: "#10b981" },
    ]
  },
  formPemesanan: {
    label: "Form Pemesanan Online",
    components: [
      { id: "form", name: "Form Pemesanan", icon: FileText, color: "#8b5cf6" },
      { id: "list", name: "Daftar", icon: List, color: "#f59e0b" },
      { id: "testimoni", name: "Testimoni", icon: MessageSquare, color: "#ec4899" },
      { id: "faq", name: "FAQ", icon: HelpCircle, color: "#06b6d4" },
    ]
  },
  salesPage: {
    label: "Sales Page",
    components: [
      { id: "slider", name: "Gambar Slider", icon: SliderIcon, color: "#ef4444" },
      { id: "button", name: "Tombol", icon: MousePointerClick, color: "#F1A124" },
      { id: "youtube", name: "YouTube", icon: Youtube, color: "#dc2626" },
      { id: "embed", name: "Embed", icon: LinkIcon, color: "#6366f1" },
      { id: "scroll-target", name: "Scroll Target", icon: MapPin, color: "#14b8a6" },
      { id: "animation", name: "Animation", icon: Film, color: "#a855f7" },
    ]
  },
  lainnya: {
    label: "Lainnya",
    components: [
      { id: "section", name: "Section", icon: Minus, color: "#64748b" },
      { id: "html", name: "HTML", icon: Code, color: "#475569" },
      { id: "divider", name: "Divider", icon: Minus, color: "#94a3b8" },
    ]
  }
};

export default function AddProducts3Page() {
  const router = useRouter();
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("laptop");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [expandedBlockId, setExpandedBlockId] = useState(null);
  const [testimoniIndices, setTestimoniIndices] = useState({});
  const [productKategori, setProductKategori] = useState(null); // Untuk menentukan kategori produk
  const [activeTab, setActiveTab] = useState("konten"); // State untuk tab aktif

  // Ref untuk input file import template
  const importFileInputRef = useRef(null);

  // State untuk form pengaturan
  const [pengaturanForm, setPengaturanForm] = useState({
    nama: "",
    kategori: null,
    kode: "",
    url: "",
    harga_asli: null,
    harga_promo: null,
    assign: [],
    jadwal: [] // [{ nama_jadwal, waktu_mulai, waktu_selesai, kuota, status }]
  });

  // Export Template ke file JSON
  const handleExportTemplate = () => {
    try {
      const templateData = JSON.stringify(blocks, null, 2);
      const blob = new Blob([templateData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `landingpage-template-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Template JSON berhasil didownload!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Gagal export template");
    }
  };

  // Import Template dari file JSON
  const handleImportTemplateFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsedData = JSON.parse(text);
      if (!Array.isArray(parsedData)) {
        toast.error("Format JSON tidak valid (harus array blocks)!");
        return;
      }
      setBlocks(parsedData);
      toast.success("Template berhasil diimport dari file!");
    } catch (err) {
      console.error("Import file error:", err);
      toast.error("Gagal import: JSON tidak valid");
    } finally {
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    }
  };

  // State untuk options dropdown
  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);

  // Default data untuk setiap komponen
  const getDefaultData = (componentId) => {
    const defaults = {
      text: { content: "" },
      image: { src: "", alt: "", caption: "" },
      video: { url: "" },
      testimoni: { items: [] },
      list: { items: [] },
      form: { kategori: null }, // Kategori untuk form pemesanan
      faq: { items: [] },
      slider: { images: [] },
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
      section: { background: "#ffffff", padding: "20px" },
      html: { code: "" },
      divider: { style: "solid", color: "#e5e7eb" },
      "scroll-target": { target: "" },
      animation: { type: "fade" },
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
    };

    setBlocks([...blocks, newBlock]);
    setExpandedBlockId(newBlock.id); // Expand komponen baru yang ditambahkan
    setShowComponentModal(false);
  };

  // Handler untuk update block data
  const handleUpdateBlock = (blockId, newData) => {
    setBlocks(blocks.map(block =>
      block.id === blockId
        ? { ...block, data: { ...block.data, ...newData } }
        : block
    ));
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
    setExpandedBlockId(expandedBlockId === blockId ? null : blockId);
  };

  // Render komponen form editing di sidebar
  const renderComponent = (block, index) => {
    const isExpanded = expandedBlockId === block.id;

    const commonProps = {
      data: block.data,
      onUpdate: (newData) => handleUpdateBlock(block.id, newData),
      blockId: block.id,
      index: index,
      onMoveUp: () => moveBlock(block.id, 'up'),
      onMoveDown: () => moveBlock(block.id, 'down'),
      onDelete: () => deleteBlock(block.id),
      isExpanded: isExpanded,
      onToggleExpand: () => handleToggleExpand(block.id),
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
        return <SectionComponent {...commonProps} />;
      case "html":
        return <HTMLComponent {...commonProps} />;
      case "divider":
        return <DividerComponent {...commonProps} />;
      case "scroll-target":
        return <ScrollTargetComponent {...commonProps} />;
      case "animation":
        return <AnimationComponent {...commonProps} />;
      default:
        return <div>Unknown component: {block.type}</div>;
    }
  };

  // Render preview di canvas
  const renderPreview = (block) => {
    switch (block.type) {
      case "text":
        return <div className="preview-text">{block.data.content || "Teks..."}</div>;
      case "image":
        return block.data.src ? (
          <div className="preview-image-wrapper">
            <img src={block.data.src} alt={block.data.alt || ""} className="preview-image-full" />
            {block.data.caption && <p className="preview-caption">{block.data.caption}</p>}
          </div>
        ) : (
          <div className="preview-placeholder">Gambar belum diupload</div>
        );
      case "youtube":
      case "video":
        return block.data.embedUrl ? (
          <iframe src={block.data.embedUrl} title="Video" className="preview-video-iframe" allowFullScreen />
        ) : (
          <div className="preview-placeholder">URL video belum diisi</div>
        );
      case "testimoni":
        const testimoniItems = block.data.items || [];
        if (testimoniItems.length === 0) {
          return <div className="preview-placeholder">Belum ada testimoni</div>;
        }

        const currentIndex = testimoniIndices[block.id] || 0;
        const maxIndex = Math.max(0, testimoniItems.length - 3);

        const handlePrev = () => {
          setTestimoniIndices(prev => ({
            ...prev,
            [block.id]: Math.max(0, currentIndex - 1)
          }));
        };

        const handleNext = () => {
          setTestimoniIndices(prev => ({
            ...prev,
            [block.id]: Math.min(maxIndex, currentIndex + 1)
          }));
        };

        return (
          <section className="preview-testimonials" aria-label="Customer testimonials">
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
                  style={{ transform: `translateX(-${currentIndex * 28}%)` }}
                >
                  {testimoniItems.map((item, i) => {
                    return (
                      <article key={i} className="testi-card-new" itemScope itemType="https://schema.org/Review">
                        <div className="testi-header-new">
                          {item.gambar ? (
                            <div className="testi-avatar-wrapper-new">
                              <img
                                src={item.gambar}
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
                            </div>
                            <div className="testi-stars-new">
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                            </div>
                          </div>
                        </div>
                        <div className="testi-desc-new" itemProp="reviewBody">{item.deskripsi || "Deskripsi testimoni"}</div>
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
        return (
          <ul className="preview-list">
            {block.data.items?.map((item, i) => (
              <li key={i}>{item.nama || `Point ${i + 1}`}</li>
            ))}
            {(!block.data.items || block.data.items.length === 0) && (
              <div className="preview-placeholder">Belum ada list point</div>
            )}
          </ul>
        );
      case "form":
        // Gunakan productKategori dari state pengaturan, bukan dari block.data.kategori
        const isFormBuku = productKategori === 13;
        const isFormWorkshop = productKategori === 15;

        return (
          <>
            {/* Form Pemesanan */}
            <section className="preview-form-section compact-form-section" aria-label="Order form">
              <h2 className="compact-form-title">Lengkapi Data:</h2>
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
                <div className="compact-field">
                  <label className="compact-label">Alamat <span className="required">*</span></label>
                  <textarea placeholder="Contoh: Jl. Peta Utara 1, No 62 RT 01/07" className="compact-input compact-textarea" rows={3} />
                </div>

                {/* Form Ongkir - Kategori Buku (13) */}
                {isFormBuku && (
                  <div className="compact-field">
                    <OngkirCalculator
                      onSelectOngkir={(info) => {
                        // Handle ongkir selection if needed
                        console.log('Ongkir selected:', info);
                      }}
                      onAddressChange={(address) => {
                        // Handle address change if needed
                        console.log('Address changed:', address);
                      }}
                      defaultCourier="jne"
                      compact={true}
                    />
                  </div>
                )}

                {/* Form Down Payment - Kategori Workshop (15) */}
                {isFormWorkshop && (
                  <div className="compact-field">
                    <label className="compact-label">
                      Jumlah Down Payment <span className="required">*</span>
                    </label>
                    <input type="text" placeholder="Rp 0" className="compact-input" />
                  </div>
                )}
              </div>
            </section>

            {/* Payment Section - Selalu muncul */}
            <section className="preview-payment-section payment-section" aria-label="Payment methods">
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

            {/* Button Pesan Sekarang */}
            <div className="preview-form-submit-wrapper">
              <button type="button" className="preview-form-submit-btn">
                Pesan Sekarang
              </button>
            </div>
          </>
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
      case "price":
        // Format harga untuk ditampilkan
        const formatHarga = (harga) => {
          if (!harga || harga === 0) return "0";
          return harga.toLocaleString("id-ID");
        };

        const hargaAsli = pengaturanForm.harga_asli || 0;
        const hargaPromo = pengaturanForm.harga_promo || 0;

        return (
          <section className="preview-price-section special-offer-card" aria-label="Special offer" itemScope itemType="https://schema.org/Offer">
            <h2 className="special-offer-title">Special Offer!</h2>
            <div className="special-offer-price">
              {hargaAsli > 0 && hargaAsli > hargaPromo && (
                <span className="price-old" aria-label="Harga lama">
                  Rp {formatHarga(hargaAsli)}
                </span>
              )}
              <span className="price-new" itemProp="price" content={hargaPromo}>
                Rp {formatHarga(hargaPromo)}
              </span>
            </div>
            <meta itemProp="priceCurrency" content="IDR" />
            <meta itemProp="availability" content="https://schema.org/InStock" />
          </section>
        );
      case "button": {
        const buttonData = block.data || {};
        const preset = buttonData.style || "primary";
        const btnInline = buildLandingButtonInlineStyle(buttonData);
        return (
          <div style={{ width: "100%", textAlign: "center", boxSizing: "border-box" }}>
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
        return <div dangerouslySetInnerHTML={{ __html: block.data.code || "" }} />;
      case "embed":
        return <div dangerouslySetInnerHTML={{ __html: block.data.code || "" }} />;
      default:
        return <div className="preview-placeholder">{block.type}</div>;
    }
  };

  // Fungsi untuk generate FAQ berdasarkan kategori
  const generateFAQByKategori = (kategoriId) => {
    // Mapping FAQ berdasarkan kategori
    const faqMap = {
      // Kategori Buku (13)
      13: [
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
      // Kategori Workshop (15)
      15: [
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
      ]
    };

    // Default FAQ untuk kategori lainnya
    const defaultFAQ = [
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

    // Return FAQ sesuai kategori, atau default jika tidak ada
    return faqMap[kategoriId] || defaultFAQ;
  };

  // Fetch kategori dan sales list options
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
          label: `${k.id} - ${k.nama}`,
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
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    }
    fetchInitialData();
  }, []);

  // Fungsi untuk generate kode dari nama (slugify)
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

  // Handler untuk update form pengaturan
  const handlePengaturanChange = (key, value) => {
    if (key === "nama") {
      // Auto-generate kode dan URL dari nama
      const kode = generateKode(value);
      const url = kode ? `/${kode}` : "";
      setPengaturanForm((prev) => ({
        ...prev,
        nama: value,
        kode: kode,
        url: url
      }));
    } else if (key === "kode") {
      // Auto-format kode secara real-time: spasi jadi dash, lowercase, hapus karakter khusus
      // Format langsung saat user mengetik
      const formattedKode = generateKode(value);
      const url = formattedKode ? `/${formattedKode}` : "";
      setPengaturanForm((prev) => ({
        ...prev,
        kode: formattedKode,
        url: url
      }));
    } else {
      setPengaturanForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  // Render grid komponen dalam modal
  const renderComponentGrid = () => {
    return (
      <div className="component-modal-content">
        {Object.entries(COMPONENT_CATEGORIES).map(([key, category]) => (
          <div key={key} className="component-category">
            <h3 className="component-category-title">{category.label}</h3>
            <div className="component-grid">
              {category.components.map((component) => {
                const IconComponent = component.icon;
                return (
                  <div
                    key={component.id}
                    className="component-item"
                    onClick={() => handleAddComponent(component.id)}
                  >
                    <div
                      className="component-icon"
                      style={{ backgroundColor: `${component.color}15` }}
                    >
                      <IconComponent
                        size={24}
                        style={{ color: component.color }}
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
      {/* Back Button */}
      <div className="page-header-section">
        <button
          className="back-to-products-btn"
          onClick={() => router.push("/sales/products")}
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="page-builder-main">
        {/* Left Sidebar - Form Editing */}
        <div className="page-builder-sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === "konten" ? "active" : ""}`}
              onClick={() => setActiveTab("konten")}
            >
              Konten
            </button>
            <button
              className={`sidebar-tab ${activeTab === "pengaturan" ? "active" : ""}`}
              onClick={() => setActiveTab("pengaturan")}
            >
              Pengaturan
            </button>
          </div>

          {/* Tab Content */}
          <div className="sidebar-content">
            {activeTab === "konten" ? (
              <>
                {/* Komponen yang sudah ditambahkan */}
                {blocks.map((block, index) => (
                  <div key={block.id} className="sidebar-component-item">
                    {renderComponent(block, index)}
                  </div>
                ))}

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

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Kategori <span className="required">*</span>
                    </label>
                    <Dropdown
                      className="pengaturan-input"
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
                      <small className="pengaturan-hint" style={{ color: "#ef4444" }}>
                        Kategori wajib dipilih
                      </small>
                    )}
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Kode Produk</label>
                    <InputText
                      className="pengaturan-input"
                      value={pengaturanForm.kode || ""}
                      onKeyDown={(e) => {
                        // Prevent spacebar dari mengetik spasi, langsung ganti dengan dash
                        if (e.key === ' ' || e.key === 'Space') {
                          e.preventDefault();
                          const input = e.target;
                          const currentValue = pengaturanForm.kode || '';
                          const cursorPos = input.selectionStart || currentValue.length;
                          const newValue = currentValue.slice(0, cursorPos) + '-' + currentValue.slice(cursorPos);
                          const formattedValue = generateKode(newValue);
                          const url = formattedValue ? `/${formattedValue}` : "";
                          setPengaturanForm((prev) => ({
                            ...prev,
                            kode: formattedValue,
                            url: url
                          }));
                          // Set cursor position setelah update
                          setTimeout(() => {
                            const newCursorPos = Math.min(cursorPos + 1, formattedValue.length);
                            input.setSelectionRange(newCursorPos, newCursorPos);
                          }, 0);
                        }
                      }}
                      onInput={(e) => {
                        // Format real-time saat mengetik: spasi langsung jadi dash, auto lowercase
                        let inputValue = e.target.value;
                        // Langsung ganti spasi dengan dash saat mengetik
                        if (inputValue.includes(' ')) {
                          inputValue = inputValue.replace(/\s/g, '-');
                        }
                        // Langsung lowercase
                        inputValue = inputValue.toLowerCase();
                        // Hapus karakter khusus selain huruf, angka, dan dash
                        inputValue = inputValue.replace(/[^a-z0-9-]/g, '');
                        // Hapus multiple dash menjadi single dash
                        inputValue = inputValue.replace(/-+/g, '-');
                        // Hapus dash di awal dan akhir
                        inputValue = inputValue.replace(/^-+|-+$/g, '');

                        // Update langsung dengan format yang sudah benar
                        const url = inputValue ? `/${inputValue}` : "";
                        setPengaturanForm((prev) => ({
                          ...prev,
                          kode: inputValue,
                          url: url
                        }));
                      }}
                      onChange={(e) => {
                        // Format real-time saat mengetik: spasi langsung jadi dash, auto lowercase
                        let inputValue = e.target.value;
                        // Langsung ganti spasi dengan dash saat mengetik
                        if (inputValue.includes(' ')) {
                          inputValue = inputValue.replace(/\s/g, '-');
                        }
                        // Langsung lowercase
                        inputValue = inputValue.toLowerCase();
                        // Hapus karakter khusus selain huruf, angka, dan dash
                        inputValue = inputValue.replace(/[^a-z0-9-]/g, '');
                        // Hapus multiple dash menjadi single dash
                        inputValue = inputValue.replace(/-+/g, '-');
                        // Hapus dash di awal dan akhir
                        inputValue = inputValue.replace(/^-+|-+$/g, '');

                        // Update langsung dengan format yang sudah benar
                        const url = inputValue ? `/${inputValue}` : "";
                        setPengaturanForm((prev) => ({
                          ...prev,
                          kode: inputValue,
                          url: url
                        }));
                      }}
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

                {/* Harga Asli */}
                <div className="pengaturan-section">
                  <h3 className="pengaturan-section-title">Harga Asli</h3>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">Harga Asli</label>
                    <InputNumber
                      className="pengaturan-input"
                      value={pengaturanForm.harga_asli}
                      onValueChange={(e) => handlePengaturanChange("harga_asli", e.value)}
                      placeholder="Masukkan harga asli"
                      mode="currency"
                      currency="IDR"
                      locale="id-ID"
                      useGrouping={true}
                    />
                  </div>

                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Harga Promo <span className="required">*</span>
                    </label>
                    <InputNumber
                      className="pengaturan-input"
                      value={pengaturanForm.harga_promo}
                      onValueChange={(e) => handlePengaturanChange("harga_promo", e.value)}
                      placeholder="Masukkan harga promo"
                      mode="currency"
                      currency="IDR"
                      locale="id-ID"
                      useGrouping={true}
                    />
                  </div>

                  {/* JADWAL / TANGGAL EVENT (MULTIPLE) */}
                  <div className="pengaturan-form-group" style={{ marginTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <label className="pengaturan-label" style={{ marginBottom: 0 }}>
                        Jadwal / Tanggal Event
                      </label>
                      <Button
                        type="button"
                        icon="pi pi-plus"
                        label="Tambah"
                        className="p-button-outlined p-button-xs"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => {
                          const newJadwal = [...(pengaturanForm.jadwal || []), { nama_jadwal: "", waktu_mulai: null, waktu_selesai: null, kuota: null, status: "A" }];
                          handlePengaturanChange("jadwal", newJadwal);
                        }}
                      />
                    </div>

                    <div className="jadwal-list-builder" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(pengaturanForm.jadwal || []).map((j, i) => (
                        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', background: '#f9fafb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Jadwal {i + 1}</span>
                            <Button
                              type="button"
                              icon="pi pi-trash"
                              className="p-button-danger p-button-text p-button-xs"
                              style={{ padding: '0', height: '20px', width: '20px' }}
                              onClick={() => {
                                const newJadwal = pengaturanForm.jadwal.filter((_, idx) => idx !== i);
                                handlePengaturanChange("jadwal", newJadwal);
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                                placeholder="Mulai"
                                style={{ width: '100%' }}
                                inputStyle={{ fontSize: '12px' }}
                              />
                              <Calendar
                                className="p-inputtext-sm"
                                value={j.waktu_selesai}
                                showTime
                                hourFormat="24"
                                onChange={(e) => {
                                  const newJadwal = [...pengaturanForm.jadwal];
                                  newJadwal[i].waktu_selesai = e.value;
                                  handlePengaturanChange("jadwal", newJadwal);
                                }}
                                placeholder="Selesai"
                                style={{ width: '100%' }}
                                inputStyle={{ fontSize: '12px' }}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <InputNumber
                                className="p-inputtext-sm"
                                value={j.kuota}
                                onValueChange={(e) => {
                                  const newJadwal = [...pengaturanForm.jadwal];
                                  newJadwal[i].kuota = e.value;
                                  handlePengaturanChange("jadwal", newJadwal);
                                }}
                                placeholder="Kuota"
                                style={{ width: '100%' }}
                                inputStyle={{ fontSize: '12px' }}
                              />
                              <Dropdown
                                className="p-inputtext-sm"
                                value={j.status || "A"}
                                options={[
                                  { label: "Aktif", value: "A" },
                                  { label: "Non-Aktif", value: "N" }
                                ]}
                                onChange={(e) => {
                                  const newJadwal = [...pengaturanForm.jadwal];
                                  newJadwal[i].status = e.value;
                                  handlePengaturanChange("jadwal", newJadwal);
                                }}
                                style={{ width: '100%', fontSize: '12px' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Penanggung Jawab */}
                <div className="pengaturan-section">
                  <div className="pengaturan-form-group">
                    <label className="pengaturan-label">
                      Penanggung Jawab (Assign By) <span className="required">*</span>
                    </label>
                    <MultiSelect
                      className="pengaturan-input"
                      value={pengaturanForm.assign}
                      options={userOptions}
                      onChange={(e) => handlePengaturanChange("assign", e.value || [])}
                      placeholder="Pilih penanggung jawab produk"
                      display="chip"
                      showClear
                      filter
                      filterPlaceholder="Cari user..."
                    />
                    <p className="pengaturan-hint">Pilih user yang bertanggung jawab menangani produk ini</p>
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
              <div className="canvas-wrapper">
                {/* Nama Produk - Selalu muncul di paling atas, tidak bisa dipindahkan */}
                {pengaturanForm.nama && (
                  <div className="canvas-preview-block canvas-product-title-block">
                    <h1 className="preview-product-title">{pengaturanForm.nama}</h1>
                  </div>
                )}

                {/* Placeholder jika belum ada komponen */}
                {blocks.length === 0 && !pengaturanForm.nama && (
                  <div className="canvas-empty">
                    <p>Klik "Tambah Komponen Baru" untuk memulai</p>
                  </div>
                )}

                {/* Preview komponen */}
                {blocks.map((block) => (
                  <div key={block.id} className="canvas-preview-block">
                    {renderPreview(block)}
                  </div>
                ))}
              </div>
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
    </div>
  );
}

