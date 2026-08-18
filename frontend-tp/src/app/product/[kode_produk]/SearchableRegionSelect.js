"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Dropdown provinsi/kota/kecamatan dengan pencarian ketik-untuk-filter.
 * Dibuat ringan tanpa library eksternal (halaman publik, hindari bundle berat) -
 * daftar opsi difilter di client karena tiap level sudah di-scope oleh cascading
 * (kota hanya yang di provinsi terpilih, kecamatan hanya yang di kota terpilih),
 * jadi jumlahnya selalu kecil.
 */
export default function SearchableRegionSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Pilih...",
  disabled = false,
  loading = false,
  loadingText = "Memuat...",
  getOptionId = (opt) => opt.id,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedOption = options.find((o) => String(getOptionId(o)) === String(value));

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => (o.name || "").toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const isDisabled = disabled || loading;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        type="text"
        className="compact-input"
        placeholder={loading ? loadingText : placeholder}
        value={open ? query : (selectedOption?.name || "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (isDisabled) return;
          setOpen(true);
          setQuery("");
        }}
        disabled={isDisabled}
        autoComplete="off"
        style={{
          appearance: "none",
          cursor: isDisabled ? "not-allowed" : "text",
          backgroundColor: isDisabled ? "#f9fafb" : "white",
        }}
      />
      {open && !isDisabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginTop: "4px",
            maxHeight: "220px",
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>
              Tidak ditemukan
            </div>
          ) : (
            filtered.map((opt) => {
              const id = getOptionId(opt);
              const isSelected = String(id) === String(value);
              return (
                <div
                  key={id}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    padding: "9px 12px",
                    fontSize: "14px",
                    cursor: "pointer",
                    background: isSelected ? "#eef2ff" : "white",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? "#eef2ff" : "white")}
                >
                  {opt.name}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
