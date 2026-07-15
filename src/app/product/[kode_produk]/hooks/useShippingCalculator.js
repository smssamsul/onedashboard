import { useState, useCallback } from "react";
import { calculateDomesticCost } from "@/utils/shippingService";
import { toast } from "react-hot-toast";

/**
 * useShippingCalculator
 * Perhitungan ongkir via Biteship (proxy /api/shipping/calculate-domestic).
 * Hanya menggunakan JNE REG sebagai kurir default.
 */
export function useShippingCalculator() {
    const [ongkir, setOngkir] = useState(0);
    const [ongkirInfo, setOngkirInfo] = useState({ courier: '', service: '' });
    const [costResults, setCostResults] = useState([]);
    const [loadingCost, setLoadingCost] = useState(false);
    const [selectedCourier, setSelectedCourier] = useState("jne");

    const DEFAULT_WEIGHT = 1000; // 1kg

    const handleCalculateOngkir = useCallback(async (
        _destinationDistrictId,
        _courier = "jne", // Hanya JNE
        _provinceId = null,
        options = {}
    ) => {
        const {
            destination_search,
            destination_postal_code,
            destination_area_id,
            item_value,
        } = options || {};

        if (!destination_search && destination_postal_code == null && !destination_area_id) {
            return;
        }

        setLoadingCost(true);
        setOngkir(0);

        try {
            // Selalu hanya query JNE
            const results = await calculateDomesticCost({
                origin: null,
                destination: null,
                weight: DEFAULT_WEIGHT,
                courier: "jne",
                province_id: null,
                destination_search,
                destination_postal_code,
                destination_area_id,
                item_value,
            });

            // Filter hanya layanan REG dari JNE
            const jneRegResults = (results || []).filter(r =>
                (r.courier_company || r.courier || '').toLowerCase() === 'jne' &&
                (r.courier_type || '').toLowerCase() === 'reg'
            );

            // Jika ada REG, gunakan itu; jika tidak ada, gunakan hasil JNE pertama
            const filteredResults = jneRegResults.length > 0 ? jneRegResults : (results || []).filter(r =>
                (r.courier_company || r.courier || '').toLowerCase() === 'jne'
            );

            setCostResults(filteredResults);

            if (filteredResults.length > 0) {
                const selected = filteredResults[0];
                setOngkir(selected.cost || 0);
                setOngkirInfo({
                    courier: selected.courier || 'jne',
                    service: selected.service || 'REG',
                    courier_company: selected.courier_company || 'jne',
                    courier_type: selected.courier_type || 'reg',
                });
            } else {
                setOngkirInfo({ courier: '', service: '' });
            }
        } catch (err) {
            console.error("[SHIPPING] Calculate error:", err);
            toast.error("Gagal menghitung ongkos kirim");
        } finally {
            setLoadingCost(false);
        }
    }, [selectedCourier]);

    const selectShippingService = useCallback((cost, serviceName, courierCode, extra = {}) => {
        setOngkir(cost);
        setOngkirInfo({
            courier: courierCode,
            service: serviceName,
            courier_company: extra.courier_company || courierCode,
            courier_type: extra.courier_type || '',
        });
    }, []);

    return {
        ongkir,
        setOngkir,
        ongkirInfo,
        setOngkirInfo,
        costResults,
        setCostResults,
        loadingCost,
        selectedCourier,
        setSelectedCourier,
        handleCalculateOngkir,
        selectShippingService
    };
}
