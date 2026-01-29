import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

/**
 * useProductForm
 * Orchestrator untuk logic form order.
 * UPDATED: Decoupled from PriceState to avoid circular dependency.
 */
export function useProductForm({
    productData,
    // priceState REMOVED from dependency
    shippingState, // We still keep this for ongkir value in payload
    addressState, // Legacy address handling
    sumber,
}) {
    const router = useRouter();

    // Form State
    const [customerForm, setCustomerForm] = useState({
        nama: "",
        wa: "",
        email: "",
        alamat: "",
        custom_value: [],
    });

    const [formWilayah, setFormWilayah] = useState({
        provinsi: "",
        kabupaten: "",
        kecamatan: "",
        kode_pos: "",
    });

    const [paymentMethod, setPaymentMethod] = useState("");
    const [selectedBundling, setSelectedBundling] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [alamatLengkap, setAlamatLengkap] = useState("");

    // Construct Alamat Lengkap
    useEffect(() => {
        const parts = [];
        if (formWilayah.kecamatan) parts.push(`Kec. ${formWilayah.kecamatan}`);
        if (formWilayah.kabupaten) parts.push(`${formWilayah.kabupaten}`);
        if (formWilayah.provinsi) parts.push(`${formWilayah.provinsi}`);
        if (formWilayah.kode_pos) parts.push(`Kode Pos ${formWilayah.kode_pos}`);
        setAlamatLengkap(parts.join(", "));
    }, [formWilayah]);

    // -- INTERNAL BUNDLING DATA --
    const getBundlingList = () => {
        if (!productData) return [];
        // Prioritas data bundling_rel sesuai struktur backend
        if (Array.isArray(productData.bundling_rel)) return productData.bundling_rel;

        // Fallback ke field bundling (bisa JSON string atau Array)
        if (productData.bundling) {
            if (typeof productData.bundling === 'string') {
                try { return JSON.parse(productData.bundling); } catch (e) { return []; }
            }
            if (Array.isArray(productData.bundling)) return productData.bundling;
        }
        return [];
    };

    const bundlingList = getBundlingList();
    const hasBundling = bundlingList.length > 0;

    // Validation Logic
    const isFormValid = (isFisik) => {
        // Jika produk memiliki paket, user WAJIB memilih salah satu
        if (hasBundling && (selectedBundling === null || !bundlingList[selectedBundling])) {
            return "Silakan pilih paket produk terlebih dahulu";
        }

        if (!customerForm.nama || customerForm.nama.trim().length < 3) return "Nama harus diisi (minimal 3 karakter)";

        if (!customerForm.wa || customerForm.wa.replace(/\D/g, '').length < 12) {
            return "Nomor WhatsApp tidak valid (minimal 10 digit)";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!customerForm.email || !emailRegex.test(customerForm.email)) {
            return "Email tidak valid (harus berisi @ dan domain yang benar)";
        }

        if (!paymentMethod) return "Pilih metode pembayaran";

        if (isFisik) {
            if (!formWilayah.provinsi || !formWilayah.kabupaten || !formWilayah.kecamatan || !formWilayah.kode_pos) {
                return "Silakan lengkapi alamat pengiriman (Provinsi, Kota, Kecamatan, Kode Pos)";
            }
        } else {
            if (!formWilayah.provinsi || !formWilayah.kabupaten || !formWilayah.kecamatan) {
                return "Silakan lengkapi alamat (minimal Provinsi, Kota, dan Kecamatan)";
            }
        }
        return null; // Valid
    };

    // Submit Logic
    const handleSubmit = async (calculatedPriceValues) => {
        const { totalHarga, hargaProduk, isKategoriBuku } = calculatedPriceValues;

        if (submitting) return;

        // Gunakan fungsi isFormValid yang sudah diperbarui
        const validationError = isFormValid(isKategoriBuku);
        if (validationError) {
            return toast.error(validationError);
        }

        setSubmitting(true);

        try {
            if (!productData) throw new Error("Data produk tidak available");

            // Ambil ID asli dari objek dalam list bundling
            const selectedBundlingItem = bundlingList[selectedBundling];
            const bundlingId = selectedBundlingItem ? selectedBundlingItem.id : "";

            const payload = {
                nama: customerForm.nama,
                wa: customerForm.wa,
                email: customerForm.email,
                alamat: alamatLengkap || null,
                provinsi: formWilayah.provinsi || null,
                kabupaten: formWilayah.kabupaten || null,
                kecamatan: formWilayah.kecamatan || null,
                kode_pos: formWilayah.kode_pos || null,
                produk: parseInt(productData.id, 10),
                harga: String(hargaProduk),
                ongkir: String(shippingState.ongkir || 0),
                total_harga: String(totalHarga),
                metode_bayar: paymentMethod,
                sumber: sumber || 'website',
                custom_value: Array.isArray(customerForm.custom_value) ? customerForm.custom_value : [],
                bundling: String(bundlingId),
            };

            const response = await fetch("/api/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const order = await response.json();

            if (!response.ok || !order?.success) {
                throw new Error(order?.message || order?.error || "Gagal membuat order");
            }

            // Handle Success
            const orderResponseData = order?.data?.order || order?.data || {};
            const orderId = orderResponseData?.id;

            let customerId = null;
            const rawCustomer = orderResponseData?.customer || orderResponseData?.customer_id;
            if (rawCustomer && typeof rawCustomer === 'object') customerId = rawCustomer.id;
            else if (rawCustomer) customerId = rawCustomer;

            const pendingOrder = {
                orderId,
                customerId,
                nama: customerForm.nama,
                wa: customerForm.wa,
                email: customerForm.email,
                productName: productData.nama || "Produk",
                totalHarga: String(totalHarga),
                paymentMethod,
                landingUrl: window.location.pathname,
            };

            localStorage.setItem("pending_order", JSON.stringify(pendingOrder));

            if (customerId) toast.success("Kode OTP telah dikirim ke WhatsApp Anda!");
            else toast.success("Order berhasil! Lanjut ke pembayaran...");

            router.push("/verify-order");

        } catch (err) {
            console.error("[SUBMIT ERROR]", err);
            toast.error(err.message || "Terjadi kesalahan");
            setSubmitting(false);
        }
    };

    const handleSaveDraft = useCallback(() => {
        try {
            const draftData = {
                customerForm,
                formWilayah,
                selectedWilayahIds: addressState.selectedWilayahIds,
                paymentMethod,
                selectedBundling,
                ongkir: shippingState.ongkir,
                ongkirInfo: shippingState.ongkirInfo,
                timestamp: Date.now(),
            };
            localStorage.setItem("order_draft", JSON.stringify(draftData));
            toast.success("Draft berhasil disimpan");
        } catch (e) {
            console.error("Save draft error", e);
            toast.error("Gagal simpan draft");
        }
    }, [customerForm, formWilayah, addressState.selectedWilayahIds, paymentMethod, selectedBundling, shippingState.ongkir, shippingState.ongkirInfo]);

    useEffect(() => {
        if (typeof window !== 'undefined') window.handleSaveDraft = handleSaveDraft;
        return () => { if (typeof window !== 'undefined') delete window.handleSaveDraft; };
    }, [handleSaveDraft]);

    return {
        customerForm,
        setCustomerForm,
        formWilayah,
        setFormWilayah,
        paymentMethod,
        setPaymentMethod,
        selectedBundling,
        setSelectedBundling,
        submitting,
        alamatLengkap,
        handleSubmit,
        handleSaveDraft,
        isFormValid
    };
}
