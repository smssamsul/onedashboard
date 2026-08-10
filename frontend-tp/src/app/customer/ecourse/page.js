"use client";

import { useState, useEffect } from "react";
import CustomerLayout from "@/components/customer/CustomerLayout";
import { customerFetch } from "@/lib/customerAuth";
import { GraduationCap, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function MyCoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await customerFetch("/ecourse");
            setCourses(res?.data || []);
        } catch (err) {
            console.error("Fetch my courses error:", err);
            toast.error(err.message || "Gagal memuat kursus Anda");
        } finally {
            setLoading(false);
        }
    };

    return (
        <CustomerLayout>
            <div className="my-courses-container">
                <div className="my-courses-header">
                    <h1>Kursus Saya</h1>
                    <p>Video kursus yang sudah Anda beli</p>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="spinner-icon" />
                        <p>Memuat kursus...</p>
                    </div>
                ) : courses.length > 0 ? (
                    <div className="course-grid">
                        {courses.map((course) => {
                            const percent = course.total_lesson
                                ? Math.round((course.lesson_selesai / course.total_lesson) * 100)
                                : 0;
                            return (
                                <Link key={course.id} href={`/customer/ecourse/${course.id}`} className="course-card">
                                    <div className="course-card-thumb">
                                        <GraduationCap size={32} />
                                    </div>
                                    <div className="course-card-body">
                                        <h3>{course.nama}</h3>
                                        <div className="course-progress-bar">
                                            <div className="course-progress-fill" style={{ width: `${percent}%` }} />
                                        </div>
                                        <span className="course-progress-label">
                                            {course.lesson_selesai}/{course.total_lesson} video selesai
                                        </span>
                                    </div>
                                    <PlayCircle size={22} className="course-card-play" />
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">
                        <GraduationCap size={48} />
                        <h3>Belum ada kursus</h3>
                        <p>Kursus yang Anda beli akan muncul di sini.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .my-courses-container { max-width: 1000px; margin: 0 auto; padding: 32px 20px 60px; }
                .my-courses-header { margin-bottom: 24px; }
                .my-courses-header h1 { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0; }
                .my-courses-header p { color: #64748b; font-size: 14px; margin: 0; }

                .course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
                .course-card {
                    display: flex; align-items: center; gap: 14px; padding: 18px;
                    background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
                    text-decoration: none; transition: all 0.2s;
                }
                .course-card:hover { border-color: #ff7a00; box-shadow: 0 6px 16px rgba(255,122,0,0.12); transform: translateY(-2px); }
                .course-card-thumb {
                    width: 52px; height: 52px; border-radius: 12px; background: #fff7ed; color: #ff7a00;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .course-card-body { flex: 1; min-width: 0; }
                .course-card-body h3 {
                    font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .course-progress-bar { width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
                .course-progress-fill { height: 100%; background: #ff7a00; border-radius: 3px; }
                .course-progress-label { font-size: 11px; color: #94a3b8; margin-top: 4px; display: block; }
                .course-card-play { color: #cbd5e1; flex-shrink: 0; }

                .loading-state, .empty-state {
                    text-align: center; padding: 80px 20px; color: #64748b;
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                }
                .empty-state svg { color: #cbd5e1; margin-bottom: 8px; }
                .empty-state h3 { font-size: 18px; color: #1e293b; margin: 0; }
                .empty-state p { font-size: 14px; margin: 0; }
                .spinner-icon { animation: spin 1s linear infinite; color: #ff7a00; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </CustomerLayout>
    );
}
