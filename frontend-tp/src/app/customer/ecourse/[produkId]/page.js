"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerSession, customerFetch } from "@/lib/customerAuth";
import { X, CheckCircle2, Circle, PlayCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function EcourseViewerPage() {
    const params = useParams();
    const router = useRouter();
    const produkId = params?.produkId;
    const videoRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [produk, setProduk] = useState(null);
    const [babList, setBabList] = useState([]);
    const [expandedBab, setExpandedBab] = useState({});
    const [selected, setSelected] = useState(null); // { type: "overview"|"lesson", babId, lessonId }
    const [markingDone, setMarkingDone] = useState(false);

    useEffect(() => {
        const session = getCustomerSession();
        if (!session.token) {
            router.replace("/customer");
            return;
        }
        if (produkId) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [produkId]);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await customerFetch(`/ecourse/${produkId}`);
            const data = res?.data;
            setProduk(data?.produk || null);
            const bab = data?.bab || [];
            setBabList(bab);
            setExpandedBab(Object.fromEntries(bab.map((b) => [b.id, true])));

            // Default: pilih lesson pertama yang belum selesai, atau lesson pertama.
            const allLessons = bab.flatMap((b) => (b.ecourses || []).map((l) => ({ ...l, babId: b.id })));
            const firstUnfinished = allLessons.find((l) => !l.is_completed) || allLessons[0];
            if (firstUnfinished) {
                setSelected({ type: "lesson", babId: firstUnfinished.babId, lessonId: firstUnfinished.id });
            } else if (bab[0]) {
                setSelected({ type: "overview", babId: bab[0].id });
            }
        } catch (err) {
            console.error("Fetch ecourse viewer error:", err);
            if (err.status === 403) {
                setError("Anda belum membeli kursus ini.");
            } else if (err.status === 404) {
                setError("Kursus tidak ditemukan.");
            } else {
                setError(err.message || "Gagal memuat kursus.");
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleBab = (id) => setExpandedBab((prev) => ({ ...prev, [id]: !prev[id] }));

    const currentBab = useMemo(
        () => babList.find((b) => b.id === selected?.babId) || null,
        [babList, selected]
    );
    const currentLesson = useMemo(
        () => (selected?.type === "lesson" ? (currentBab?.ecourses || []).find((l) => l.id === selected.lessonId) : null),
        [currentBab, selected]
    );

    const allLessonsFlat = useMemo(
        () => babList.flatMap((b) => (b.ecourses || []).map((l) => ({ ...l, babId: b.id }))),
        [babList]
    );

    const totalLesson = allLessonsFlat.length;
    const selesaiCount = allLessonsFlat.filter((l) => l.is_completed).length;

    const markComplete = useCallback(async (lessonId, isCompleted = true) => {
        setMarkingDone(true);
        try {
            await customerFetch(`/ecourse/lesson/${lessonId}/progress`, {
                method: "POST",
                body: JSON.stringify({ is_completed: isCompleted }),
            });
            setBabList((prev) => prev.map((b) => ({
                ...b,
                ecourses: (b.ecourses || []).map((l) => (l.id === lessonId ? { ...l, is_completed: isCompleted } : l)),
            })));
        } catch (err) {
            toast.error(err.message || "Gagal menyimpan progress");
        } finally {
            setMarkingDone(false);
        }
    }, []);

    const goToNextLesson = () => {
        const idx = allLessonsFlat.findIndex((l) => l.id === currentLesson?.id);
        const next = allLessonsFlat[idx + 1];
        if (next) {
            setSelected({ type: "lesson", babId: next.babId, lessonId: next.id });
        }
    };

    const handleVideoEnded = () => {
        if (currentLesson && !currentLesson.is_completed) {
            markComplete(currentLesson.id, true);
        }
    };

    if (loading) {
        return (
            <div className="viewer-page">
                <div className="viewer-loading">
                    <Loader2 size={32} className="spinner-icon" />
                    <p>Memuat kursus...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="viewer-page">
                <div className="viewer-error">
                    <h2>Tidak Bisa Mengakses Kursus</h2>
                    <p>{error}</p>
                    <button onClick={() => router.push("/customer/ecourse")}>Kembali ke Kursus Saya</button>
                </div>
                <style jsx>{`
                    .viewer-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
                    .viewer-error { text-align: center; max-width: 360px; }
                    .viewer-error h2 { font-size: 18px; color: #1e293b; margin: 0 0 8px 0; }
                    .viewer-error p { color: #64748b; font-size: 14px; margin: 0 0 20px 0; }
                    .viewer-error button {
                        background: #ff7a00; color: #fff; border: none; padding: 10px 20px;
                        border-radius: 8px; font-weight: 600; cursor: pointer;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="viewer-page">
            <aside className="viewer-sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-eyebrow">TABLE OF CONTENTS</span>
                    <div className="sidebar-progress">
                        <div className="sidebar-progress-bar">
                            <div className="sidebar-progress-fill" style={{ width: totalLesson ? `${(selesaiCount / totalLesson) * 100}%` : "0%" }} />
                        </div>
                        <span>{selesaiCount}/{totalLesson} selesai</span>
                    </div>
                </div>

                <div className="sidebar-bab-list">
                    {babList.map((bab, babIdx) => (
                        <div key={bab.id} className="sidebar-bab">
                            <button className="sidebar-bab-header" onClick={() => toggleBab(bab.id)}>
                                <span>Bab {babIdx + 1}: {bab.judul}</span>
                                {expandedBab[bab.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {expandedBab[bab.id] && (
                                <div className="sidebar-item-list">
                                    {bab.overview && (
                                        <button
                                            className={`sidebar-item ${selected?.type === "overview" && selected.babId === bab.id ? "active" : ""}`}
                                            onClick={() => setSelected({ type: "overview", babId: bab.id })}
                                        >
                                            <Circle size={14} className="sidebar-item-icon" />
                                            Overview
                                        </button>
                                    )}
                                    {(bab.ecourses || []).map((lesson) => (
                                        <button
                                            key={lesson.id}
                                            className={`sidebar-item ${selected?.type === "lesson" && selected.lessonId === lesson.id ? "active" : ""}`}
                                            onClick={() => setSelected({ type: "lesson", babId: bab.id, lessonId: lesson.id })}
                                        >
                                            {lesson.is_completed
                                                ? <CheckCircle2 size={14} className="sidebar-item-icon done" />
                                                : <PlayCircle size={14} className="sidebar-item-icon" />}
                                            {lesson.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>

            <main className="viewer-main">
                <div className="viewer-topbar">
                    <button className="viewer-close" onClick={() => router.push("/customer/ecourse")}>
                        <X size={20} />
                    </button>
                    <span className="viewer-topbar-title">{produk?.nama}</span>
                </div>

                <div className="viewer-content">
                    {selected?.type === "overview" && currentBab && (
                        <>
                            <h1 className="content-title">{currentBab.judul}</h1>
                            <p className="content-text">{currentBab.overview}</p>
                        </>
                    )}

                    {selected?.type === "lesson" && currentLesson && (
                        <>
                            {currentLesson.video_url ? (
                                <video
                                    ref={videoRef}
                                    key={currentLesson.id}
                                    src={currentLesson.video_url}
                                    controls
                                    className="lesson-video"
                                    onEnded={handleVideoEnded}
                                />
                            ) : (
                                <div className="video-unavailable">Video tidak tersedia</div>
                            )}

                            <h1 className="content-title">{currentLesson.title}</h1>

                            <div className="lesson-actions">
                                <button
                                    className={`btn-mark-done ${currentLesson.is_completed ? "is-done" : ""}`}
                                    disabled={markingDone}
                                    onClick={() => markComplete(currentLesson.id, !currentLesson.is_completed)}
                                >
                                    {currentLesson.is_completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    {currentLesson.is_completed ? "Sudah Selesai" : "Tandai Selesai"}
                                </button>
                                <button className="btn-next-lesson" onClick={goToNextLesson}>
                                    Lesson Berikutnya
                                </button>
                            </div>

                            {currentLesson.description && (
                                <p className="content-text">{currentLesson.description}</p>
                            )}
                        </>
                    )}
                </div>
            </main>

            <style jsx>{`
                .viewer-page { min-height: 100vh; display: flex; background: #f8fafc; }

                .viewer-loading {
                    min-height: 100vh; width: 100%; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; color: #64748b; gap: 12px;
                }
                .spinner-icon { animation: spin 1s linear infinite; color: #ff7a00; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                .viewer-sidebar {
                    width: 320px; flex-shrink: 0; background: #fff; border-right: 1px solid #e2e8f0;
                    overflow-y: auto; display: flex; flex-direction: column;
                }
                .sidebar-header { padding: 20px 20px 16px; border-bottom: 1px solid #f1f5f9; }
                .sidebar-eyebrow { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
                .sidebar-progress { margin-top: 10px; }
                .sidebar-progress-bar { width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
                .sidebar-progress-fill { height: 100%; background: #ff7a00; border-radius: 3px; }
                .sidebar-progress span { font-size: 11px; color: #94a3b8; }

                .sidebar-bab-list { padding: 8px 0; }
                .sidebar-bab { margin-bottom: 4px; }
                .sidebar-bab-header {
                    width: 100%; display: flex; align-items: center; justify-content: space-between;
                    padding: 12px 20px; background: none; border: none; text-align: left;
                    font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer;
                }
                .sidebar-item-list { display: flex; flex-direction: column; }
                .sidebar-item {
                    display: flex; align-items: center; gap: 10px; padding: 9px 20px 9px 32px;
                    background: none; border: none; text-align: left; font-size: 13px; color: #475569;
                    cursor: pointer; transition: all 0.15s;
                }
                .sidebar-item:hover { background: #f8fafc; }
                .sidebar-item.active { background: #fff7ed; color: #ff7a00; font-weight: 600; }
                .sidebar-item-icon { flex-shrink: 0; color: #cbd5e1; }
                .sidebar-item.active .sidebar-item-icon { color: #ff7a00; }
                .sidebar-item-icon.done { color: #22c55e; }

                .viewer-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
                .viewer-topbar {
                    display: flex; align-items: center; gap: 14px; padding: 14px 24px;
                    border-bottom: 1px solid #e2e8f0; background: #fff;
                }
                .viewer-close {
                    background: none; border: none; cursor: pointer; color: #64748b;
                    display: flex; align-items: center; justify-content: center;
                }
                .viewer-close:hover { color: #1e293b; }
                .viewer-topbar-title { font-size: 14px; font-weight: 600; color: #1e293b; }

                .viewer-content { max-width: 820px; margin: 0 auto; padding: 32px 24px 60px; width: 100%; box-sizing: border-box; }
                .content-title { font-size: 22px; font-weight: 700; color: #1e293b; margin: 20px 0 12px; }
                .content-text { color: #475569; font-size: 15px; line-height: 1.7; white-space: pre-wrap; }

                .lesson-video { width: 100%; border-radius: 12px; background: #000; max-height: 460px; }
                .video-unavailable {
                    width: 100%; height: 300px; background: #1e293b; color: #94a3b8;
                    display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 14px;
                }

                .lesson-actions { display: flex; gap: 10px; margin-bottom: 16px; }
                .btn-mark-done, .btn-next-lesson {
                    display: flex; align-items: center; gap: 8px; padding: 9px 16px;
                    border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
                }
                .btn-mark-done { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
                .btn-mark-done.is-done { background: #ecfdf5; color: #16a34a; border-color: #bbf7d0; }
                .btn-mark-done:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-next-lesson { background: #ff7a00; color: #fff; border: none; }
                .btn-next-lesson:hover { background: #e66e00; }

                @media (max-width: 768px) {
                    .viewer-page { flex-direction: column; }
                    .viewer-sidebar { width: 100%; max-height: 40vh; }
                }
            `}</style>
        </div>
    );
}
