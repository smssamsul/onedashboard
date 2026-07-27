export const JABATAN_MAP = {
  1: "Staff",
  2: "Manager",
  3: "General Manager",
  4: "Direksi",
};

export function getJabatanLabel(jabatan) {
  return JABATAN_MAP[jabatan] || "-";
}
