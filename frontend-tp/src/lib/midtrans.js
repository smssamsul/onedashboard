// lib/midtrans.js
import { api } from "@/lib/api";

export function payWithCC(payload) {
  return api("/midtrans/create-snap-cc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function payWithEwallet(payload) {
  return api("/midtrans/create-snap-ewallet", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function payWithVA(payload) {
  return api("/midtrans/create-snap-va", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
