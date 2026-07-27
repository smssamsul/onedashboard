"use client";

import { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import { getCustomers } from "@/lib/sales/customer";
import { toastSuccess } from "@/lib/toast";
import "@/styles/sales/admin.css";

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function GenerateLinkModal({ produkList, onClose }) {
  const [genProdukId, setGenProdukId] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const debouncedRefSearch = useDebouncedValue(refSearch);
  const [refResults, setRefResults] = useState([]);
  const [refCustomer, setRefCustomer] = useState(null);
  const [searchingRef, setSearchingRef] = useState(false);

  useEffect(() => {
    if (!debouncedRefSearch.trim()) {
      setRefResults([]);
      return;
    }
    setSearchingRef(true);
    getCustomers(1, 5, { search: debouncedRefSearch.trim() })
      .then((res) => setRefResults(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setRefResults([]))
      .finally(() => setSearchingRef(false));
  }, [debouncedRefSearch]);

  const selectedProdukForLink = produkList.find((p) => String(p.id) === String(genProdukId));
  const invitationLink = selectedProdukForLink?.kode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invitation/${selectedProdukForLink.kode}${refCustomer ? `?ref=${refCustomer.memberID}` : ""}`
    : "";

  const handleCopyLink = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    toastSuccess("Link undangan disalin ke clipboard");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Generate Link Undangan</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group full-width">
            <label>Produk *</label>
            <select value={genProdukId} onChange={(e) => setGenProdukId(e.target.value)}>
              <option value="">-- Pilih Produk --</option>
              {produkList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>
          <div className="form-group full-width" style={{ position: "relative" }}>
            <label>Referral (opsional) — cari nama/WA customer</label>
            <input
              type="text"
              value={refCustomer ? `${refCustomer.nama} (${refCustomer.wa})` : refSearch}
              onChange={(e) => {
                setRefCustomer(null);
                setRefSearch(e.target.value);
              }}
              placeholder="Ketik nama atau nomor WA..."
            />
            {!refCustomer && refResults.length > 0 && (
              <div
                className="customers-search__dropdown"
                style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%", maxHeight: 200, overflowY: "auto" }}
              >
                {refResults.map((c) => (
                  <div
                    key={c.id}
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    onClick={() => {
                      setRefCustomer(c);
                      setRefSearch("");
                      setRefResults([]);
                    }}
                  >
                    {c.nama} — {c.wa} {c.memberID ? `(${c.memberID})` : "(belum punya memberID)"}
                  </div>
                ))}
              </div>
            )}
            {searchingRef && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Mencari...</p>}
          </div>
          {invitationLink && (
            <div className="form-group full-width">
              <label>Link Undangan</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" readOnly value={invitationLink} style={{ flex: 1 }} />
                <button type="button" className="customers-button customers-button--primary" onClick={handleCopyLink}>
                  <Copy size={16} /> Copy
                </button>
              </div>
              {refCustomer && !refCustomer.memberID && (
                <p style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>
                  Customer ini belum punya memberID, referral tidak akan tercatat.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
