// lib/doku.js
import { api } from "@/lib/api";

export function payWithCC(payload) {
  return api("/doku/create-payment-cc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function payWithEwallet(payload) {
  return api("/doku/create-payment-ewallet", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function payWithVA(payload) {
  return api("/doku/create-payment-va", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
