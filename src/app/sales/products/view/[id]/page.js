"use client";

import { useEffect, useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getProductById } from "@/lib/sales/products";
import { getUsers } from "@/lib/users";
import FollowupSection from "./FollowupSection";
import LinkZoomSection from "./LinkZoomSection";
import TrainerSection from "./TrainerSection";
import ArticleSection from "./ArticleSection";
import KnowledgeSection from "./KnowledgeSection";
import {
  ArrowLeft, Package, Tag, DollarSign, Calendar,
  Globe, User, CheckCircle2, XCircle, FileText,
  Image as ImageIcon, Video, MessageSquare, List,
  Edit, ExternalLink, Copy, Eye, Users, Brain
} from "lucide-react";
import "@/styles/sales/product-detail.css";

// Helper function untuk build image URL via proxy
const buildImageUrl = (path) => {
  if (!path) return null;

  // Jika path sudah full URL, return langsung
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Bersihkan path dari prefix yang tidak diperlukan
  let cleanPath = path.replace(/^\/?(storage\/)?/, "");

  // Pastikan path tidak kosong
  if (!cleanPath || cleanPath.trim() === "") {
    return null;
  }

  return `/api/image?path=${encodeURIComponent(cleanPath)}`;
};

// Safe parse JSON dengan fallback
const safeParse = (value, fallback = []) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  if (Array.isArray(value)) return value;
  return fallback;
};

// Format currency
const formatCurrency = (value) => {
  if (!value) return "0";
  return Number(value).toLocaleString("id-ID");
};

