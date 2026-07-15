// Finance Custom Hooks
// Hooks akan ditambahkan nanti

import { useState, useEffect } from "react";

export function useFinance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hook logic akan ditambahkan nanti

  return {
    data,
    loading,
    error,
  };
}
