/**
 * Gaya tombol landing page (builder preview + halaman produk publik).
 */

export const BUTTON_SIZE_PRESETS = {
  default: { label: "Sedang (default)", fontSize: null, paddingY: null, paddingX: null },
  small: { label: "Kecil", fontSize: 14, paddingY: 10, paddingX: 20 },
  large: { label: "Besar", fontSize: 18, paddingY: 16, paddingX: 32 },
  custom: { label: "Kustom", fontSize: null, paddingY: null, paddingX: null },
};

export function resolveButtonSize(data = {}) {
  const p = data.sizePreset || "default";
  if (p === "small") {
    return { fontSize: 14, paddingY: 10, paddingX: 20 };
  }
  if (p === "large") {
    return { fontSize: 18, paddingY: 16, paddingX: 32 };
  }
  if (p === "custom") {
    return {
      fontSize: Number.isFinite(Number(data.fontSize)) ? Number(data.fontSize) : 16,
      paddingY: Number.isFinite(Number(data.paddingY)) ? Number(data.paddingY) : 12,
      paddingX: Number.isFinite(Number(data.paddingX)) ? Number(data.paddingX) : 24,
    };
  }
  return {};
}

/**
 * Inline style yang mengoverride kelas preset (.preview-button-*).
 */
export function buildLandingButtonInlineStyle(data = {}) {
  const style = {};
  const size = resolveButtonSize(data);

  if (Number.isFinite(size.fontSize)) {
    style.fontSize = `${size.fontSize}px`;
  }
  if (Number.isFinite(size.paddingX) && Number.isFinite(size.paddingY)) {
    style.padding = `${size.paddingY}px ${size.paddingX}px`;
  }

  const bg = typeof data.backgroundColor === "string" ? data.backgroundColor.trim() : "";
  if (bg) {
    style.backgroundColor = bg;
  }

  const tc = typeof data.textColor === "string" ? data.textColor.trim() : "";
  if (tc) {
    style.color = tc;
  }

  if (Number.isFinite(Number(data.borderRadius))) {
    style.borderRadius = `${Number(data.borderRadius)}px`;
  }

  if (data.fullWidth) {
    style.width = "100%";
    style.display = "block";
    style.boxSizing = "border-box";
  }

  return style;
}