export default function DetailProdukPage({ params }) {
  const resolved = React.use(params);
  const { id } = resolved;
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignUsers, setAssignUsers] = useState([]);
  const [loadingAssign, setLoadingAssign] = useState(false);

  // TAB STATE
  const [activeTab, setActiveTab] = useState("detail");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getProductById(id);
        console.log("📦 [VIEW PRODUCT] Fetched data:", data);
        console.log("📦 [VIEW PRODUCT] Data type:", Array.isArray(data) ? "array" : typeof data);
        console.log("📦 [VIEW PRODUCT] Nama produk:", data?.nama);
        console.log("📦 [VIEW PRODUCT] Header:", data?.header);
        console.log("📦 [VIEW PRODUCT] Gambar:", data?.gambar);

        if (!data) {
          console.error("❌ [VIEW PRODUCT] No data received");
          return;
        }

        setProduct(data);
      } catch (err) {
        console.error("❌ Error fetching detail:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Fetch assign users
  useEffect(() => {
    async function fetchAssignUsers() {
      if (!product || !product.assign) return;

      try {
        setLoadingAssign(true);
        const users = await getUsers();

        // Parse assign - bisa array atau JSON string
        let assignIds = [];
        if (Array.isArray(product.assign)) {
          assignIds = product.assign;
        } else if (typeof product.assign === 'string') {
          try {
            assignIds = JSON.parse(product.assign);
          } catch {
            assignIds = [];
          }
        }

        // Filter users berdasarkan assign IDs
        const assigned = users.filter(user =>
          assignIds.includes(user.id) || assignIds.includes(String(user.id))
        );

        setAssignUsers(assigned);
      } catch (err) {
        console.error("❌ Error fetching assign users:", err);
      } finally {
        setLoadingAssign(false);
      }
    }

    fetchAssignUsers();
  }, [product]);

  if (loading) return <Layout>Memuat detail produk...</Layout>;
  if (!product) return <Layout>Produk tidak ditemukan.</Layout>;

  // Parse JSON fields dengan safe parse
  const gallery = safeParse(product.gambar, []);
  const testimoni = safeParse(product.testimoni, []);
  const listPoint = safeParse(product.list_point, []);
  const video = safeParse(product.video, []);
  const customField = safeParse(product.custom_field, []);
  const bundling = safeParse(product.bundling, []);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add toast notification here if needed
  };

  return (
    <Layout title={`Detail Produk - ${product.nama}`}>
      <div className="product-detail-container">
        {/* Header with Back Button and Actions */}
        <div className="product-detail-header">
          <button
            className="back-to-list-btn"
            onClick={() => router.push("/sales/products")}
          >
            <ArrowLeft size={18} />
            <span>Kembali ke Daftar Produk</span>
          </button>

          <div className="header-actions">
            <button
              className="action-btn secondary"
              onClick={() => router.push(`/sales/products/editProducts/${id}`)}
            >
              <Edit size={16} />
              <span>Edit Produk</span>
            </button>
            {product.url && product.kode && (
              <button
                className="action-btn primary"
                onClick={() => {
                  // ✅ FIX: Tambahkan /product/[kode_produk] sebelum product.url
                  let landingPageUrl = product.url;

                  // Jika product.url sudah dimulai dengan /product/, gunakan langsung
                  if (!landingPageUrl.startsWith('/product/')) {
                    // Tambahkan /product/[kode_produk] di depan
                    landingPageUrl = `/product/${product.kode}${landingPageUrl.startsWith('/') ? '' : '/'}${landingPageUrl}`;
                  }

                  window.open(landingPageUrl, '_blank');
                }}
              >
                <ExternalLink size={16} />
                <span>Lihat Landing Page</span>
              </button>
            )}
          </div>
        </div>
        {/*
        <div className="analytics-box">
          <div className="analytics-item">
            <h3>Sales Page View</h3>
            <p>43</p>
          </div>
          <div className="analytics-item">
            <h3>Checkout Page View</h3>
            <p>0</p>
          </div>
          <div className="analytics-item">
            <h3>Order</h3>
            <p>0</p>
          </div>
          <div className="analytics-item">
            <h3>Paid</h3>
            <p>0</p>
          </div>
        </div>
        */}
        {/* TABS */}
        <div className="top-tabs">
          <button
            className={`tab ${activeTab === "detail" ? "active" : ""}`}
            onClick={() => setActiveTab("detail")}
          >
            Detail Produk
          </button>
          <button
            className={`tab ${activeTab === "followup" ? "active" : ""}`}
            onClick={() => setActiveTab("followup")}
          >
            Followup Text
          </button>
          <button
            className={`tab ${activeTab === "link-zoom" ? "active" : ""}`}
            onClick={() => setActiveTab("link-zoom")}
          >
            Link Zoom
          </button>
          <button
            className={`tab ${activeTab === "trainer" ? "active" : ""}`}
            onClick={() => setActiveTab("trainer")}
          >
            Trainer
          </button>
          <button
            className={`tab ${activeTab === "artikel" ? "active" : ""}`}
            onClick={() => setActiveTab("artikel")}
          >
            Artikel
          </button>
          <button
            className={`tab ${activeTab === "knowledge" ? "active" : ""}`}
            onClick={() => setActiveTab("knowledge")}
          >
            Knowledge
          </button>
        </div>

        {/* === TAB DETAIL === */}
        {activeTab === "detail" && (
          <>
            {/* Product Hero Section */}
            <div className="product-hero-section">
              <div className="product-hero-content">
                <div className="product-title-section">
                  <h1 className="product-title">{product.nama || "-"}</h1>
                  <div className="product-meta-tags">
                    {product.kategori_rel?.nama && (
                      <span className="meta-tag category">
                        <Package size={14} />
                        {product.kategori_rel.nama}
                      </span>
                    )}
                    {product.kode && (
                      <span className="meta-tag code">
                        <Tag size={14} />
                        {product.kode}
                      </span>
                    )}
                    <span className={`meta-tag status ${product.status === "1" ? "active" : "inactive"}`}>
                      {product.status === "1" ? (
                        <>
                          <CheckCircle2 size={14} />
                          Aktif
                        </>
                      ) : (
                        <>
                          <XCircle size={14} />
                          Nonaktif
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="product-price-section">
                  {product.harga_coret && (
                    <div className="price-old">
                      Rp {formatCurrency(product.harga_coret)}
                    </div>
                  )}
                  <div className="price-current">
                    Rp {formatCurrency(product.harga_asli || product.harga || 0)}
                  </div>
                </div>
              </div>

              {/* Optional Header Image */}
              {product.header && (
                <div className="product-hero-image">
                  <img
                    src={buildImageUrl(product.header)}
                    alt={product.nama || "Product header"}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Information Cards Grid */}
            <div className="info-cards-grid">
              {/* Basic Information Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <Package size={20} />
                  <h2>Informasi Dasar</h2>
                </div>
                <div className="info-card-body">
                  <div className="info-item">
                    <div className="info-label">
                      <FileText size={16} />
                      <span>Nama Produk</span>
                    </div>
                    <div className="info-value">{product.nama || "-"}</div>
                  </div>

                  {product.kode && (
                    <div className="info-item">
                      <div className="info-label">
                        <Tag size={16} />
                        <span>Kode Produk</span>
                      </div>
                      <div className="info-value">
                        <span className="code-value">{product.kode}</span>
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(product.kode)}
                          title="Copy kode"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {product.deskripsi && (
                    <div className="info-item full-width">
                      <div className="info-label">
                        <FileText size={16} />
                        <span>Deskripsi</span>
                      </div>
                      <div className="info-value">{product.deskripsi}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Information Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <DollarSign size={20} />
                  <h2>Harga</h2>
                  {product.isBundling && bundling.length > 0 && (
                    <span className="badge-count bundling-badge">Bundling</span>
                  )}
                </div>
                <div className="info-card-body">
                  <div className="info-item">
                    <div className="info-label">
                      <DollarSign size={16} />
                      <span>Harga</span>
                    </div>
                    <div className="info-value price-value">
                      Rp {formatCurrency(product.harga_asli || product.harga || 0)}
                    </div>
                  </div>
                  {product.harga_coret && (
                    <div className="info-item">
                      <div className="info-label">
                        <DollarSign size={16} />
                        <span>Harga Coret</span>
                      </div>
                      <div className="info-value price-old-value">
                        Rp {formatCurrency(product.harga_coret)}
                      </div>
                    </div>
                  )}

                  {/* Bundling Information */}
                  {product.isBundling && bundling.length > 0 && (
                    <div className="info-item full-width" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                      <div className="info-label">
                        <Package size={16} />
                        <span>Harga Bundling</span>
                      </div>
                      <div className="bundling-list">
                        {bundling.map((item, index) => (
                          <div key={index} className="bundling-item">
                            <div className="bundling-item-header">
                              <span className="bundling-item-name">
                                {item.nama || item.name || `Paket ${index + 1}`}
                              </span>
                              <span className="bundling-item-price">
                                Rp {formatCurrency(item.harga || 0)}
                              </span>
                            </div>
                            {item.deskripsi && (
                              <div className="bundling-item-desc">
                                {item.deskripsi}
                              </div>
                            )}
                            {item.produk && Array.isArray(item.produk) && item.produk.length > 0 && (
                              <div className="bundling-item-products">
                                <span className="bundling-products-label">Produk dalam paket:</span>
                                <div className="bundling-products-list">
                                  {item.produk.map((prod, prodIdx) => (
                                    <span key={prodIdx} className="bundling-product-tag">
                                      {prod.nama || prod.name || `Produk ${prodIdx + 1}`}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Event & URL Information Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <Calendar size={20} />
                  <h2>Event & URL</h2>
                </div>
                <div className="info-card-body">
                  {product.tanggal_event && (
                    <div className="info-item">
                      <div className="info-label">
                        <Calendar size={16} />
                        <span>Tanggal Event</span>
                      </div>
                      <div className="info-value">{formatDate(product.tanggal_event)}</div>
                    </div>
                  )}
                  {product.kode && (
                    <div className="info-item">
                      <div className="info-label">
                        <Globe size={16} />
                        <span>URL</span>
                      </div>
                      <div className="info-value">
                        <a
                          href={`/product/${product.kode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="url-link"
                        >
                          /product/{product.kode}
                          <ExternalLink size={14} />
                        </a>
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(`/product/${product.kode}`)}
                          title="Copy URL"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* User & Status Information Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <User size={20} />
                  <h2>Pengelola & Status</h2>
                </div>
                <div className="info-card-body">
                  {product.user_rel?.nama && (
                    <div className="info-item">
                      <div className="info-label">
                        <User size={16} />
                        <span>Dibuat Oleh</span>
                      </div>
                      <div className="info-value">{product.user_rel.nama}</div>
                    </div>
                  )}
                  <div className="info-item">
                    <div className="info-label">
                      <CheckCircle2 size={16} />
                      <span>Status Produk</span>
                    </div>
                    <div className="info-value">
                      <span className={`status-badge ${product.status === "1" ? "active" : "inactive"}`}>
                        {product.status === "1" ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">
                      <Users size={16} />
                      <span>Assign</span>
                    </div>
                    <div className="info-value">
                      {loadingAssign ? (
                        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Memuat...</span>
                      ) : assignUsers.length > 0 ? (
                        <div className="assign-list">
                          {assignUsers.map((user, idx) => (
                            <span key={user.id} className="assign-badge">
                              {user.nama}
                              {idx < assignUsers.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Tidak ada assign</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Media & Content Card */}
            <div className="info-card full-width">
              <div className="info-card-header">
                <ImageIcon size={20} />
                <h2>Media & Konten</h2>
              </div>
              <div className="info-card-body">
                <div className="media-stats-grid">
                  <div className="media-stat-item">
                    <ImageIcon size={24} />
                    <div>
                      <div className="media-stat-value">{gallery.length}</div>
                      <div className="media-stat-label">Gambar Gallery</div>
                    </div>
                  </div>
                  <div className="media-stat-item">
                    <Video size={24} />
                    <div>
                      <div className="media-stat-value">{video.length}</div>
                      <div className="media-stat-label">Video</div>
                    </div>
                  </div>
                  <div className="media-stat-item">
                    <MessageSquare size={24} />
                    <div>
                      <div className="media-stat-value">{testimoni.length}</div>
                      <div className="media-stat-label">Testimoni</div>
                    </div>
                  </div>
                  <div className="media-stat-item">
                    <List size={24} />
                    <div>
                      <div className="media-stat-value">{listPoint.length}</div>
                      <div className="media-stat-label">List Point</div>
                    </div>
                  </div>
                </div>
                {gallery.length === 0 && video.length === 0 && testimoni.length === 0 && listPoint.length === 0 && (
                  <div className="empty-state">
                    <ImageIcon size={48} />
                    <p>Tidak ada media atau konten tersedia</p>
                  </div>
                )}
              </div>
            </div>

            {/* List Point Card */}
            {listPoint.length > 0 && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <List size={20} />
                  <h2>List Point</h2>
                  <span className="badge-count">{listPoint.length} item</span>
                </div>
                <div className="info-card-body">
                  <ul className="list-point-grid">
                    {listPoint.map((point, i) => (
                      <li key={i} className="list-point-item">
                        <CheckCircle2 size={18} />
                        <span>{point.nama || point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Testimoni Card */}
            {testimoni.length > 0 && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <MessageSquare size={20} />
                  <h2>Testimoni</h2>
                  <span className="badge-count">{testimoni.length} testimoni</span>
                </div>
                <div className="info-card-body">
                  <div className="testimoni-grid">
                    {testimoni.map((testi, i) => {
                      const imageUrl = buildImageUrl(testi.gambar);
                      return (
                        <div key={i} className="testimoni-card">
                          <div className="testimoni-avatar">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={testi.nama || `Testimoni ${i + 1}`}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="testimoni-avatar-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                              <User size={24} />
                            </div>
                          </div>
                          <div className="testimoni-content">
                            {testi.nama && <h4>{testi.nama}</h4>}
                            {testi.deskripsi && <p>{testi.deskripsi}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Video Card */}
            {video.length > 0 && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <Video size={20} />
                  <h2>Video</h2>
                  <span className="badge-count">{video.length} video</span>
                </div>
                <div className="info-card-body">
                  <div className="video-grid">
                    {video.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="video-card"
                      >
                        <Video size={20} />
                        <span>{url}</span>
                        <ExternalLink size={16} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Field Card */}
            {customField.length > 0 && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <FileText size={20} />
                  <h2>Custom Field</h2>
                  <span className="badge-count">{customField.length} field</span>
                </div>
                <div className="info-card-body">
                  <div className="custom-field-grid">
                    {customField.map((field, i) => (
                      <div key={i} className="custom-field-card">
                        <div className="custom-field-label">
                          {field.nama_field || field.label || `Field ${i + 1}`}
                        </div>
                        <div className="custom-field-value">
                          {field.value || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* === TAB FOLLOWUP TEXT === */}
        {activeTab === "followup" && <FollowupSection productId={id} />}

        {/* === TAB LINK ZOOM === */}
        {activeTab === "link-zoom" && (
          <LinkZoomSection productId={id} productName={product.nama} />
        )}

        {/* === TAB TRAINER === */}
        {activeTab === "trainer" && (
          <TrainerSection
            productId={id}
            product={product}
            onProductUpdate={(updatedProduct) => {
              setProduct(updatedProduct);
            }}
          />
        )}
        {/* === TAB ARTIKEL === */}
        {activeTab === "artikel" && (
          <ArticleSection productName={product.nama} />
        )}

        {activeTab === "knowledge" && (
          <KnowledgeSection productId={parseInt(id)} />
        )}
      </div>
    </Layout>
  );
}
