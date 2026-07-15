"use client";

import { useEffect, useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getProductById } from "@/lib/sales/products";
import FollowupSection from "./FollowupSection";
import LinkZoomSection from "./LinkZoomSection";
import TrainerSection from "./TrainerSection";
import "@/styles/sales/product-detail.css";

import {
  ArrowLeft,
  Package,
  Tag,
  Info,
  Calendar,
  Globe,
  CheckCircle,
  XCircle,
  Eye,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Image as ImageIcon,
  Copy,
  ExternalLink
} from "lucide-react";

// Helper function untuk build image URL via proxy
const buildImageUrl = (path) => {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  let cleanPath = path.replace(/^\/?(storage\/)?/, "");

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

  // TAB STATE
  const [activeTab, setActiveTab] = useState("detail");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getProductById(id);
        if (!data) return;
        setProduct(data);
      } catch (err) {
        console.error("❌ Error fetching detail:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Berhasil disalin ke clipboard!");
  };

  if (loading) return <Layout>Memuat detail produk...</Layout>;
  if (!product) return <Layout>Produk tidak ditemukan.</Layout>;

  // Parse JSON fields dengan safe parse
  const gallery = safeParse(product.gambar, []);
  const listPoint = safeParse(product.list_point, []);

  return (
    <Layout title={`Detail Produk - ${product.nama}`}>
      <div className="product-detail-container">
        {/* Back Button */}
        <div className="product-detail-header">
          <button
            className="back-to-list-btn"
            onClick={() => router.push("/sales/staff/products")}
          >
            <ArrowLeft size={18} />
            <span>Kembali ke Daftar Produk</span>
          </button>
        </div>

        {/* ANALYTICS BOX */}
        <div className="analytics-box">
          <div className="analytics-item">
            <h3>Sales Page View</h3>
            <p>43</p>
          </div>
          <div className="analytics-item">
            <h3>Checkout View</h3>
            <p>0</p>
          </div>
          <div className="analytics-item">
            <h3>Total Order</h3>
            <p>0</p>
          </div>
          <div className="analytics-item">
            <h3>Order Paid</h3>
            <p>0</p>
          </div>
        </div>

        {/* TABS */}
        <div className="top-tabs">
          <button
            className={`tab ${activeTab === "detail" ? "active" : ""}`}
            onClick={() => setActiveTab("detail")}
          >
            Detail Produk
          </button>
        </div>

        {/* === TAB DETAIL === */}
        {activeTab === "detail" && (
          <div className="tab-content-fade">
            {/* HERO SECTION */}
            <div className="product-hero-section">


              <div className="product-hero-content">
                <div className="product-title-section">
                  <h1 className="product-title">{product.nama || "-"}</h1>
                  <div className="product-meta-tags">
                    <span className="meta-tag category">
                      <Tag size={14} />
                      {product.kategori_rel?.nama || product.kategori || "Tanpa Kategori"}
                    </span>
                    <span className="meta-tag code">
                      <Package size={14} />
                      {product.kode || "No Code"}
                    </span>
                    <span className={`meta-tag status ${product.status === "1" ? "active" : "inactive"}`}>
                      {product.status === "1" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {product.status === "1" ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>

                <div className="product-price-section">
                  {product.harga_coret && (
                    <span className="price-old">Rp {formatCurrency(product.harga_coret)}</span>
                  )}
                  <span className="price-current">Rp {formatCurrency(product.harga_asli)}</span>
                </div>
              </div>
            </div>

            {/* INFO CARDS GRID */}
            <div className="info-cards-grid">
              {/* Card 1: Main Info */}
              <div className="info-card">
                <div className="info-card-header">
                  <Info size={18} />
                  <h2>Informasi Dasar</h2>
                </div>
                <div className="info-card-body">
                  <div className="info-item">
                    <div className="info-label">Deskripsi</div>
                    <div className="info-value">{product.deskripsi || "Tidak ada deskripsi."}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Tanggal Event</div>
                    <div className="info-value">
                      <Calendar size={16} />
                      {product.tanggal_event ? new Date(product.tanggal_event).toLocaleString("id-ID", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      }) : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Links & Access */}
              <div className="info-card">
                <div className="info-card-header">
                  <Globe size={18} />
                  <h2>Link & Akses</h2>
                </div>
                <div className="info-card-body">
                  <div className="info-item">
                    <div className="info-label">Landing Page URL</div>
                    <div className="info-value">
                      <a href={`/landing/${product.kode}`} target="_blank" className="url-link">
                        /landing/{product.kode}
                        <ExternalLink size={14} />
                      </a>
                      <button className="copy-btn" onClick={() => copyToClipboard(`${window.location.origin}/landing/${product.kode}`)}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                </div>
              </div>



              {/* Card 4: Poin Penting */}
              {listPoint.length > 0 && (
                <div className="info-card full-width">
                  <div className="info-card-header">
                    <CheckCircle size={18} />
                    <h2>Poin Penting Produk</h2>
                  </div>
                  <div className="info-card-body">
                    <ul className="list-point-grid">
                      {listPoint.map((point, i) => (
                        <li key={i} className="list-point-item">
                          <CheckCircle size={16} />
                          {point.nama || point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
