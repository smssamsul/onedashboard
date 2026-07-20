export const JABATAN_MAP = {
  1: "Vice President",
  2: "Assistant Vice President",
  3: "General Manager",
  4: "Manager",
  5: "Supervisor",
  6: "Officer",
  7: "Clerical Staff",
  8: "Internship",
};

export function getJabatanLabel(jabatan) {
  return JABATAN_MAP[jabatan] || "-";
}
