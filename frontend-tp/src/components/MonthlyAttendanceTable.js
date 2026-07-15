"use client";

import { useState, useEffect } from "react";
import { getApiUrl } from "@/config/api";

export default function MonthlyAttendanceTable() {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [loading, setLoading] = useState(false);
    const [karyawanList, setKaryawanList] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                if (!token) return;

                const headers = {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                };

                // Fetch karyawan
                const resKar = await fetch(getApiUrl("hr/karyawan?all=true&status=1"), { headers });
                const jsonKar = await resKar.json();

                // Fetch attendance for the month
                const resAbs = await fetch(getApiUrl(`hr/absensi?bulan=${selectedMonth}&per_page=1000`), { headers });
                const jsonAbs = await resAbs.json();

                if (jsonKar.success) {
                    setKaryawanList(jsonKar.data || []);
                }

                // Process attendance
                const absMap = {}; // { empId: { fullDate: { in, out } } }
                if (jsonAbs.success && jsonAbs.data) {
                    jsonAbs.data.forEach(item => {
                        const kId = item.karyawan || item.karyawan_id || item.karyawan_rel?.id;
                        if (!kId) return;
                        if (!absMap[kId]) {
                            absMap[kId] = {};
                        }
                        absMap[kId][item.tanggal] = {
                            in: item.check_in,
                            out: item.check_out,
                            status: item.status_absensi
                        };
                    });
                }
                setAttendanceData(absMap);
            } catch (err) {
                console.error("Failed to load monthly attendance", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedMonth]);

    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();

    const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const dateObj = new Date(year, month - 1, d);
        return {
            date: d,
            fullDate: `${year}-${month}-${String(d).padStart(2, '0')}`,
            isSunday: dateObj.getDay() === 0
        };
    });

    return (
        <article className="hr-panel hr-panel--table mt-6" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>
            <div className="hr-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 className="hr-panel__title">Laporan Kehadiran Bulanan</h3>
                    <p className="hr-panel__eyebrow">Tabel waktu masuk & pulang karyawan per bulan</p>
                </div>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Memuat data kehadiran...</div>
            ) : (
                <div style={{ overflowX: 'auto', padding: '0 0 1rem 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '1000px' }}>
                        <thead>
                            <tr>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e5e7eb',
                                    background: '#f8fafc',
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 10,
                                    borderRight: '1px solid #e5e7eb',
                                    fontWeight: '600'
                                }}>
                                    Nama Karyawan
                                </th>
                                {dates.map(d => (
                                    <th key={d.date} style={{
                                        padding: '0.5rem',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #e5e7eb',
                                        background: d.isSunday ? '#fee2e2' : '#f8fafc',
                                        color: d.isSunday ? '#ef4444' : '#475569',
                                        borderRight: '1px solid #e5e7eb',
                                        fontWeight: '600'
                                    }}>
                                        {d.date}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {karyawanList.length === 0 ? (
                                <tr>
                                    <td colSpan={dates.length + 1} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                        Tidak ada data karyawan
                                    </td>
                                </tr>
                            ) : (
                                karyawanList.map(karyawan => (
                                    <tr key={karyawan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{
                                            padding: '0.75rem',
                                            background: '#ffffff',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 5,
                                            borderRight: '1px solid #e5e7eb',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap',
                                            color: '#1e293b'
                                        }}>
                                            {karyawan.nama}
                                        </td>
                                        {dates.map(d => {
                                            const att = attendanceData[karyawan.id]?.[d.fullDate];
                                            return (
                                                <td key={d.date} style={{
                                                    padding: '0.5rem',
                                                    textAlign: 'center',
                                                    background: d.isSunday ? '#fef2f2' : '#ffffff',
                                                    borderRight: '1px solid #f1f5f9',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {att ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{ color: '#10b981', fontWeight: '500' }}>{att.in ? att.in.slice(0, 5) : '-'}</span>
                                                            <span style={{ color: '#f43f5e', fontWeight: '500' }}>{att.out ? att.out.slice(0, 5) : '-'}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1' }}>-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}
