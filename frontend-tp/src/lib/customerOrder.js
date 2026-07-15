// src/lib/customerOrder.js

import { api } from "@/lib/api"; // ⬅️ ini sesuaikan path API kamu

export function createCustomerOrder(payload) {
  return api("/order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
