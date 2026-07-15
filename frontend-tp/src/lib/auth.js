import { api } from "./api";
import { setToken, clearToken } from "./storage";
import { isTokenExpired } from "./checkToken";

export const login = async (email, password) => {
  const res = await api("login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (res.success && res.token) setToken(res.token);
  return res;
};

export const logout = () => {
  clearToken();
  window.location.href = "/admin/login"; // ✅ arahkan ke route login lo yang benar
};

export const getUser = async () => {
  if (isTokenExpired()) {
    console.warn("🔒 Token sudah kadaluarsa — auto logout");
    logout();
    return null;
  }

  const res = await api("me");

  if (res.status === 401 || res.status === 403) {
    console.warn("🔒 Token invalid — auto logout");
    logout();
    return null;
  }

  return res;
};
