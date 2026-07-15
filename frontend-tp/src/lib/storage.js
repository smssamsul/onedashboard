export function setToken(token) {
  localStorage.setItem("token", token);
  localStorage.setItem("login_time", Date.now()); // 🕒 simpan waktu login
}

export function getToken() {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("login_time");
}
