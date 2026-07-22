import { api } from "../api";

/* ======================
   🎟️ INVITATION MODULE
====================== */

/** GET daftar invitation (admin) */
export async function getInvitations(page = 1, per_page = 15, filters = {}) {
  try {
    const queryParams = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
      ...filters,
    });

    const res = await api(`/sales/invitation?${queryParams.toString()}`, {
      method: "GET",
      disableToast: true,
    });

    if (res.success === true) {
      return {
        data: Array.isArray(res.data) ? res.data : [],
        meta: res.meta || null,
      };
    }
    return { data: [], meta: null };
  } catch (error) {
    console.error("❌ getInvitations() - Error:", error);
    return { data: [], meta: null };
  }
}

/** POST tambah invitation manual (admin) */
export async function createInvitation(payload) {
  try {
    const res = await api("/sales/invitation-admin", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.success ? res.data : null;
  } catch (error) {
    console.error("❌ createInvitation() - Error:", error);
    throw error;
  }
}

/** PUT update invitation (admin) */
export async function updateInvitation(id, payload) {
  try {
    const res = await api(`/sales/invitation/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res.success ? res.data : null;
  } catch (error) {
    console.error("❌ updateInvitation() - Error:", error);
    throw error;
  }
}

/** DELETE (soft) invitation (admin) */
export async function deleteInvitation(id) {
  try {
    const res = await api(`/sales/invitation/${id}`, { method: "DELETE" });
    return res.success === true;
  } catch (error) {
    console.error("❌ deleteInvitation() - Error:", error);
    throw error;
  }
}
