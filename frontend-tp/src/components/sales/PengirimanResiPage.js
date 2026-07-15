"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck, RefreshCw, Search, ExternalLink,
  ChevronLeft, ChevronRight, X, Plus, Package,
  Phone, MapPin, User, Calendar, Hash
} from "lucide-react";
import toast from "react-hot-toast";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/pengiriman-resi.css";

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatDateId(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short" }).format(d);
  } catch {
    return String(v);
  }
}

function StatusBadge({ status }) {
  const map = {
    confirmed: { label: "Confirmed", bg: "#dcfce7", color: "#15803d" },
    allocated: { label: "Allocated", bg: "#dbeafe", color: "#1d4ed8" },
    picking_up: { label: "Picking Up", bg: "#fef9c3", color: "#854d0e" },
    picked: { label: "Picked", bg: "#fef9c3", color: "#854d0e" },
    dropping_off: { label: "Dropping Off", bg: "#e0e7ff", color: "#4338ca" },
    delivered: { label: "Delivered", bg: "#dcfce7", color: "#15803d" },
    rejected: { label: "Rejected", bg: "#fee2e2", color: "#dc2626" },
    cancelled: { label: "Cancelled", bg: "#f1f5f9", color: "#64748b" },
    returned: { label: "Returned", bg: "#fef3c7", color: "#92400e" },
  };
  const s = (status || "").toLowerCase();
  const cfg = map[s] || { label: status || "—", bg: "#f1f5f9", color: "#64748b" };
  return (
    <span className="pengiriman-resi-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Modal Tracking Timeline ──────────────────────────────────────────────────
function TrackingModal({ resi, onClose, authHeaders }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resi?.id) return;
    setLoading(true); setError(null);
    fetch(`/api/sales/order-resi/${resi.id}/tracking`, { headers: authHeaders, cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else setError(d.message || "Gagal memuat tracking"); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [resi?.id]);

  const histories = data?.history || data?.tracking_history || [];
  const waybill = resi?.waybill_id || resi?.tracking_id || "—";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Tracking Pengiriman</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontFamily: "monospace" }}>{waybill}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>Memuat tracking…</p>}
          {error && <p style={{ fontSize: 13, color: "#dc2626" }}>{error}</p>}
          {!loading && !error && histories.length === 0 && <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>Belum ada data tracking timeline.</p>}
          {!loading && histories.length > 0 && (
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
              {histories.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: i === 0 ? "#2563eb" : "#e2e8f0", border: "2px solid #fff", boxShadow: "0 0 0 2px " + (i === 0 ? "#2563eb" : "#cbd5e1"), marginTop: 2, zIndex: 1 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{h.note || h.description || h.status || "—"}</div>
                    {h.location?.address && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{h.location.address}</div>}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{h.updated_at ? formatDateId(h.updated_at) : (h.datetime ? formatDateId(h.datetime) : "")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Detail Order ───────────────────────────────────────────────────────
function OrderDetailModal({ resi, onClose, onRefresh, onCetakResi, onTracking, authHeaders, syncingId, labelLoadingId, onSync }) {
  const o = resi?.order || {};
  const cust = o?.customer_rel || {};
  const prod = o?.produk_rel || {};

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 8px", display: "flex" }}>
              <Package size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Detail Pengiriman</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "monospace", marginTop: 2 }}>
                {o?.kode_order || `Order #${resi?.order_id}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff", padding: "6px 8px", borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {/* Info Resi */}
          <div style={{ background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", border: "1px solid #bae6fd", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#0369a1", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Info Resi</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem icon={<Truck size={13} />} label="Kurir" value={[resi?.courier_company?.toUpperCase(), resi?.courier_type].filter(Boolean).join(" · ")} />
              <InfoItem icon={<Hash size={13} />} label="No. Resi" value={resi?.waybill_id || resi?.tracking_id || "—"} mono />
              <InfoItem icon={<Calendar size={13} />} label="Jadwal" value={resi?.delivery_type === "scheduled" ? formatDateId(resi?.scheduled_at) : "Langsung (now)"} />
              <InfoItem icon={null} label="Status" value={<StatusBadge status={resi?.status} />} />
            </div>
            {resi?.tracking_id && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                Tracking ID: <span style={{ fontFamily: "monospace", color: "#0f172a" }}>{resi.tracking_id}</span>
              </div>
            )}
          </div>

          {/* Info Customer */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Customer</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem icon={<User size={13} />} label="Nama" value={cust?.nama || "—"} />
              <InfoItem icon={<Phone size={13} />} label="No. WA" value={cust?.wa || "—"} />
              <InfoItem icon={<MapPin size={13} />} label="Alamat" value={o?.alamat || "—"} wide />
            </div>
          </div>

          {/* Info Produk & Order */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Order & Produk</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem icon={<Package size={13} />} label="Produk" value={prod?.nama || "—"} />
              <InfoItem icon={<Hash size={13} />} label="Kode Order" value={o?.kode_order || "—"} mono />
              <InfoItem icon={null} label="Status Bayar" value={String(o?.status_pembayaran) === "2" ? "✅ Paid" : "⏳ Belum Paid"} />
              <InfoItem icon={<Calendar size={13} />} label="Dibuat" value={o?.create_at ? formatDateId(o.create_at) : "—"} />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, flexWrap: "wrap", background: "#fff" }}>
          <button
            type="button"
            className="pengiriman-resi-btn-sync"
            disabled={syncingId === resi?.id}
            onClick={() => onSync(resi?.id)}
          >
            <RefreshCw size={13} className={syncingId === resi?.id ? "spin" : ""} />
            {syncingId === resi?.id ? "..." : "Refresh Status"}
          </button>
          <button
            type="button"
            className="pengiriman-resi-btn-track"
            onClick={() => { onClose(); onTracking(resi); }}
          >
            Tracking Timeline
          </button>
          {resi?.biteship_order_id && (
            <button
              type="button"
              className="pengiriman-resi-btn-label"
              disabled={labelLoadingId === resi?.id}
              onClick={() => onCetakResi(resi)}
            >
              {labelLoadingId === resi?.id ? "..." : "Cetak Resi PDF"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, mono = false, wide = false }) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : {}}>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#1e293b", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
        {value || "—"}
      </div>
    </div>
  );
}

// ── Modal Buat Pengiriman Baru ────────────────────────────────────────────────
function BuatPengirimanModal({ onClose, authHeaders, onSuccess }) {
  const [searchOrder, setSearchOrder] = useState("");
  const [paidOrders, setPaidOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const debouncedSearch = useDebouncedValue(searchOrder, 500);

  // Field pengiriman
  const [destContactName, setDestContactName] = useState("");
  const [destContactPhone, setDestContactPhone] = useState("");
  const [itemName, setItemName] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [districtResults, setDistrictResults] = useState([]);
  const [loadingDistrict, setLoadingDistrict] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [manualAlamat, setManualAlamat] = useState("");
  const [destPostal, setDestPostal] = useState("");
  const [weightGrams, setWeightGrams] = useState(1000);
  const [deliveryType, setDeliveryType] = useState("now");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("09:00");

  const [checkingRates, setCheckingRates] = useState(false);
  const [rateResults, setRateResults] = useState([]);
  const [courierCompany, setCourierCompany] = useState("");
  const [courierType, setCourierType] = useState("");
  const [selectedRate, setSelectedRate] = useState(null);
  const [codOngkir, setCodOngkir] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Load paid orders
  useEffect(() => {
    setLoadingOrders(true);
    const params = new URLSearchParams({
      status_pembayaran: "2",
      per_page: "50",
    });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    fetch(`/api/sales/order?${params.toString()}`, { headers: authHeaders, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Backend pagination: data nested di d.data.data atau langsung d.data
          const raw = d.data;
          const list = Array.isArray(raw)
            ? raw
            : (Array.isArray(raw?.data) ? raw.data : []);
          setPaidOrders(list);
        } else {
          setPaidOrders([]);
        }
      })
      .catch(() => setPaidOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [debouncedSearch]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    const cust = order?.customer_rel || {};
    setDestContactName(cust?.nama || "");
    setDestContactPhone(cust?.wa || "");
    setItemName(order?.produk_rel?.nama || "");
    // Prefill postal dari alamat
    const m = (order?.alamat || "").match(/(\d{5})/);
    if (m) setDestPostal(m[1]);
    // Reset rate
    setRateResults([]);
    setSelectedRate(null);
    setCourierCompany("");
    setCourierType("");
    setCodOngkir(false);
  };

  const handleSearchDistrict = async (q) => {
    setDistrictSearch(q);
    setSelectedArea(null);
    if (!q || q.length < 3) { setDistrictResults([]); setShowDropdown(false); return; }
    setLoadingDistrict(true);
    try {
      const res = await fetch(`https://app.ternakproperti.com/api/region/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) { setDistrictResults(data.data); setShowDropdown(true); }
    } catch { } finally { setLoadingDistrict(false); }
  };

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    setDistrictSearch(`${area.kecamatan}, ${area.kota}, ${area.provinsi}`);
    setShowDropdown(false);
    if (area.kode_pos) setDestPostal(area.kode_pos);
  };

  const handleCheckRates = async () => {
    if (!districtSearch || districtSearch.length < 3) { alert("Pilih wilayah tujuan terlebih dahulu."); return; }
    setCheckingRates(true); setRateResults([]); setSelectedRate(null); setCodOngkir(false);
    try {
      const res = await fetch("/api/shipping/calculate-domestic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: Number(weightGrams) || 1000,
          courier: "jne,sicepat,jnt,anteraja,pos,tiki",
          destination_search: districtSearch,
          item_value: Number(selectedOrder?.harga) || 100000,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRateResults(data.data);
        if (data.data.length > 0) { 
          setCourierCompany(data.data[0].courier_company); 
          setCourierType(data.data[0].courier_type); 
          setSelectedRate(data.data[0]);
        }
      } else alert(data.message || "Gagal cek ongkir");
    } catch (e) { alert(e.message); } finally { setCheckingRates(false); }
  };

  const handleSubmit = async () => {
    if (!selectedOrder?.id) { alert("Pilih order terlebih dahulu."); return; }
    const postal = Number((destPostal || "").replace(/\D/g, ""));
    if (!postal || String(postal).length < 4) { alert("Kode pos tujuan belum diisi."); return; }
    if (!courierCompany || !courierType) { alert("Pilih kurir terlebih dahulu (cek ongkir dahulu)."); return; }

    setSubmitting(true); setSubmitResult(null);
    try {
      const body = {
        order_id: selectedOrder.id,
        courier_company: courierCompany.toLowerCase(),
        courier_type: courierType.toLowerCase(),
        delivery_type: deliveryType,
        destination_postal_code: postal,
        weight_grams: Number(weightGrams) || 1000,
        destination_address: manualAlamat ? `${manualAlamat}, ${districtSearch}` : undefined,
        ...(destContactName.trim() ? { destination_contact_name: destContactName.trim() } : {}),
        ...(destContactPhone.trim() ? { destination_contact_phone: destContactPhone.trim() } : {}),
        ...(itemName.trim() ? { item_name: itemName.trim() } : {}),
        cod_ongkir: codOngkir,
        ongkir_cost: selectedRate ? selectedRate.cost : 0,
      };
      if (deliveryType === "scheduled") { body.delivery_date = deliveryDate; body.delivery_time = deliveryTime; }

      const res = await fetch("/api/sales/order-resi", { method: "POST", headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      setSubmitResult({ ok: res.ok, data });
      if (res.ok && data?.success) {
        toast.success("Pengiriman berhasil dibuat!");
        onSuccess?.();
        setTimeout(() => onClose(), 1200);
      }
    } catch (e) {
      setSubmitResult({ ok: false, data: { message: e.message } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "93vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 8px" }}>
              <Plus size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Buat Pengiriman Baru</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Pilih order yang sudah Paid</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff", padding: "6px 8px", borderRadius: 8 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {/* Step 1: Pilih order */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
              1. Pilih Order (Paid) <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box", marginBottom: 8 }}
              value={searchOrder}
              onChange={e => setSearchOrder(e.target.value)}
              placeholder="Cari kode order / nama customer / produk…"
            />
            {loadingOrders && <div style={{ fontSize: 12, color: "#94a3b8" }}>Memuat daftar order paid…</div>}
            {!loadingOrders && paidOrders.length === 0 && (
              <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>Tidak ada order paid ditemukan.</div>
            )}
            {!loadingOrders && paidOrders.length > 0 && (
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                {paidOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  const cust = ord.customer_rel || {};
                  const prod = ord.produk_rel || {};
                  return (
                    <div
                      key={ord.id}
                      onClick={() => handleSelectOrder(ord)}
                      style={{
                        padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                        background: isSelected ? "#eff6ff" : "#fff",
                        borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                        transition: "all 0.1s",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b" }}>
                        {ord.kode_order || `#${ord.id}`}
                        {cust.nama && <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 8 }}>— {cust.nama}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {prod.nama || "—"} · {cust.wa || ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedOrder && (
              <div style={{ marginTop: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#15803d" }}>
                ✅ Order dipilih: <b>{selectedOrder.kode_order || `#${selectedOrder.id}`}</b> — {selectedOrder.customer_rel?.nama || ""}
                <br />Alamat: {selectedOrder.alamat || "—"}
              </div>
            )}
          </div>

          {selectedOrder && (
            <>
              {/* Step 2: Info penerima */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>2. Informasi Penerima</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Nama Penerima</label>
                    <input
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }}
                      value={destContactName}
                      onChange={e => setDestContactName(e.target.value)}
                      placeholder="Nama penerima paket"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>No. HP Penerima</label>
                    <input
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }}
                      value={destContactPhone}
                      onChange={e => setDestContactPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Jenis Barang</label>
                  <input
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }}
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    placeholder="Nama / jenis barang yang dikirim"
                  />
                </div>
              </div>

              {/* Step 3: Alamat tujuan */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>3. Alamat Tujuan <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <input
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: selectedArea ? "1.5px solid #22c55e" : "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box", outline: "none" }}
                    value={districtSearch}
                    onChange={e => handleSearchDistrict(e.target.value)}
                    placeholder="Ketik kecamatan / kota / provinsi (min. 3 huruf)…"
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    onFocus={() => districtSearch.length >= 3 && setShowDropdown(true)}
                  />
                  {loadingDistrict && <span style={{ position: "absolute", right: 10, top: 10, fontSize: 11, color: "#94a3b8" }}>Mencari…</span>}
                  {selectedArea && <span style={{ position: "absolute", right: 10, top: 9, fontSize: 14, color: "#22c55e" }}>✓</span>}
                  {showDropdown && districtResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 160, overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                      {districtResults.map((item, idx) => (
                        <div key={idx} onClick={() => handleSelectArea(item)}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                        >
                          <b>{item.kecamatan}</b>, {item.kota}, {item.provinsi}
                          {item.kode_pos && <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>{item.kode_pos}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div style={{ gridColumn: "1 / 3" }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Detail Alamat</label>
                    <input style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }}
                      value={manualAlamat} onChange={e => setManualAlamat(e.target.value)} placeholder="Jl. Contoh No.1, RT/RW..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Kode Pos <span style={{ color: "#ef4444" }}>*</span></label>
                    <input style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }}
                      value={destPostal} onChange={e => setDestPostal(e.target.value)} placeholder="5 digit" />
                  </div>
                </div>
              </div>

              {/* Step 4: Berat & cek ongkir */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>4. Kurir & Ongkir</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Berat (gram)</label>
                    <input type="number" min={100} step={100}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }}
                      value={weightGrams} onChange={e => setWeightGrams(Number(e.target.value))} />
                  </div>
                  <button type="button" onClick={handleCheckRates} disabled={checkingRates || !districtSearch}
                    style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: checkingRates ? "#e2e8f0" : "linear-gradient(135deg, #f59e0b, #d97706)", color: checkingRates ? "#94a3b8" : "#fff", fontWeight: 700, fontSize: 12, cursor: checkingRates ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                    {checkingRates ? "Mengecek…" : "Cek Ongkir"}
                  </button>
                </div>
                {rateResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                    {rateResults.map((r, i) => {
                      const isSelected = courierCompany === r.courier_company && courierType === r.courier_type;
                      return (
                        <div key={i} onClick={() => { setCourierCompany(r.courier_company); setCourierType(r.courier_type); setSelectedRate(r); }}
                          style={{ padding: "10px 12px", borderRadius: 8, border: isSelected ? "2px solid #2563eb" : "1.5px solid #e2e8f0", background: isSelected ? "#eff6ff" : "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#1e293b" }}>{r.courier_company?.toUpperCase()} – {r.service || r.courier_type}</div>
                            {r.duration && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{r.duration}</div>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? "#2563eb" : "#374151" }}>
                            Rp {(r.cost || 0).toLocaleString("id-ID")}
                          </div>
                        </div>
                      );
                    })}

                    {/* Opsi COD Ongkir */}
                    {selectedRate && (
                      <div style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: "#f8fafc",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0"
                      }}>
                        <input
                          type="checkbox"
                          id="cod_ongkir_check_modal"
                          checked={codOngkir}
                          onChange={(e) => setCodOngkir(e.target.checked)}
                          style={{ width: 15, height: 15, cursor: "pointer" }}
                        />
                        <label htmlFor="cod_ongkir_check_modal" style={{ fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", userSelect: "none" }}>
                          COD Ongkir (Ongkir dibayar oleh penerima)
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 5: Waktu kirim */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>5. Waktu Pengiriman</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["now", "scheduled"].map(v => (
                    <button key={v} type="button" onClick={() => setDeliveryType(v)}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: deliveryType === v ? "2px solid #2563eb" : "1.5px solid #e2e8f0", background: deliveryType === v ? "#eff6ff" : "#fff", color: deliveryType === v ? "#2563eb" : "#64748b", cursor: "pointer" }}>
                      {v === "now" ? "Sekarang" : "Terjadwal"}
                    </button>
                  ))}
                </div>
                {deliveryType === "scheduled" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Tanggal</label>
                      <input type="date" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Jam</label>
                      <input type="time" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box" }} value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit result */}
              {submitResult && (
                <div style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 12, background: submitResult.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${submitResult.ok ? "#bbf7d0" : "#fecaca"}`, fontSize: 12, color: submitResult.ok ? "#15803d" : "#dc2626" }}>
                  {submitResult.ok ? submitResult.data?.message || "Pengiriman berhasil dibuat!" : submitResult.data?.message || "Gagal membuat pengiriman."}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, background: "#fff" }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting || !courierCompany || !selectedOrder}
            style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: (submitting || !courierCompany || !selectedOrder) ? "#e2e8f0" : "linear-gradient(135deg, #2563eb, #1d4ed8)", color: (submitting || !courierCompany || !selectedOrder) ? "#94a3b8" : "#fff", fontWeight: 700, fontSize: 13, cursor: (submitting || !courierCompany || !selectedOrder) ? "not-allowed" : "pointer", boxShadow: (submitting || !courierCompany || !selectedOrder) ? "none" : "0 2px 8px rgba(37,99,235,0.3)" }}>
            {submitting ? "Membuat pengiriman…" : "Buat Pesanan Pengiriman"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
/**
 * @param {{ ordersPath: string }} props
 */
export default function PengirimanResiPage({ ordersPath }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [syncingId, setSyncingId] = useState(null);
  const [labelLoadingId, setLabelLoadingId] = useState(null);

  // Modal states
  const [trackingResi, setTrackingResi] = useState(null);
  const [detailResi, setDetailResi] = useState(null);
  const [showBuatPengiriman, setShowBuatPengiriman] = useState(false);

  const authHeaders = useMemo(() => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setRows([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "20");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (statusFilter.trim()) params.set("status", statusFilter.trim());

      const res = await fetch(`/api/sales/order-resi?${params.toString()}`, { headers: authHeaders, cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setRows(Array.isArray(data.data) ? data.data : []);
        const p = data.pagination;
        if (p) setPagination({ current_page: p.current_page ?? 1, last_page: p.last_page ?? 1, per_page: p.per_page ?? 20, total: p.total ?? 0 });
      } else {
        setRows([]); toast.error(data?.message || "Gagal memuat daftar pengiriman");
      }
    } catch (e) {
      setRows([]); toast.error(e?.message || "Gagal memuat");
    } finally { setLoading(false); }
  }, [token, page, debouncedSearch, statusFilter, authHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (id) => {
    if (!token) { toast.error("Login diperlukan"); return; }
    setSyncingId(id);
    try {
      const res = await fetch(`/api/sales/order-resi/${id}/sync`, { method: "POST", headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) { toast.success(data.message || "Status diperbarui"); load(); }
      else toast.error(data?.message || "Refresh gagal");
    } catch (e) { toast.error(e?.message || "Refresh gagal"); }
    finally { setSyncingId(null); }
  };

  const handleCetakResi = async (resi) => {
    if (!token) { toast.error("Login diperlukan"); return; }
    setLabelLoadingId(resi.id);
    try {
      const o = resi.order || {};
      const cust = o.customer_rel || {};
      // Nama penerima: ambil dari destination.contact_name (Biteship response) tanpa menggunakan data customer
      const biteshipDestName =
        resi.meta?.create_response?.destination?.contact_name ||
        resi.meta?.last_order_fetch?.destination?.contact_name ||
        "-";

      // Alamat penerima: ambil dari destination.address (Biteship response), fallback ke alamat order
      const biteshipDestAddress =
        resi.meta?.create_response?.destination?.address ||
        resi.meta?.last_order_fetch?.destination?.address ||
        o.alamat ||
        "-";

      const params = new URLSearchParams({
        resi_id: resi.id,
        waybill_id: resi.waybill_id || resi.tracking_id || "-",
        contact_name: biteshipDestName,
        contact_phone: cust.wa || "-",
        address: biteshipDestAddress,
        routing_code: resi.meta?.create_response?.courier?.routing_code || resi.meta?.last_order_fetch?.courier?.routing_code || "-",
        company: resi.courier_company || "-",
        type: resi.courier_type || "-",
        ongkos_kirim: resi.price || resi.meta?.create_response?.price || resi.meta?.last_order_fetch?.price || o.ongkir || "0",
        reference_number: resi.meta?.create_response?.reference_id || resi.meta?.last_order_fetch?.reference_id || resi.biteship_order_id || o.kode_order || `od-${o.id}`,
        quantity: "1",
        weight: "1",
        sender_name: "Ternak Properti",
        sender_phone: "085773119613",
        sender_address: "Jl. Mission Drive No.35, Klp. Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15810",
        jenis_barang: o.produk_rel?.nama || "Goods",
        catatan: o.catatan || "Tidak Ada",
      });

      const res = await fetch(`/api/sales/order-resi/print-custom-label?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) { toast.error("Gagal mencetak resi"); return; }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resi-${resi.waybill_id || resi.tracking_id || o.kode_order || "custom"}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error(e?.message || "Gagal cetak resi"); }
    finally { setLabelLoadingId(null); }
  };

  return (
    <div className="pengiriman-resi-page">
      <div className="pengiriman-resi-header">
        <div className="pengiriman-resi-title-row">
          <div className="pengiriman-resi-icon-wrap"><Truck size={22} /></div>
          <div>
            <h1 className="pengiriman-resi-title">Pengiriman &amp; Resi</h1>
            <p className="pengiriman-resi-sub">Kelola resi Biteship, lacak status, dan buat pengiriman baru dari order yang sudah Paid.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setShowBuatPengiriman(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <Plus size={15} /> Buat Pengiriman
          </button>
          <Link href={ordersPath} className="pengiriman-resi-link-orders">
            <ExternalLink size={16} /> Ke daftar order
          </Link>
        </div>
      </div>

      <div className="pengiriman-resi-toolbar">
        <div className="pengiriman-resi-search">
          <Search size={18} className="pengiriman-resi-search-icon" />
          <input
            type="search"
            placeholder="Cari kode order, resi, tracking, kurir…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="pengiriman-resi-input"
          />
        </div>
        <div className="pengiriman-resi-filter-status">
          <label htmlFor="status-resi">Status</label>
          <input
            id="status-resi"
            type="text"
            placeholder="contoh: confirmed"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="pengiriman-resi-input pengiriman-resi-input-narrow"
          />
        </div>
        <button type="button" className="pengiriman-resi-btn-secondary" onClick={() => load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Muat ulang
        </button>
      </div>

      <div className="pengiriman-resi-table-wrap">
        <table className="pengiriman-resi-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Produk</th>
              <th>Kurir</th>
              <th>Resi / Tracking</th>
              <th>Jadwal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="pengiriman-resi-empty">Memuat…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="pengiriman-resi-empty">Belum ada data pengiriman atau tidak ada yang cocok dengan filter.</td></tr>
            )}
            {!loading && rows.map((r) => {
              const o = r.order;
              const cust = o?.customer_rel;
              const prod = o?.produk_rel;
              const courier = [r.courier_company, r.courier_type].filter(Boolean).join(" · ");
              const resiLine = r.waybill_id || r.tracking_id || r.biteship_order_id || "—";
              return (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setDetailResi(r)}>
                  <td><span className="pengiriman-resi-mono">{o?.kode_order || `#${r.order_id}`}</span></td>
                  <td>{cust?.nama || "—"}</td>
                  <td className="pengiriman-resi-cell-muted">{prod?.nama || "—"}</td>
                  <td>{courier || "—"}</td>
                  <td><span className="pengiriman-resi-mono pengiriman-resi-resi">{resiLine}</span></td>
                  <td className="pengiriman-resi-cell-muted">
                    {r.delivery_type === "scheduled" ? formatDateId(r.scheduled_at) : "Langsung"}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                      <button type="button" className="pengiriman-resi-btn-sync" disabled={syncingId === r.id} onClick={() => handleSync(r.id)} title="Refresh status">
                        <RefreshCw size={12} className={syncingId === r.id ? "spin" : ""} />
                        {syncingId === r.id ? "..." : "Refresh"}
                      </button>
                      <button type="button" className="pengiriman-resi-btn-track" onClick={() => setTrackingResi(r)} title="Tracking timeline">
                        Tracking
                      </button>
                      {r.biteship_order_id && (
                        <button type="button" className="pengiriman-resi-btn-label" disabled={labelLoadingId === r.id} onClick={() => handleCetakResi(r)} title="Cetak resi PDF">
                          {labelLoadingId === r.id ? "..." : "Cetak"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.last_page > 1 && (
        <div className="pengiriman-resi-pager">
          <span className="pengiriman-resi-pager-info">Halaman {pagination.current_page} / {pagination.last_page} · {pagination.total} data</span>
          <div className="pengiriman-resi-pager-btns">
            <button type="button" className="pengiriman-resi-icon-btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Sebelumnya">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="pengiriman-resi-icon-btn" disabled={page >= pagination.last_page || loading} onClick={() => setPage(p => p + 1)} aria-label="Berikutnya">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Detail Order */}
      {detailResi && (
        <OrderDetailModal
          resi={detailResi}
          authHeaders={authHeaders}
          syncingId={syncingId}
          labelLoadingId={labelLoadingId}
          onClose={() => setDetailResi(null)}
          onSync={handleSync}
          onTracking={(r) => setTrackingResi(r)}
          onCetakResi={handleCetakResi}
          onRefresh={load}
        />
      )}

      {/* Modal Tracking */}
      {trackingResi && (
        <TrackingModal resi={trackingResi} authHeaders={authHeaders} onClose={() => setTrackingResi(null)} />
      )}

      {/* Modal Buat Pengiriman Baru */}
      {showBuatPengiriman && (
        <BuatPengirimanModal
          authHeaders={authHeaders}
          onClose={() => setShowBuatPengiriman(false)}
          onSuccess={() => { load(); setShowBuatPengiriman(false); }}
        />
      )}
    </div>
  );
}
