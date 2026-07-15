import { useState, useEffect, useCallback } from "react";
import {
  getOrders,
  getOrderById,
  createOrderAdmin,
  createOrderCustomer,
  updateOrderAdmin,
  confirmOrderPayment,
} from "@/lib/sales/orders";

export default function useOrders({ mode = "admin" } = {}) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ======================
      🔄 Fetch Orders (Admin)
  ====================== */
  const fetchOrders = useCallback(async () => {
    if (mode !== "admin") return;
    setLoading(true);
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Error fetch orders:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  /* ======================
      Get Order Detail
  ====================== */
  const fetchOrderById = useCallback(async (id) => {
    setLoading(true);
    try {
      const data = await getOrderById(id);
      setSelectedOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ======================
      Create Order
  ====================== */
  const createOrder = useCallback(
    async (formData) => {
      setLoading(true);
      try {
        let res;
        if (mode === "admin") {
          // Build payload berdasarkan apakah customer existing atau baru
          const hasExistingCustomer = formData.customer && Number(formData.customer) > 0;
          
          const payload = {
            // Jika customer existing: kirim customer ID
            // Jika customer baru: kirim nama, wa, email
            ...(hasExistingCustomer 
              ? { 
                  customer: Number(formData.customer)
                }
              : {
                  nama: formData.nama || "",
                  wa: formData.wa || "",
                  email: formData.email || "",
                }
            ),
            // Alamat selalu dikirim (required untuk order)
            alamat: formData.alamat || "",
            produk: Number(formData.produk),
            harga: String(formData.harga || "0"),
            ongkir: String(formData.ongkir || "0"),
            total_harga: String(formData.total_harga || "0"),
            sumber: formData.sumber || "",
            notif: formData.notif ? 1 : 0,
            // UTM fields
            utm_source: formData.utm_source || "",
            utm_medium: formData.utm_medium || "",
            utm_campaign: formData.utm_campaign || "",
            utm_term: formData.utm_term || "",
            utm_content: formData.utm_content || "",
          };
          
          console.log("[CREATE ORDER] Has existing customer:", hasExistingCustomer);
          console.log("[CREATE ORDER] Payload:", JSON.stringify(payload, null, 2));
          
          res = await createOrderAdmin(payload);
        } else {
          res = await createOrderCustomer({
            nama: formData.nama,
            wa: formData.wa,
            email: formData.email,
            alamat: formData.alamat,
            produk: Number(formData.produk),
            harga: Number(formData.harga),
            ongkir: Number(formData.ongkir),
            total_harga: Number(formData.total_harga),
            metode_bayar: formData.metode_bayar,
            sumber: formData.sumber,
            custom_value: formData.custom_value || [],
          });
        }

        if (res.success && mode === "admin") await fetchOrders();
        return res;
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [mode, fetchOrders]
  );

  /* ======================
      Update Order (Admin)
  ====================== */
  const updateOrder = useCallback(async (id, data) => {
    if (mode !== "admin") return;
    setLoading(true);
    try {
      const res = await updateOrderAdmin(id, data);
      if (res.success) await fetchOrders();
      return res;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, fetchOrders]);

  /* ======================
      💳 Konfirmasi Pembayaran
  ====================== */
  const confirmPayment = useCallback(async (id, data) => {
    if (mode !== "admin") return;
    setLoading(true);
    try {
      const res = await confirmOrderPayment(id, data);
      if (res.success) await fetchOrders();
      return res;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, fetchOrders]);

  /* ======================
      Auto Fetch (Admin Only)
  ====================== */
  useEffect(() => {
    if (mode === "admin") fetchOrders();
  }, [fetchOrders, mode]);

  return {
    orders,
    selectedOrder,
    loading,
    error,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    confirmPayment,
  };
}
