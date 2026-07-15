// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

export async function getCustomers(page = 1, per_page = 15, filters = {}) {
    try {
        const token = localStorage.getItem("token");
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Build query parameters
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("per_page", per_page);

        // Add filter parameters - hanya kirim jika bukan "all"
        if (filters.verifikasi && filters.verifikasi !== "all") {
            // Backend mungkin menerima "1" untuk verified, "0" untuk unverified
            const verifikasiValue = filters.verifikasi === "verified" ? "1" : "0";
            params.append("verifikasi", verifikasiValue);
        }
        if (filters.status && filters.status !== "all") {
            // Backend mungkin menerima "1" untuk active, "0" untuk inactive
            const statusValue = filters.status === "active" ? "1" : "0";
            params.append("status", statusValue);
        }
        if (filters.jenis_kelamin && filters.jenis_kelamin !== "all") {
            params.append("jenis_kelamin", filters.jenis_kelamin);
        }
        if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange.length === 2 && filters.dateRange[0] && filters.dateRange[1]) {
            const startDate = new Date(filters.dateRange[0]);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.dateRange[1]);
            endDate.setHours(23, 59, 59, 999);
            params.append("date_from", startDate.toISOString().split('T')[0]);
            params.append("date_to", endDate.toISOString().split('T')[0]);
        }
        // Add search parameter if provided
        if (filters.search && filters.search.trim()) {
            params.append("search", filters.search.trim());
        }

        if (filters.sales_id && filters.sales_id !== "all") {
            params.append("sales_id", filters.sales_id);
        }
        
        if (filters.all !== undefined) {
            params.append("all", filters.all);
        }

        const res = await fetch(`${BASE_URL}/sales/customer?${params.toString()}`, { headers });
        if (!res.ok) throw new Error("Gagal mengambil data customer");

        const result = await res.json();
        return {
            data: Array.isArray(result.data) ? result.data : [],
            pagination: result.pagination || null,
            success: result.success !== false,
        };
    } catch (err) {
        return {
            data: [],
            pagination: null,
            success: false,
        };
    }
}

export async function deleteCustomer(id) {
    try {
        const token = localStorage.getItem("token");
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(`${BASE_URL}/sales/customer/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (!res.ok) throw new Error("Gagal menghapus customer");

        return true;
    } catch (err) {
        return false;
    }
}
