// src/lib/sales/knowledge.js
import { api } from "../api";

export async function getKnowledgeSources(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.product_id) queryParams.append('product_id', params.product_id);
    if (params.search) queryParams.append('search', params.search);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.page) queryParams.append('page', params.page);

    const url = `/sales/knowledge-source${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const res = await api(url, { method: "GET" });

    if (res && res.success === false) {
      throw new Error(res.message || "Gagal mengambil data knowledge source");
    }

    return res?.data || [];
  } catch (err) {
    console.error("❌ Error getKnowledgeSources:", err);
    throw err;
  }
}

export async function getKnowledgeSourceById(id) {
  try {
    const res = await api(`/sales/knowledge-source/${id}`, { method: "GET" });

    if (res && res.success === false) {
      throw new Error(res.message || "Gagal mengambil data knowledge source");
    }

    return res?.data || null;
  } catch (err) {
    console.error("❌ Error getKnowledgeSourceById:", err);
    throw err;
  }
}

export async function createKnowledgeSource(data) {
  try {
    const res = await api("/sales/knowledge-source", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res && res.success === false) {
      throw new Error(res.message || "Gagal membuat knowledge source");
    }

    return res?.data || null;
  } catch (err) {
    console.error("❌ Error createKnowledgeSource:", err);
    throw err;
  }
}

export async function updateKnowledgeSource(id, data) {
  try {
    const res = await api(`/sales/knowledge-source/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res && res.success === false) {
      throw new Error(res.message || "Gagal mengupdate knowledge source");
    }

    return res?.data || null;
  } catch (err) {
    console.error("❌ Error updateKnowledgeSource:", err);
    throw err;
  }
}

export async function deleteKnowledgeSource(id) {
  try {
    const res = await api(`/sales/knowledge-source/${id}`, {
      method: "DELETE",
    });

    if (res && res.success === false) {
      throw new Error(res.message || "Gagal menghapus knowledge source");
    }

    return true;
  } catch (err) {
    console.error("❌ Error deleteKnowledgeSource:", err);
    throw err;
  }
}

export async function regenerateEmbeddings(id) {
  try {
    const res = await api(`/sales/knowledge-source/${id}/regenerate-embeddings`, {
      method: "POST",
    });

    if (res && res.success === false) {
      throw new Error(res.message || "Gagal regenerate embeddings");
    }

    return res?.data || null;
  } catch (err) {
    console.error("❌ Error regenerateEmbeddings:", err);
    throw err;
  }
}
