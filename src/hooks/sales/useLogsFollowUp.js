"use client";

import { useEffect, useState } from "react";
import { getLogsFollowUp } from "@/lib/logsFollowUp";

export default function useLogsFollowUp() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await getLogsFollowUp();

        // data struktur: { message, total, data: [...] }
        setLogs(res.data || []);
      } catch (err) {
        console.error("❌ Gagal ambil logs:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  return { logs, loading, error };
}
