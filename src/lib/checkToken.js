export function isTokenExpired() {
  const loginTime = localStorage.getItem("login_time");
  if (!loginTime) return true; // belum login / tidak ada waktu login

  const now = Date.now();
  const diff = now - parseInt(loginTime, 10);
  const maxAge = 24 * 60 * 60 * 1000; // 24 jam (dalam ms)

  return diff > maxAge; // true kalau lebih dari 24 jam
}
