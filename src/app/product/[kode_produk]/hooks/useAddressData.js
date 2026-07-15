import { useState, useCallback, useEffect, useRef } from "react";
import { getProvinces, getCities, getDistricts } from "@/utils/shippingService";

/** Pencarian kecamatan: hit ke app.ternakproperti.com (CORS enabled di API route) */
function regionSearchUrl(q) {
    const query = `?q=${encodeURIComponent(q)}`;
    return `https://app.ternakproperti.com/api/region/search${query}`;
}

/**
 * useAddressData
 * Mengelola data wilayah (Provinsi, Kota, Kecamatan) dan fitur pencarian wilayah.
 * Menggantikan logic filter client-side dengan server-side search API.
 */
export function useAddressData() {
    // Cascading Dropdown State (Produk Fisik)
    const [wilayahData, setWilayahData] = useState({
        provinces: [],
        cities: [],
        districts: []
    });

    const [selectedWilayahIds, setSelectedWilayahIds] = useState({
        provinceId: "",
        cityId: "",
        districtId: ""
    });

    const [loadingWilayah, setLoadingWilayah] = useState({
        provinces: false,
        cities: false,
        districts: false
    });

    // Search State (Produk Digital/Non-Fisik)
    const [districtSearchTerm, setDistrictSearchTerm] = useState("");
    const [districtSearchResults, setDistrictSearchResults] = useState([]);
    const [loadingDistrictSearch, setLoadingDistrictSearch] = useState(false);
    const [showDistrictResults, setShowDistrictResults] = useState(false); // UI State

    // Load Provinces on Mount
    useEffect(() => {
        let isMounted = true;

        async function fetchProvinces() {
            setLoadingWilayah(prev => ({ ...prev, provinces: true }));
            try {
                const data = await getProvinces();
                if (isMounted && data && Array.isArray(data)) {
                    setWilayahData(prev => ({ ...prev, provinces: data }));
                }
            } catch (err) {
                console.error("Error fetching provinces:", err);
            } finally {
                if (isMounted) setLoadingWilayah(prev => ({ ...prev, provinces: false }));
            }
        }

        fetchProvinces();

        return () => { isMounted = false; };
    }, []);

    // Load Cities when Province changes
    useEffect(() => {
        if (!selectedWilayahIds.provinceId) {
            setWilayahData(prev => ({ ...prev, cities: [], districts: [] }));
            return;
        }

        let isMounted = true;
        async function fetchCities() {
            setLoadingWilayah(prev => ({ ...prev, cities: true }));
            try {
                const data = await getCities(selectedWilayahIds.provinceId);
                if (isMounted && data && Array.isArray(data)) {
                    setWilayahData(prev => ({ ...prev, cities: data, districts: [] }));
                }
            } catch (err) {
                console.error("Error fetching cities:", err);
            } finally {
                if (isMounted) setLoadingWilayah(prev => ({ ...prev, cities: false }));
            }
        }

        fetchCities();
        return () => { isMounted = false; };
    }, [selectedWilayahIds.provinceId]);

    // Load Districts when City changes
    useEffect(() => {
        if (!selectedWilayahIds.cityId) {
            setWilayahData(prev => ({ ...prev, districts: [] }));
            return;
        }

        let isMounted = true;
        async function fetchDistricts() {
            setLoadingWilayah(prev => ({ ...prev, districts: true }));
            try {
                const data = await getDistricts(selectedWilayahIds.cityId);
                if (isMounted && data && Array.isArray(data)) {
                    setWilayahData(prev => ({ ...prev, districts: data }));
                }
            } catch (err) {
                console.error("Error fetching districts:", err);
            } finally {
                if (isMounted) setLoadingWilayah(prev => ({ ...prev, districts: false }));
            }
        }

        fetchDistricts();
        return () => { isMounted = false; };
    }, [selectedWilayahIds.cityId]);

    const searchTimeout = useRef(null);

    // Search Logic with Debounce (Manual Handler)
    const handleDistrictSearch = (term) => {
        setDistrictSearchTerm(term);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!term || term.length < 3) {
            setDistrictSearchResults([]);
            setShowDistrictResults(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setLoadingDistrictSearch(true);
            try {
                const res = await fetch(regionSearchUrl(term));
                const data = await res.json();

                if (data.success && Array.isArray(data.data)) {
                    setDistrictSearchResults(data.data);
                    setShowDistrictResults(true);
                } else {
                    setDistrictSearchResults([]);
                }
            } catch (err) {
                console.error("Error searching districts:", err);
                setDistrictSearchResults([]);
            } finally {
                setLoadingDistrictSearch(false);
            }
        }, 500);
    };

    return {
        // Cascading Data
        wilayahData,
        selectedWilayahIds,
        setSelectedWilayahIds,
        loadingWilayah,

        // Search Data
        districtSearchTerm,
        setDistrictSearchTerm,
        handleDistrictSearch,
        districtSearchResults,
        setDistrictSearchResults, // Exposed in case we need to manual clear
        loadingDistrictSearch,
        showDistrictResults,
        setShowDistrictResults
    };
}
