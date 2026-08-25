"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Search, GraduationCap, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import Link from "next/link";

export default function EcoursePage() {
    const [produkList, setProdukList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchProdukEcourse();
    }, []);

    const fetchProdukEcourse = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("/api/sales/produk?quick_order=true", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data?.data || [];
            // Cuma tampilkan produk berkategori Ecourse - halaman ini
            // khusus kelola kurikulum, bukan daftar produk umum.
            const ecourseOnly = data.filter((p) =>
                (p.kategori_rel?.nama || "").toLowerCase().includes("course")
            );
            setProdukList(ecourseOnly);
        } catch (err) {
            console.error("Fetch produk ecourse error:", err);
            toast.error("Gagal memuat daftar produk ecourse");
            setProdukList([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredProduk = produkList.filter((p) =>
        (p.nama || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout title="Ecourse">
            <div className="ecourse-page-container">
                <div className="search-container-top">
                    <div className="search-box-large card-shadow">
                        <Search size={20} className="search-icon-left" />
                        <input
                            type="text"
                            className="search-input-large"
                            placeholder="Cari nama kursus..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="main-content-card card-shadow mt-4">
                    <div className="card-header-inner">
                        <div className="card-header-titles">
                            <span className="eyebrow-text">KELOLA ECOURSE</span>
                            <h2 className="card-title">Produk Ecourse</h2>
                        </div>
                    </div>

                    <div className="table-container-clean">
                        {loading ? (
                            <div className="loading-state">
                                <Loader2 size={32} className="spinner-icon" />
                                <p>Memuat data...</p>
                            </div>
                        ) : filteredProduk.length > 0 ? (
                            <div className="course-grid">
                                {filteredProduk.map((produk) => (
                                    <Link
                                        key={produk.id}
                                        href={`/sales/ecourse/${produk.id}`}
                                        className="course-card"
                                    >
                                        <div className="course-card-icon">
                                            <GraduationCap size={24} />
                                        </div>
                                        <div className="course-card-body">
                                            <span className="course-card-title">{produk.nama}</span>
                                            <span className="course-card-sub">
                                                {produk.kategori_rel?.nama || "Ecourse"}
                                            </span>
                                        </div>
                                        <ChevronRight size={18} className="course-card-arrow" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state-modern">
                                <div className="empty-state-visual">
                                    <div className="blob-bg"></div>
                                    <GraduationCap size={40} className="empty-icon" />
                                </div>
                                <h3>Belum ada produk berkategori Ecourse</h3>
                                <p>
                                    Tambahkan kategori &quot;Ecourse&quot; ke sebuah produk di
                                    menu Produk terlebih dahulu, baru kurikulumnya bisa dikelola
                                    di sini.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .ecourse-page-container {
                    padding: 30px 40px;
                    background: transparent;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .card-shadow {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    border: 1px solid var(--color-divider);
                }
                .mt-4 { margin-top: 1rem; }

                .search-container-top { display: flex; justify-content: flex-start; }
                .search-box-large {
                    width: 480px;
                    display: flex;
                    align-items: center;
                    background: #fff;
                    padding: 0 15px;
                    height: 48px;
                    border-radius: 10px;
                    border: 1px solid var(--color-border);
                }
                .search-input-large {
                    flex: 1;
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 14px;
                    color: var(--color-text-secondary);
                    padding-left: 10px;
                }
                .search-icon-left { color: var(--color-text-secondary); }

                .main-content-card { overflow: hidden; }
                .card-header-inner {
                    padding: 24px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--color-divider);
                }
                .card-header-titles { display: flex; flex-direction: column; gap: 4px; }
                .eyebrow-text { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
                .card-title { font-size: 18px; font-weight: 700; color: var(--color-text-primary); margin: 0; }

                .table-container-clean { padding: 24px 30px; }
                .course-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }
                .course-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 18px;
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .course-card:hover { border-color: var(--color-primary-main); box-shadow: 0 4px 12px rgba(255, 122, 0, 0.1); }
                .course-card-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    background: var(--color-warning-lighter);
                    color: var(--color-primary-main);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .course-card-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
                .course-card-title {
                    font-weight: 600;
                    color: var(--color-text-primary);
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .course-card-sub { font-size: 12px; color: var(--color-text-secondary); }
                .course-card-arrow { color: var(--color-grey-300); flex-shrink: 0; }

                .empty-state-modern {
                    padding: 80px 40px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .empty-state-visual {
                    position: relative;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .blob-bg {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    background: var(--color-warning-lighter);
                    border-radius: 50%;
                    filter: blur(15px);
                }
                .empty-icon { position: relative; color: var(--color-primary-main); }
                .empty-state-modern h3 { font-size: 20px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 10px 0; }
                .empty-state-modern p { color: var(--color-text-secondary); font-size: 14px; margin-bottom: 24px; max-width: 400px; }

                .loading-state { text-align: center; padding: 60px 0; color: var(--color-text-secondary); }
                .spinner-icon { animation: spin 1s linear infinite; color: var(--color-primary-main); margin: 0 auto 16px; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </Layout>
    );
}
