"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

const STATUS_RESI_BADGE = {
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

function ResiStatusBadge({ status }) {
  const s = status?.toLowerCase?.() || "";
  const cfg = STATUS_RESI_BADGE[s] || { label: status || "-", bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color,
      letterSpacing: 0.3,
    }}>
      {cfg.label}
    </span>
  );
}

/**
 * Panel pengiriman Biteship — hanya muncul jika status_pembayaran === 2 (Paid).
 */
export default function BiteshipOrderTrackingPanel({ order }) {
  // Hanya tampil jika sudah PAID (status_pembayaran == 2)
  const isPaid = String(order?.status_pembayaran) === "2";

  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [districtSearch, setDistrictSearch] = useState("");
  const [districtResults, setDistrictResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  const [manualAlamat, setManualAlamat] = useState("");
  const [destPostal, setDestPostal] = useState("");
  const [weightGrams, setWeightGrams] = useState(1000);

  const [checkingRates, setCheckingRates] = useState(false);
  const [rateResults, setRateResults] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [courierCompany, setCourierCompany] = useState("");
  const [courierType, setCourierType] = useState("");
  const [codOngkir, setCodOngkir] = useState(false);

  const [deliveryType, setDeliveryType] = useState("now");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("09:00");

  // Field custom penerima & barang
  const [destContactName, setDestContactName] = useState("");
  const [destContactPhone, setDestContactPhone] = useState("");
  const [itemName, setItemName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const defaultPostal = useMemo(() => {
    const m = (order?.alamat || "").match(/(\d{5})/);
    return m ? m[1] : "";
  }, [order?.alamat]);

  const authHeaders = useCallback(() => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const loadList = useCallback(async () => {
    if (!order?.id || !token) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/sales/order-resi/order/${order.id}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setRows(data.data);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [order?.id, token, authHeaders]);

  useEffect(() => {
    if (isPaid) loadList();
  }, [isPaid, loadList]);

  // Search wilayah
  const handleSearchDistrict = async (q) => {
    setDistrictSearch(q);
    setSelectedArea(null);
    setDestPostal("");
    if (!q || q.length < 3) {
      setDistrictResults([]);
      setShowDropdown(false);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(`https://app.ternakproperti.com/api/region/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDistrictResults(data.data);
        setShowDropdown(true);
      }
    } catch {/* ignore */ } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    setDistrictSearch(`${area.kecamatan}, ${area.kota}, ${area.provinsi}`);
    setShowDropdown(false);
    if (area.kode_pos) setDestPostal(area.kode_pos);
  };

  // Cek ongkir
  const handleCheckRates = async () => {
    if (!districtSearch || districtSearch.length < 3) {
      alert("Pilih wilayah tujuan terlebih dahulu.");
      return;
    }
    setCheckingRates(true);
    setRateResults([]);
    setSelectedRate(null);
    setCodOngkir(false);
    try {
      const res = await fetch("/api/shipping/calculate-domestic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: Number(weightGrams) || 1000,
          courier: "jne,sicepat,jnt,anteraja,pos,tiki",
          destination_search: districtSearch,
          item_value: Number(order?.harga) || 100000,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRateResults(data.data);
        if (data.data.length > 0) {
          setSelectedRate(data.data[0]);
          setCourierCompany(data.data[0].courier_company);
          setCourierType(data.data[0].courier_type);
        }
      } else {
        alert(data.message || "Gagal cek ongkir");
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setCheckingRates(false);
    }
  };

  // Buat pengiriman
  const handleCreateShipping = async () => {
    if (!order?.id) return;
    const postal = Number((destPostal || defaultPostal || "").replace(/\D/g, ""));
    if (!postal || String(postal).length < 4) {
      alert("Kode pos tujuan belum diisi.");
      return;
    }
    if (!courierCompany || !courierType) {
      alert("Pilih kurir terlebih dahulu (cek ongkir dahulu).");
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const body = {
        order_id: order.id,
        courier_company: courierCompany.toLowerCase(),
        courier_type: courierType.toLowerCase(),
        delivery_type: deliveryType,
        destination_postal_code: postal,
        weight_grams: Number(weightGrams) || 1000,
        destination_address: manualAlamat
          ? `${manualAlamat}, ${districtSearch}`
          : undefined,
        // Field custom penerima & barang
        ...(destContactName.trim() ? { destination_contact_name: destContactName.trim() } : {}),
        ...(destContactPhone.trim() ? { destination_contact_phone: destContactPhone.trim() } : {}),
        ...(itemName.trim() ? { item_name: itemName.trim() } : {}),
        cod_ongkir: codOngkir,
        ongkir_cost: selectedRate ? selectedRate.cost : 0,
      };
      if (deliveryType === "scheduled") {
        body.delivery_date = deliveryDate;
        body.delivery_time = deliveryTime;
      }

      const res = await fetch("/api/sales/order-resi", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitResult({ ok: res.ok, data });
      if (res.ok && data?.success) {
        await loadList();
        setShowForm(false);
      }
    } catch (e) {
      setSubmitResult({ ok: false, data: { message: e.message } });
    } finally {
      setSubmitting(false);
    }
  };

  // Sync status resi
  const handleSync = async (resiId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/sales/order-resi/${resiId}/sync`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.message || "Sync gagal"); return; }
      await loadList();
    } catch (e) {
      alert(e.message);
    }
  };

  // ─── Tidak tampil jika belum paid ───────────────────────────────────────────
  if (!isPaid) {
    return (
      <div style={{
        background: "#f8fafc",
        border: "1px dashed #cbd5e1",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#475569" }}>Pengiriman belum tersedia</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Buat pesanan pengiriman setelah pembayaran dikonfirmasi (status: <b>Paid</b>).
          </div>
        </div>
      </div>
    );
  }

  // ─── Tampil jika PAID ────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 4 }}>

      {/* ── Header + tombol buat pengiriman ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h4 className="detail-section-title" style={{ margin: 0 }}>Pengiriman</h4>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              // Prefill dari data customer & produk saat form dibuka
              setDestContactName(order?.customer_rel?.nama || order?.nama_customer || "");
              setDestContactPhone(order?.customer_rel?.wa || order?.wa_customer || "");
              setItemName(order?.produk_rel?.nama || "");
              setShowForm(true);
              setSubmitResult(null);
              setCodOngkir(false);
              setSelectedRate(null);
              setRateResults([]);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(37,99,235,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            Buat Pengiriman
          </button>
        )}
      </div>

      {/* ── Riwayat resi ── */}
      {loadingList ? (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "8px 0" }}>Memuat riwayat resi…</p>
      ) : rows.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          {rows.map((r) => (
            <div key={r.id} style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#1e293b" }}>
                    {r.courier_company} – {r.courier_type}
                  </span>
                  <ResiStatusBadge status={r.status} />
                </div>
                {(r.waybill_id || r.tracking_id) && (
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    No. Resi: <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                      {r.waybill_id || r.tracking_id}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {r.delivery_type === "scheduled" && r.scheduled_at
                    ? `Jadwal: ${new Date(r.scheduled_at).toLocaleString("id-ID")}`
                    : "Kirim sekarang (now)"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSync(r.id)}
                title="Sync status dari Biteship"
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  fontSize: 11,
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Refresh
              </button>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div style={{
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: 10,
            padding: "14px 16px",
            textAlign: "center",
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>Belum ada pengiriman dibuat untuk pesanan ini.</div>
          </div>
        )
      )}

      {/* ── Form buat pengiriman ── */}
      {showForm && (
        <div style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "18px 16px",
          marginTop: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
              Form Buat Pengiriman
            </h5>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}
            >×</button>
          </div>

          {/* Alamat dari order */}
          <div style={{ background: "#f0f9ff", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#0369a1" }}>
            <b>Alamat order:</b> {order?.alamat || "-"}
          </div>

          {/* Field custom: Nama penerima, No HP, Jenis Barang */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Nama Penerima
              </label>
              <input
                style={{
                  width: "100%", padding: "9px 10px", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box",
                }}
                value={destContactName}
                onChange={(e) => setDestContactName(e.target.value)}
                placeholder="Nama penerima paket"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                No. HP Penerima
              </label>
              <input
                style={{
                  width: "100%", padding: "9px 10px", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box",
                }}
                value={destContactPhone}
                onChange={(e) => setDestContactPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Jenis Barang
            </label>
            <input
              style={{
                width: "100%", padding: "9px 10px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box",
              }}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Nama / jenis barang yang dikirim"
            />
          </div>

          {/* Step 1: Cari wilayah */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Wilayah Tujuan <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: selectedArea ? "1.5px solid #22c55e" : "1.5px solid #e2e8f0",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={districtSearch}
                onChange={(e) => handleSearchDistrict(e.target.value)}
                placeholder="Ketik kecamatan / kota / provinsi (min. 3 huruf)…"
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onFocus={() => districtSearch.length >= 3 && setShowDropdown(true)}
              />
              {loadingSearch && (
                <span style={{ position: "absolute", right: 10, top: 10, fontSize: 11, color: "#94a3b8" }}>Mencari…</span>
              )}
              {selectedArea && (
                <span style={{ position: "absolute", right: 10, top: 9, fontSize: 14, color: "#22c55e" }}>✓</span>
              )}
              {showDropdown && districtResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
                  maxHeight: 180, overflowY: "auto",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                }}>
                  {districtResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectArea(item)}
                      style={{
                        padding: "9px 12px", cursor: "pointer", fontSize: 13,
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.1s",
                      }}
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
          </div>

          {/* Alamat detail + kode pos + berat */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Detail Alamat
              </label>
              <textarea
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", fontSize: 12, resize: "vertical",
                  minHeight: 60, boxSizing: "border-box",
                }}
                value={manualAlamat}
                onChange={(e) => setManualAlamat(e.target.value)}
                placeholder="Jl. Contoh No.1, RT/RW..."
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Kode Pos <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={{
                  width: "100%", padding: "9px 10px", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", fontSize: 13, marginBottom: 8, boxSizing: "border-box",
                }}
                value={destPostal}
                onChange={(e) => setDestPostal(e.target.value)}
                placeholder={defaultPostal || "Kode pos 5 digit"}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Berat Paket (gram)
              </label>
              <input
                type="number"
                min={100}
                step={100}
                style={{
                  width: "100%", padding: "9px 10px", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box",
                }}
                value={weightGrams}
                onChange={(e) => setWeightGrams(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Cek Ongkir */}
          <button
            type="button"
            onClick={handleCheckRates}
            disabled={checkingRates || !districtSearch}
            style={{
              width: "100%", padding: "10px", borderRadius: 8,
              border: "none",
              background: checkingRates ? "#e2e8f0" : "linear-gradient(135deg, #f59e0b, #d97706)",
              color: checkingRates ? "#94a3b8" : "#fff",
              fontWeight: 700, fontSize: 13, cursor: checkingRates ? "not-allowed" : "pointer",
              marginBottom: 12, transition: "all 0.2s",
            }}
          >
            {checkingRates ? "Mengecek ongkir…" : "Cek Ongkir & Pilih Kurir"}
          </button>

          {/* Hasil rate */}
          {rateResults.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Pilih Layanan Pengiriman <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                {rateResults.map((r, i) => {
                  const isSelected = courierCompany === r.courier_company && courierType === r.courier_type;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedRate(r);
                        setCourierCompany(r.courier_company);
                        setCourierType(r.courier_type);
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: isSelected ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                        background: isSelected ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#1e293b" }}>
                          {r.courier_company.toUpperCase()} – {r.service || r.courier_type}
                        </div>
                        {r.duration && (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{r.duration}</div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? "#2563eb" : "#374151" }}>
                        Rp {(r.cost || 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedRate && (
                <div style={{
                  marginTop: 10,
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
                    id="cod_ongkir_check"
                    checked={codOngkir}
                    onChange={(e) => setCodOngkir(e.target.checked)}
                    style={{ width: 15, height: 15, cursor: "pointer" }}
                  />
                  <label htmlFor="cod_ongkir_check" style={{ fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", userSelect: "none" }}>
                    COD Ongkir (Ongkir dibayar oleh penerima)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Waktu kirim */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Waktu Pengiriman
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["now", "scheduled"].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDeliveryType(v)}
                  style={{
                    flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: deliveryType === v ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                    background: deliveryType === v ? "#eff6ff" : "#fff",
                    color: deliveryType === v ? "#2563eb" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  {v === "now" ? "Sekarang" : "Terjadwal"}
                </button>
              ))}
            </div>
          </div>

          {deliveryType === "scheduled" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Tanggal</label>
                <input
                  type="date"
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Jam</label>
                <input
                  type="time"
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Submit result */}
          {submitResult && (
            <div style={{
              padding: "10px 12px", borderRadius: 8, marginBottom: 12,
              background: submitResult.ok ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${submitResult.ok ? "#bbf7d0" : "#fecaca"}`,
              fontSize: 12,
              color: submitResult.ok ? "#15803d" : "#dc2626",
            }}>
              {submitResult.ok
                ? submitResult.data?.message || "Pengiriman berhasil dibuat!"
                : submitResult.data?.message || "Gagal membuat pengiriman."}
            </div>
          )}

          {/* Tombol submit */}
          <button
            type="button"
            onClick={handleCreateShipping}
            disabled={submitting || !courierCompany}
            style={{
              width: "100%", padding: "11px", borderRadius: 8,
              border: "none",
              background: (submitting || !courierCompany)
                ? "#e2e8f0"
                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: (submitting || !courierCompany) ? "#94a3b8" : "#fff",
              fontWeight: 700, fontSize: 13,
              cursor: (submitting || !courierCompany) ? "not-allowed" : "pointer",
              boxShadow: (submitting || !courierCompany) ? "none" : "0 2px 8px rgba(37,99,235,0.3)",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Membuat pengiriman…" : "Buat Pesanan Pengiriman"}
          </button>
        </div>
      )}
    </div>
  );
}
