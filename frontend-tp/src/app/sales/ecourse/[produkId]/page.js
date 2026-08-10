"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import {
    ArrowLeft, Plus, Trash2, Pencil, ChevronDown, ChevronUp,
    ArrowUpCircle, ArrowDownCircle, Video, Loader2, X, Eye
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function EcourseCurriculumPage() {
    const params = useParams();
    const router = useRouter();
    const produkId = params?.produkId;

    const [produk, setProduk] = useState(null);
    const [babList, setBabList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBab, setExpandedBab] = useState({});

    // Modal state
    const [babModal, setBabModal] = useState(null); // { id?, judul, overview }
    const [lessonModal, setLessonModal] = useState(null); // { babId, id?, mode, title, description, videoFile, selectedExistingId }
    const [savingModal, setSavingModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [unassignedVideos, setUnassignedVideos] = useState([]);
    const [loadingUnassigned, setLoadingUnassigned] = useState(false);

    const token = () => localStorage.getItem("token");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [produkRes, babRes] = await Promise.all([
                axios.get(`/api/sales/produk/${produkId}`, {
                    headers: { Authorization: `Bearer ${token()}` }
                }),
                axios.get(`/api/sales/ecourse-bab?produk_id=${produkId}`, {
                    headers: { Authorization: `Bearer ${token()}` }
                }),
            ]);

            setProduk(produkRes.data?.data || null);
            const bab = babRes.data?.data || [];
            setBabList(bab);
            setExpandedBab((prev) => {
                const next = { ...prev };
                bab.forEach((b) => { if (!(b.id in next)) next[b.id] = true; });
                return next;
            });
        } catch (err) {
            console.error("Fetch kurikulum error:", err);
            toast.error("Gagal memuat kurikulum");
        } finally {
            setLoading(false);
        }
    }, [produkId]);

    useEffect(() => {
        if (produkId) fetchData();
    }, [produkId, fetchData]);

    const toggleBab = (id) => setExpandedBab((prev) => ({ ...prev, [id]: !prev[id] }));

    // ---------- Bab CRUD ----------
    const openCreateBab = () => setBabModal({ judul: "", overview: "" });
    const openEditBab = (bab) => setBabModal({ id: bab.id, judul: bab.judul, overview: bab.overview || "" });

    const saveBab = async () => {
        if (!babModal.judul.trim()) {
            toast.error("Judul bab wajib diisi");
            return;
        }
        setSavingModal(true);
        try {
            if (babModal.id) {
                await axios.put(`/api/sales/ecourse-bab/${babModal.id}`, {
                    judul: babModal.judul, overview: babModal.overview,
                }, { headers: { Authorization: `Bearer ${token()}` } });
                toast.success("Bab diperbarui");
            } else {
                await axios.post(`/api/sales/ecourse-bab`, {
                    produk_id: produkId, judul: babModal.judul, overview: babModal.overview,
                }, { headers: { Authorization: `Bearer ${token()}` } });
                toast.success("Bab ditambahkan");
            }
            setBabModal(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal menyimpan bab");
        } finally {
            setSavingModal(false);
        }
    };

    const deleteBab = async (bab) => {
        if (!confirm(`Hapus bab "${bab.judul}" beserta seluruh video di dalamnya?`)) return;
        try {
            await axios.delete(`/api/sales/ecourse-bab/${bab.id}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            toast.success("Bab dihapus");
            fetchData();
        } catch (err) {
            toast.error("Gagal menghapus bab");
        }
    };

    const moveBab = async (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= babList.length) return;

        const reordered = [...babList];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        setBabList(reordered);

        try {
            await axios.put(`/api/sales/ecourse-bab/reorder`, {
                urutan: reordered.map((b, i) => ({ id: b.id, urutan: i + 1 })),
            }, { headers: { Authorization: `Bearer ${token()}` } });
        } catch (err) {
            toast.error("Gagal menyimpan urutan bab");
            fetchData();
        }
    };

    // ---------- Lesson CRUD ----------
    const openCreateLesson = (babId) => {
        setLessonModal({ babId, mode: "upload", title: "", description: "", videoFile: null, selectedExistingId: null });
    };
    const openEditLesson = (babId, lesson) => setLessonModal({
        babId, id: lesson.id, mode: "upload", title: lesson.title, description: lesson.description || "", videoFile: null,
    });

    const fetchUnassignedVideos = async () => {
        setLoadingUnassigned(true);
        try {
            const res = await axios.get("/api/sales/ecourse?unassigned=true", {
                headers: { Authorization: `Bearer ${token()}` }
            });
            setUnassignedVideos(res.data?.data || []);
        } catch (err) {
            toast.error("Gagal memuat daftar video lama");
        } finally {
            setLoadingUnassigned(false);
        }
    };

    const switchLessonMode = (mode) => {
        setLessonModal((prev) => ({ ...prev, mode }));
        if (mode === "existing" && unassignedVideos.length === 0) {
            fetchUnassignedVideos();
        }
    };

    const handleLessonFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 512 * 1024 * 1024) {
            toast.error("Ukuran file maksimal 500MB");
            e.target.value = null;
            return;
        }
        setLessonModal((prev) => ({ ...prev, videoFile: file }));
    };

    const saveLesson = async () => {
        if (lessonModal.mode === "existing" && !lessonModal.id) {
            if (!lessonModal.selectedExistingId) {
                toast.error("Pilih salah satu video dulu");
                return;
            }

            setSavingModal(true);
            try {
                const video = unassignedVideos.find((v) => v.id === lessonModal.selectedExistingId);
                await axios.put(`/api/sales/ecourse/${video.id}`, {
                    title: video.title,
                    description: video.description,
                    ecourse_bab_id: lessonModal.babId,
                }, { headers: { Authorization: `Bearer ${token()}` } });
                toast.success("Video lama disambungkan ke bab ini");
                setUnassignedVideos((prev) => prev.filter((v) => v.id !== video.id));
                setLessonModal(null);
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || "Gagal menyambungkan video");
            } finally {
                setSavingModal(false);
            }
            return;
        }

        if (!lessonModal.title.trim()) {
            toast.error("Judul lesson wajib diisi");
            return;
        }
        if (!lessonModal.id && !lessonModal.videoFile) {
            toast.error("File video wajib diisi untuk lesson baru");
            return;
        }

        setSavingModal(true);
        setUploadProgress(0);
        try {
            if (lessonModal.id) {
                await axios.put(`/api/sales/ecourse/${lessonModal.id}`, {
                    title: lessonModal.title,
                    description: lessonModal.description,
                    ecourse_bab_id: lessonModal.babId,
                }, { headers: { Authorization: `Bearer ${token()}` } });
                toast.success("Lesson diperbarui");
            } else {
                const urlRes = await axios.get("/api/sales/ecourse/upload-url", {
                    headers: { Authorization: `Bearer ${token()}` }
                });
                const { upload_url, path } = urlRes.data;

                await axios.put(upload_url, lessonModal.videoFile, {
                    headers: { "Content-Type": lessonModal.videoFile.type || "video/mp4" },
                    onUploadProgress: (evt) => {
                        setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
                    },
                });

                await axios.post("/api/sales/ecourse", {
                    title: lessonModal.title,
                    description: lessonModal.description,
                    video_path: path,
                    ecourse_bab_id: lessonModal.babId,
                    is_active: 1,
                }, { headers: { Authorization: `Bearer ${token()}` } });
                toast.success("Lesson ditambahkan");
            }
            setLessonModal(null);
            fetchData();
        } catch (err) {
            console.error("Simpan lesson error:", err);
            toast.error(err.response?.data?.message || err.message || "Gagal menyimpan lesson");
        } finally {
            setSavingModal(false);
            setUploadProgress(0);
        }
    };

    const deleteLesson = async (lesson) => {
        if (!confirm(`Hapus lesson "${lesson.title}"?`)) return;
        try {
            await axios.delete(`/api/sales/ecourse/${lesson.id}`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            toast.success("Lesson dihapus");
            fetchData();
        } catch (err) {
            toast.error("Gagal menghapus lesson");
        }
    };

    const moveLesson = async (bab, index, direction) => {
        const target = index + direction;
        const lessons = bab.ecourses || [];
        if (target < 0 || target >= lessons.length) return;

        const reordered = [...lessons];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

        setBabList((prev) => prev.map((b) => (b.id === bab.id ? { ...b, ecourses: reordered } : b)));

        try {
            await axios.put(`/api/sales/ecourse/reorder`, {
                urutan: reordered.map((l, i) => ({ id: l.id, urutan: i + 1 })),
            }, { headers: { Authorization: `Bearer ${token()}` } });
        } catch (err) {
            toast.error("Gagal menyimpan urutan lesson");
            fetchData();
        }
    };

    return (
        <Layout title="Kurikulum Ecourse">
            <div className="curriculum-page-container">
                <div className="editor-view-header">
                    <button className="btn-back" onClick={() => router.push("/sales/ecourse")}>
                        <ArrowLeft size={18} />
                        Kembali
                    </button>
                    <h2 className="editor-title">{produk?.nama || "Memuat..."}</h2>
                    <p className="editor-subtitle">Kelola bab dan urutan video kursus ini</p>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="spinner-icon" />
                        <p>Memuat kurikulum...</p>
                    </div>
                ) : (
                    <>
                        <div className="bab-list">
                            {babList.map((bab, babIndex) => (
                                <div key={bab.id} className="bab-card card-shadow">
                                    <div className="bab-card-header">
                                        <button className="bab-expand-btn" onClick={() => toggleBab(bab.id)}>
                                            {expandedBab[bab.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                        <div className="bab-title-block">
                                            <span className="bab-eyebrow">BAB {babIndex + 1}</span>
                                            <span className="bab-title">{bab.judul}</span>
                                        </div>
                                        <div className="bab-actions">
                                            <button className="btn-icon-small" onClick={() => moveBab(babIndex, -1)} disabled={babIndex === 0} title="Naikkan urutan">
                                                <ArrowUpCircle size={18} />
                                            </button>
                                            <button className="btn-icon-small" onClick={() => moveBab(babIndex, 1)} disabled={babIndex === babList.length - 1} title="Turunkan urutan">
                                                <ArrowDownCircle size={18} />
                                            </button>
                                            <button className="btn-icon-small" onClick={() => openEditBab(bab)} title="Edit bab">
                                                <Pencil size={16} />
                                            </button>
                                            <button className="btn-icon-small btn-icon-danger" onClick={() => deleteBab(bab)} title="Hapus bab">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandedBab[bab.id] && (
                                        <div className="bab-card-body">
                                            {bab.overview && <p className="bab-overview">{bab.overview}</p>}

                                            <div className="lesson-list">
                                                {(bab.ecourses || []).map((lesson, lessonIndex) => (
                                                    <div key={lesson.id} className="lesson-row">
                                                        <Video size={16} className="lesson-icon" />
                                                        <div className="lesson-info">
                                                            <span className="lesson-title">{lesson.title}</span>
                                                            {lesson.description && (
                                                                <span className="lesson-desc">{lesson.description}</span>
                                                            )}
                                                        </div>
                                                        <div className="lesson-actions">
                                                            {lesson.video_url && (
                                                                <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="btn-icon-small" title="Preview video">
                                                                    <Eye size={14} />
                                                                </a>
                                                            )}
                                                            <button className="btn-icon-small" onClick={() => moveLesson(bab, lessonIndex, -1)} disabled={lessonIndex === 0} title="Naikkan urutan">
                                                                <ArrowUpCircle size={16} />
                                                            </button>
                                                            <button className="btn-icon-small" onClick={() => moveLesson(bab, lessonIndex, 1)} disabled={lessonIndex === (bab.ecourses || []).length - 1} title="Turunkan urutan">
                                                                <ArrowDownCircle size={16} />
                                                            </button>
                                                            <button className="btn-icon-small" onClick={() => openEditLesson(bab.id, lesson)} title="Edit lesson">
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button className="btn-icon-small btn-icon-danger" onClick={() => deleteLesson(lesson)} title="Hapus lesson">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button className="btn-add-lesson" onClick={() => openCreateLesson(bab.id)}>
                                                <Plus size={14} /> Tambah Lesson
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="btn-add-bab" onClick={openCreateBab}>
                            <Plus size={16} strokeWidth={3} /> Tambah Bab
                        </button>

                        {babList.length === 0 && (
                            <div className="empty-state-modern">
                                <h3>Belum ada bab</h3>
                                <p>Mulai dengan menambah bab pertama untuk kursus ini.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {babModal && (
                <div className="modal-overlay" onClick={() => !savingModal && setBabModal(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{babModal.id ? "Edit Bab" : "Tambah Bab"}</h3>
                            <button onClick={() => setBabModal(null)} disabled={savingModal}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Judul Bab</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={babModal.judul}
                                    onChange={(e) => setBabModal((p) => ({ ...p, judul: e.target.value }))}
                                    placeholder="Mis. Bab 1: Pengantar"
                                    disabled={savingModal}
                                />
                            </div>
                            <div className="form-group">
                                <label>Overview (opsional)</label>
                                <textarea
                                    className="form-textarea"
                                    rows={4}
                                    value={babModal.overview}
                                    onChange={(e) => setBabModal((p) => ({ ...p, overview: e.target.value }))}
                                    placeholder="Ringkasan singkat isi bab ini..."
                                    disabled={savingModal}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-publish-orange" onClick={saveBab} disabled={savingModal}>
                                {savingModal ? <Loader2 size={16} className="animate-spin" /> : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {lessonModal && (
                <div className="modal-overlay" onClick={() => !savingModal && setLessonModal(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{lessonModal.id ? "Edit Lesson" : "Tambah Lesson"}</h3>
                            <button onClick={() => setLessonModal(null)} disabled={savingModal}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {!lessonModal.id && (
                                <div className="lesson-mode-tabs">
                                    <button
                                        className={`lesson-mode-tab ${lessonModal.mode === "upload" ? "active" : ""}`}
                                        onClick={() => switchLessonMode("upload")}
                                        disabled={savingModal}
                                        type="button"
                                    >
                                        Upload Video Baru
                                    </button>
                                    <button
                                        className={`lesson-mode-tab ${lessonModal.mode === "existing" ? "active" : ""}`}
                                        onClick={() => switchLessonMode("existing")}
                                        disabled={savingModal}
                                        type="button"
                                    >
                                        Pilih Video Lama
                                    </button>
                                </div>
                            )}

                            {lessonModal.mode === "existing" && !lessonModal.id ? (
                                <div className="form-group">
                                    <label>Video yang belum punya bab</label>
                                    {loadingUnassigned ? (
                                        <div className="unassigned-loading">
                                            <Loader2 size={18} className="animate-spin" /> Memuat video lama...
                                        </div>
                                    ) : unassignedVideos.length > 0 ? (
                                        <div className="unassigned-list">
                                            {unassignedVideos.map((v) => (
                                                <label key={v.id} className="unassigned-item">
                                                    <input
                                                        type="radio"
                                                        name="unassigned-video"
                                                        checked={lessonModal.selectedExistingId === v.id}
                                                        onChange={() => setLessonModal((p) => ({ ...p, selectedExistingId: v.id }))}
                                                        disabled={savingModal}
                                                    />
                                                    <div className="unassigned-item-body">
                                                        <span className="unassigned-item-title">{v.title}</span>
                                                        {v.description && <span className="unassigned-item-desc">{v.description}</span>}
                                                    </div>
                                                    {v.video_url && (
                                                        <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="btn-icon-small" title="Preview video">
                                                            <Eye size={14} />
                                                        </a>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="unassigned-empty">Tidak ada video lama yang belum punya bab.</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Judul Lesson</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={lessonModal.title}
                                            onChange={(e) => setLessonModal((p) => ({ ...p, title: e.target.value }))}
                                            disabled={savingModal}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Deskripsi (opsional)</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={4}
                                            value={lessonModal.description}
                                            onChange={(e) => setLessonModal((p) => ({ ...p, description: e.target.value }))}
                                            placeholder="Poin-poin yang dipelajari di lesson ini..."
                                            disabled={savingModal}
                                        />
                                    </div>
                                    {!lessonModal.id && (
                                        <div className="form-group">
                                            <label>File Video</label>
                                            <input
                                                type="file"
                                                accept="video/mp4,video/quicktime,video/x-msvideo"
                                                onChange={handleLessonFileChange}
                                                disabled={savingModal}
                                            />
                                            {lessonModal.videoFile && <p className="file-selected-name">{lessonModal.videoFile.name}</p>}
                                        </div>
                                    )}
                                    {savingModal && uploadProgress > 0 && (
                                        <div className="progress-container">
                                            <div className="progress-header">
                                                <span>Mengupload...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="progress-bar-bg">
                                                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-publish-orange" onClick={saveLesson} disabled={savingModal}>
                                {savingModal ? <Loader2 size={16} className="animate-spin" /> : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .curriculum-page-container { padding: 30px 40px; min-height: 100vh; display: flex; flex-direction: column; }
                .card-shadow { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }

                .editor-view-header { margin-bottom: 24px; }
                .btn-back {
                    display: flex; align-items: center; gap: 8px; background: white;
                    border: 1px solid #e2e8f0; color: #64748b; padding: 8px 16px;
                    border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
                    margin-bottom: 16px; transition: all 0.2s;
                }
                .btn-back:hover { color: #1e293b; border-color: #cbd5e1; }
                .editor-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
                .editor-subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

                .bab-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
                .bab-card { overflow: hidden; }
                .bab-card-header {
                    display: flex; align-items: center; gap: 12px; padding: 18px 24px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .bab-expand-btn {
                    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
                    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
                    color: #64748b; cursor: pointer; flex-shrink: 0;
                }
                .bab-title-block { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
                .bab-eyebrow { font-size: 11px; font-weight: 700; color: #ff7a00; letter-spacing: 0.5px; }
                .bab-title { font-size: 16px; font-weight: 700; color: #1e293b; }
                .bab-actions { display: flex; gap: 6px; flex-shrink: 0; }

                .bab-card-body { padding: 18px 24px 22px; }
                .bab-overview { color: #64748b; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5; }

                .lesson-list { display: flex; flex-direction: column; gap: 8px; }
                .lesson-row {
                    display: flex; align-items: center; gap: 12px; padding: 10px 14px;
                    background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;
                }
                .lesson-icon { color: #ff7a00; flex-shrink: 0; }
                .lesson-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
                .lesson-title { font-size: 13px; font-weight: 600; color: #334155; }
                .lesson-desc { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .lesson-actions { display: flex; gap: 4px; flex-shrink: 0; }

                .btn-icon-small {
                    display: flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; background: #fff; color: #64748b;
                    border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                }
                .btn-icon-small:hover:not(:disabled) { background: #e2e8f0; color: #1e293b; }
                .btn-icon-small:disabled { opacity: 0.35; cursor: not-allowed; }
                .btn-icon-danger:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

                .btn-add-lesson {
                    margin-top: 12px; display: flex; align-items: center; gap: 6px;
                    background: #fff7ed; color: #ff7a00; border: 1px dashed #fdba74;
                    padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
                }
                .btn-add-lesson:hover { background: #ffedd5; }

                .btn-add-bab {
                    align-self: flex-start; display: flex; align-items: center; gap: 8px;
                    background: #ff7a00; color: white; border: none; padding: 10px 20px;
                    border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
                }
                .btn-add-bab:hover { background: #e66e00; }

                .empty-state-modern { padding: 60px 40px; text-align: center; }
                .empty-state-modern h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
                .empty-state-modern p { color: #64748b; font-size: 14px; }

                .loading-state { text-align: center; padding: 60px 0; color: #64748b; }
                .spinner-icon { animation: spin 1s linear infinite; color: #ff7a00; margin: 0 auto 16px; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
                    display: flex; align-items: center; justify-content: center; z-index: 1000;
                }
                .modal-box { background: #fff; border-radius: 14px; width: 480px; max-width: 92vw; max-height: 88vh; overflow-y: auto; }
                .modal-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 18px 22px; border-bottom: 1px solid #f1f5f9;
                }
                .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
                .modal-header button { background: none; border: none; cursor: pointer; color: #94a3b8; }
                .modal-body { padding: 20px 22px; }
                .modal-footer { padding: 16px 22px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }

                .form-group { margin-bottom: 16px; }
                .form-group label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
                .form-input, .form-textarea {
                    width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
                    font-size: 14px; font-family: inherit; box-sizing: border-box;
                }
                .form-input:focus, .form-textarea:focus { outline: none; border-color: #ff7a00; }
                .file-selected-name { font-size: 12px; color: #64748b; margin-top: 6px; }

                .lesson-mode-tabs { display: flex; gap: 8px; margin-bottom: 18px; }
                .lesson-mode-tab {
                    flex: 1; padding: 9px 10px; border-radius: 8px; border: 1px solid #e2e8f0;
                    background: #fff; color: #64748b; font-size: 13px; font-weight: 600; cursor: pointer;
                }
                .lesson-mode-tab.active { background: #fff7ed; border-color: #ff7a00; color: #ff7a00; }
                .lesson-mode-tab:disabled { opacity: 0.6; cursor: not-allowed; }

                .unassigned-loading { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; padding: 16px 0; }
                .unassigned-empty { color: #94a3b8; font-size: 13px; padding: 12px 0; }
                .unassigned-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
                .unassigned-item {
                    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
                    border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;
                }
                .unassigned-item:has(input:checked) { border-color: #ff7a00; background: #fff7ed; }
                .unassigned-item-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
                .unassigned-item-title { font-size: 13px; font-weight: 600; color: #334155; }
                .unassigned-item-desc {
                    font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .progress-container { margin-top: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .progress-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
                .progress-bar-bg { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: #ff7a00; border-radius: 4px; transition: width 0.2s ease; }

                .btn-publish-orange {
                    background: #ff7a00; color: white; border: none; padding: 10px 22px;
                    border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
                    display: flex; align-items: center; gap: 8px;
                }
                .btn-publish-orange:hover:not(:disabled) { background: #e66e00; }
                .btn-publish-orange:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>
        </Layout>
    );
}
