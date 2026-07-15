"use client";

import { useState } from "react";
import { getFollowupTemplates, createFollowupTemplate } from "@/lib/followup";

export default function useFollowup() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);

  const fetchTemplates = async (produk_id, type) => {
    if (!produk_id) return;

    setLoading(true);
    try {
      const res = await getFollowupTemplates(produk_id, type);
      if (res?.success) {
        setTemplates(res.data || []);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (payload) => {
    setLoading(true);
    try {
      const res = await createFollowupTemplate(payload);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    templates,
    fetchTemplates,
    saveTemplate,
  };
}
