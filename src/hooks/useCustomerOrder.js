// src/hooks/useCustomerOrder.js

import { useState } from "react";
import { createCustomerOrder } from "@/lib/customerOrder";

export default function useCustomerOrder() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const submitCustomerOrder = async (orderData) => {
    setLoading(true);

    const res = await createCustomerOrder(orderData);

    setResponse(res);
    setLoading(false);

    return res;
  };

  return {
    submitCustomerOrder,
    loading,
    response,
  };
}
