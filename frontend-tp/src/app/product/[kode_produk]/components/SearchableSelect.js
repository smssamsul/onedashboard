"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Dropdown provinsi/kabupaten-kota/kecamatan yang bisa diketik untuk
 * menyaring (bukan cuma scroll <select> panjang). Opsi difilter di client -
 * datanya sudah dimuat penuh lewat cascading fetch (provinces/cities/districts
 * per level sudah dipersempit), jadi tidak perlu API pencarian terpisah.
 */
export default function SearchableSelect({
  options,
  value,
  onSelect,
  placeholder,
  disabled,
  loading,
  loadingText,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => String(o.id) === String(value));

  // Sinkronkan teks input dengan opsi terpilih saat dropdown tertutup
  // (termasuk saat value di-reset dari luar, mis. ganti provinsi).
  useEffect(() => {
    if (!open) {
      setQuery(selectedOption ? selectedOption.name : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isShowingSelectedName = selectedOption && query === selectedOption.name;
  const filtered = query.trim() === "" || isShowingSelectedName
    ? options
    : options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        className="compact-input"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        style={{
          cursor: disabled ? "not-allowed" : "text",
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
      />

      {loading && (
        <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
          {loadingText}
        </small>
      )}

      {open && !disabled && !loading && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            marginTop: "4px",
            maxHeight: "220px",
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "14px" }}>
              Tidak ditemukan
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                  setQuery(opt.name);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#111827",
                  backgroundColor: String(opt.id) === String(value) ? "#fff7ed" : "transparent",
                }}
              >
                {opt.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
