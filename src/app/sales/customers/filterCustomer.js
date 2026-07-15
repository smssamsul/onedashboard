"use client";

import { useState } from "react";
import "@/styles/sales/customer.css";
import { X } from "lucide-react";

export default function FilterCustomerModal({ onClose, onApply, currentFilters, salesOptions }) {
    const [filterState, setFilterState] = useState({
        verifikasi: currentFilters.verifikasi === "all" ? ["verified", "unverified"] : (Array.isArray(currentFilters.verifikasi) ? currentFilters.verifikasi : [currentFilters.verifikasi]),
        sales_id: currentFilters.sales_id || "all",
    });

    const [salesSearch, setSalesSearch] = useState("");

    const handleCheckboxChange = (value) => {
        setFilterState(prev => {
            const current = [...prev.verifikasi];
            if (current.includes(value)) {
                return { ...prev, verifikasi: current.filter(item => item !== value) };
            } else {
                return { ...prev, verifikasi: [...current, value] };
            }
        });
    };

    const handleSalesChange = (id) => {
        setFilterState(prev => ({ ...prev, sales_id: id }));
    };

    const handleReset = () => {
        setFilterState({
            verifikasi: ["verified", "unverified"],
            sales_id: "all"
        });
        setSalesSearch("");
    };

    const handleApply = () => {
        let verifikasiValue = "all";
        if (filterState.verifikasi.length === 2) verifikasiValue = "all";
        else if (filterState.verifikasi.length === 0) verifikasiValue = "none";
        else verifikasiValue = filterState.verifikasi[0];

        onApply({ ...filterState, verifikasi: verifikasiValue });
        onClose();
    };

    // Filter sales options based on search
    const filteredSales = salesOptions.filter(s =>
        s.text.toLowerCase().includes(salesSearch.toLowerCase())
    );

    return (
        <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: "500px", borderRadius: "12px", overflow: "hidden" }}>
                {/* HEADER */}
                <div className="modal-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>Filter Customer</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} color="#64748b" />
                    </button>
                </div>

                {/* BODY */}
                <div className="modal-body" style={{ padding: "20px", maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="form-grid" style={{ gridTemplateColumns: "1fr", gap: "24px" }}>

                        {/* Verifikasi Filter */}
                        <div className="form-group">
                            <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "8px", display: "block" }}>Status Verifikasi</label>
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                                    <input
                                        type="checkbox"
                                        checked={filterState.verifikasi.includes("verified")}
                                        onChange={() => handleCheckboxChange("verified")}
                                        style={{ width: "16px", height: "16px", accentColor: "#f97316" }}
                                    />
                                    Verified
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                                    <input
                                        type="checkbox"
                                        checked={filterState.verifikasi.includes("unverified")}
                                        onChange={() => handleCheckboxChange("unverified")}
                                        style={{ width: "16px", height: "16px", accentColor: "#f97316" }}
                                    />
                                    Unverified
                                </label>
                            </div>
                        </div>

                        {/* Sales Filter */}
                        <div className="form-group">
                            <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "8px", display: "block" }}>Sales Handling</label>
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                {/* Search Input */}
                                <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                                    <input
                                        type="text"
                                        placeholder="Cari sales..."
                                        value={salesSearch}
                                        onChange={(e) => setSalesSearch(e.target.value)}
                                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", outline: "none" }}
                                    />
                                </div>

                                {/* List */}
                                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                                        <input
                                            type="radio"
                                            name="sales_id"
                                            checked={filterState.sales_id === "all"}
                                            onChange={() => handleSalesChange("all")}
                                            style={{ width: "16px", height: "16px", accentColor: "#f97316" }}
                                        />
                                        Semua Sales
                                    </label>

                                    {filteredSales.map(sales => (
                                        <label key={sales.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                                            <input
                                                type="radio"
                                                name="sales_id" // Ensure radio behavior
                                                checked={String(filterState.sales_id) === String(sales.id)}
                                                onChange={() => handleSalesChange(sales.id)}
                                                style={{ width: "16px", height: "16px", accentColor: "#f97316" }}
                                            />
                                            {sales.text}
                                        </label>
                                    ))}

                                    {filteredSales.length === 0 && (
                                        <div style={{ padding: "15px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                                            Tidak ditemukan
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER */}
                <div className="modal-footer" style={{ borderTop: "1px solid #f1f5f9", padding: "16px 20px", display: "flex", justifyContent: "space-between", gap: "12px", background: "white" }}>
                    <button
                        type="button"
                        onClick={handleReset}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "white",
                            color: "#475569",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            display: "flex", alignItems: "center", gap: "6px"
                        }}
                    >
                        <X size={16} /> Reset
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        style={{
                            padding: "8px 24px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#f97316",
                            color: "white",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            boxShadow: "0 2px 4px rgba(249, 115, 22, 0.2)"
                        }}
                    >
                        Terapkan
                    </button>
                </div>

            </div>
        </div>
    );
}
