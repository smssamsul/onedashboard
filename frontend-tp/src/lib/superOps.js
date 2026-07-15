/**
 * Super operator: satu akun lintas divisi Sales, HR, Finance.
 * Backend harus mengembalikan user.divisi === 99 dan user.level === 99.
 */

export const SUPER_OPS_DIVISI = "99";
export const SUPER_OPS_LEVEL = 99;

/** Halaman pusat Super OPS (link ke semua divisi). */
export const SUPER_OPS_HUB_PATH = "/super-ops";

export const SUPER_OPS_TAB_STORAGE_KEY = "super_ops_nav_tab";

/** @param {'hub'|'sales'|'hr'|'finance'} tab */
export function getSuperOpsHomeRoute(tab) {
  if (tab === "hub") return SUPER_OPS_HUB_PATH;
  if (tab === "hr") return "/hr/dashboard";
  if (tab === "finance") return "/finance";
  return "/sales";
}

/**
 * @param {object|null|undefined} user - dari localStorage JSON user
 */
export function isSuperOpsUser(user) {
  if (!user) return false;
  const d = String(user.divisi ?? "").trim();
  const l = user.level != null ? Number(user.level) : NaN;
  return d === SUPER_OPS_DIVISI && l === SUPER_OPS_LEVEL;
}

/**
 * Infer tab aktif dari pathname (untuk sync UI tab dengan URL).
 * @param {string} pathname
 * @returns {'hub'|'sales'|'hr'|'finance'}
 */
export function inferSuperOpsTabFromPath(pathname) {
  if (!pathname) return "hub";
  if (pathname.startsWith("/super-ops")) return "hub";
  if (pathname.startsWith("/hr")) return "hr";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/sales")) return "sales";
  return "hub";
}
