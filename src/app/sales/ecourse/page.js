"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
    Plus, Video, Trash2, Link as LinkIcon, Search, Eye, X, Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import Link from "next/link";

export default function EcoursePage() {
    const [view, setView] = useState("list"); // "list" | "form"
    const [ecourses, setEcourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [videoFile, setVideoFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetchEcourses();
    }, []);

    const fetchEcourses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("/api/sales/ecourse", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data?.status === 'success') {
                setEcourses(response.data.data || []);
            } else {
                setEcourses([]);
            }
        } catch (err) {
            console.error("Fetch ecourses error:", err);
            toast.error("Gagal memuat ecourse");
            setEcourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setTitle("");
        setDescription("");
        setVideoFile(null);
        setUploadProgress(0);
        setView("form");
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validasi ukuran misal max 500MB
            if (file.size > 512 * 1024 * 1024) {
                toast.error("Ukuran file maksimal 500MB");
                e.target.value = null;
                return;
            }
            setVideoFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !videoFile) {
            toast.error("Judul dan file video wajib diisi");
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            const token = localStorage.getItem("token");

            // 1. Get Pre-signed URL
            const urlResponse = await axios.get("/api/sales/ecourse/upload-url", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (urlResponse.data?.status !== 'success') {
                throw new Error("Gagal mendapatkan URL upload");
            }

            const { upload_url, path } = urlResponse.data;

            // 2. Upload directly to S3
            await axios.put(upload_url, videoFile, {
                headers: {
                    "Content-Type": videoFile.type || "video/mp4",
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            // 3. Save to DB
            const saveResponse = await axios.post("/api/sales/ecourse", {
                title,
                description,
                video_path: path,
                is_active: 1
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (saveResponse.data?.status === 'success') {
                toast.success("Ecourse berhasil diupload");
                setView("list");
                fetchEcourses();
            } else {
                toast.error("Gagal menyimpan data ecourse");
            }
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err.response?.data?.message || err.message || "Terjadi kesalahan saat mengupload");
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus ecourse ini? ")) {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.delete(`/api/sales/ecourse/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data?.status === 'success') {
                    toast.success("Ecourse berhasil dihapus");
                    fetchEcourses();
                } else {
                    toast.error("Gagal menghapus ecourse");
                }
            } catch (err) {
                console.error("Delete error:", err);
                toast.error("Terjadi kesalahan saat menghapus data");
            }
        }
    };

    const copyToClipboard = (url) => {
        if (!url) {
            toast.error("URL tidak tersedia atau sudah expired");
            return;
        }
        navigator.clipboard.writeText(url);
        toast.success("URL berhasil disalin! (URL bersifat temporary)");
    };

    const filteredEcourses = ecourses.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout title="Ecourse S3">
            <div className="ecourse-page-container">
                {view === "list" ? (
                    <div className="fade-in">
                        <div className="search-container-top">
                            <div className="search-box-large card-shadow">
                                <Search size={20} className="search-icon-left" />
                                <input
                                    type="text"
                                    className="search-input-large"
                                    placeholder="Cari judul ecourse..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="main-content-card card-shadow mt-4">
                            <div className="card-header-inner">
                                <div className="card-header-titles">
                                    <span className="eyebrow-text">VIDEO MATERI</span>
                                    <h2 className="card-title">Daftar Ecourse</h2>
                                </div>
                                <div className="card-header-actions">
                                    <button className="btn-primary-orange" onClick={handleCreate}>
                                        <Plus size={16} strokeWidth={3} />
                                        Upload Video
                                    </button>
                                </div>
                            </div>

                            <div className="table-container-clean">
                                {loading ? (
                                    <div className="loading-state">
                                        <Loader2 size={32} className="spinner-icon" />
                                        <p>Memuat data...</p>
                                    </div>
                                ) : filteredEcourses.length > 0 ? (
                                    <table className="bonus-table-clean">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '35%' }}>JUDUL ECOURSE</th>
                                                <th>PATH</th>
                                                <th>TEMPORARY URL</th>
                                                <th className="text-right">ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEcourses.map((ecourse) => (
                                                <tr key={ecourse.id}>
                                                    <td>
                                                        <div className="article-info-simple">
                                                            <span className="article-title-main">{ecourse.title}</span>
                                                            <span className="article-slug-small text-muted">{new Date(ecourse.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="tag-badge-minimal">
                                                            {ecourse.video_path.substring(0, 30)}...
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-2 items-center">
                                                            <button
                                                                className="btn-link-action"
                                                                onClick={() => copyToClipboard(ecourse.video_url)}
                                                                title="Copy URL Sementara"
                                                            >
                                                                <LinkIcon size={14} /> Salin URL
                                                            </button>
                                                            {ecourse.video_url && (
                                                                <a href={ecourse.video_url} target="_blank" rel="noopener noreferrer" className="btn-icon-small">
                                                                    <Eye size={14} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons-premium">
                                                            <button
                                                                className="btn-delete-boxed"
                                                                onClick={() => handleDelete(ecourse.id)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="empty-state-modern">
                                        <div className="empty-state-visual">
                                            <div className="blob-bg"></div>
                                            <Video size={40} className="empty-icon" />
                                        </div>
                                        <h3>Belum ada video ecourse</h3>
                                        <p>Mulai upload video ecourse pertama Anda.</p>
                                        <button className="btn-outline-create" onClick={handleCreate}>
                                            Upload Video Sekarang
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="fade-in">
                        <div className="editor-view-header">
                            <div className="header-left-side">
                                <button className="btn-back" onClick={() => setView("list")} disabled={isSubmitting}>
                                    <X size={18} />
                                    Batal
                                </button>
                                <h2 className="editor-title">Upload Video Ecourse</h2>
                                <p className="editor-subtitle">Pilih file video MP4</p>
                            </div>
                        </div>

                        <div className="editor-wrapper-card card-shadow p-8">
                            <form onSubmit={handleSubmit} className="upload-form">
                                <div className="form-group">
                                    <label>Judul Ecourse</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Masukkan judul video..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Deskripsi (Opsional)</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Tulis deskripsi singkat..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={isSubmitting}
                                        rows={3}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Pilih File Video</label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            accept="video/mp4,video/quicktime,video/x-msvideo"
                                            onChange={handleFileChange}
                                            disabled={isSubmitting}
                                            className="file-input"
                                            required
                                        />
                                        <div className="file-upload-box">
                                            <Video size={32} className="upload-icon" />
                                            <p className="upload-text">
                                                {videoFile ? videoFile.name : "Klik atau seret video ke sini"}
                                            </p>
                                            <span className="upload-hint">Format didukung: MP4, MOV, AVI (Max 500MB)</span>
                                        </div>
                                    </div>
                                </div>

                                {isSubmitting && (
                                    <div className="progress-container">
                                        <div className="progress-header">
                                            <span>Mengupload video ...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-actions mt-6">
                                    <button
                                        type="submit"
                                        className="btn-publish-orange w-full"
                                        disabled={isSubmitting || !title || !videoFile}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin mr-2" />
                                                Mengupload...
                                            </>
                                        ) : (
                                            "Upload"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
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
                    border: 1px solid #f1f5f9;
                }
                .mt-4 { margin-top: 1rem; }
                .mt-6 { margin-top: 1.5rem; }
                .p-8 { padding: 2rem; }
                .w-full { width: 100%; display: flex; justify-content: center; align-items: center; }
                .mr-2 { margin-right: 0.5rem; }
                
                .search-container-top { display: flex; justify-content: flex-start; }
                .search-box-large {
                    width: 480px;
                    display: flex;
                    align-items: center;
                    background: #fff;
                    padding: 0 15px;
                    height: 48px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                .search-input-large {
                    flex: 1;
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 14px;
                    color: #64748b;
                    padding-left: 10px;
                }
                .search-icon-left { color: #94a3b8; }

                .main-content-card { overflow: hidden; }
                .card-header-inner {
                    padding: 24px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                }
                .card-header-titles { display: flex; flex-direction: column; gap: 4px; }
                .eyebrow-text { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                .card-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
                
                .btn-primary-orange {
                    background: #ff7a00;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .btn-primary-orange:hover:not(:disabled) { background: #e66e00; }
                .btn-primary-orange:disabled { opacity: 0.7; cursor: not-allowed; }

                .bonus-table-clean { width: 100%; border-collapse: collapse; }
                .bonus-table-clean thead th {
                    background: #f8fafc;
                    padding: 16px 30px;
                    text-align: left;
                    font-size: 12px;
                    font-weight: 700;
                    color: #475569;
                    border-bottom: 1px solid #e2e8f0;
                }
                .bonus-table-clean tr td {
                    padding: 16px 30px;
                    color: #334155;
                    font-size: 14px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .text-right { text-align: right !important; }
                
                .article-info-simple { display: flex; flex-direction: column; gap: 4px; }
                .article-title-main { font-weight: 600; color: #1e293b; font-size: 15px; }
                .article-slug-small { font-size: 12px; }
                .text-muted { color: #94a3b8; }

                .tag-badge-minimal {
                    background: #f8fafc;
                    color: #64748b;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    border: 1px solid #e2e8f0;
                }

                .flex { display: flex; }
                .gap-2 { gap: 0.5rem; }
                .items-center { align-items: center; }

                .btn-link-action {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #eff6ff;
                    color: #3b82f6;
                    border: 1px solid #bfdbfe;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-link-action:hover { background: #dbeafe; }
                
                .btn-icon-small {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px;
                    height: 30px;
                    background: #f1f5f9;
                    color: #475569;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                .btn-icon-small:hover { background: #e2e8f0; color: #1e293b; }

                .action-buttons-premium {
                    display: flex;
                    justify-content: flex-end;
                }
                .btn-delete-boxed {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    color: #94a3b8;
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .btn-delete-boxed:hover {
                    border-color: #ef4444;
                    color: #ef4444;
                    background: #fef2f2;
                }

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
                    background: #fff7ed;
                    border-radius: 50%;
                    filter: blur(15px);
                }
                .empty-icon { position: relative; color: #ff7a00; }
                .empty-state-modern h3 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 10px 0; }
                .empty-state-modern p { color: #64748b; font-size: 14px; margin-bottom: 24px; max-width: 400px; }
                
                .btn-outline-create {
                    background: white;
                    border: 1px solid #e2e8f0;
                    color: #1e293b;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-outline-create:hover { border-color: #ff7a00; color: #ff7a00; }

                /* Editor View */
                .editor-view-header {
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 16px;
                    transition: all 0.2s;
                }
                .btn-back:hover:not(:disabled) { color: #1e293b; border-color: #cbd5e1; }
                .editor-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
                .editor-subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

                /* Form Styles */
                .upload-form { max-width: 600px; }
                .form-group { margin-bottom: 20px; }
                .form-group label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 8px;
                }
                .form-input, .form-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }
                .form-input:focus, .form-textarea:focus { outline: none; border-color: #ff7a00; }
                .form-input:disabled, .form-textarea:disabled { background: #f8fafc; color: #94a3b8; }
                
                .file-upload-wrapper { position: relative; }
                .file-input {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 10;
                }
                .file-upload-box {
                    border: 2px dashed #cbd5e1;
                    border-radius: 12px;
                    padding: 40px 20px;
                    text-align: center;
                    background: #f8fafc;
                    transition: all 0.2s;
                }
                .file-upload-wrapper:hover .file-upload-box { border-color: #94a3b8; background: #f1f5f9; }
                .upload-icon { color: #94a3b8; margin: 0 auto 12px; }
                .upload-text { font-size: 15px; font-weight: 600; color: #334155; margin: 0 0 4px 0; }
                .upload-hint { font-size: 12px; color: #94a3b8; }

                .progress-container { margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .progress-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
                .progress-bar-bg { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: #ff7a00; border-radius: 4px; transition: width 0.2s ease; }

                .btn-publish-orange {
                    background: #ff7a00;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-publish-orange:hover:not(:disabled) { background: #e66e00; }
                .btn-publish-orange:disabled { opacity: 0.6; cursor: not-allowed; }

                .loading-state { text-align: center; padding: 60px 0; color: #64748b; }
                .spinner-icon { animation: spin 1s linear infinite; color: #ff7a00; margin: 0 auto 16px; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </Layout>
    );
}
