const divisionRouteMap = {
  admin: "/admin",
  "1": "/admin", // Admin Super
  "2": "/admin", // Owner
  "3": "/sales", // Sales
  "4": "/finance", // Finance
  "5": "/hr/dashboard", // HR
  "6": "/marketing", // Marketing
  "7": "/multimedia", // Multimedia
  "8": "/it", // IT
  "9": "/direksi", // Direksi
  "11": "/admin", // Trainer (default ke admin untuk sementara)
  "99": "/super-ops", // Super operator — pusat + akses Sales / HR / Finance
  sales: "/sales",
  hr: "/hr/dashboard",
  "human resources": "/hr/dashboard",
  "human_resources": "/hr/dashboard",
  finance: "/finance",
  marketing: "/marketing",
  multimedia: "/multimedia",
  mm: "/multimedia",
  it: "/it",
  trainer: "/admin",
};

/**
 * Get division home route based on division and level
 * @param {string|number} divisi - Division ID or name
 * @param {string|number} level - User level (1 = Leader, 2 = Staff)
 * @returns {string} Route path
 */
export function getDivisionHome(divisi, level = null) {
  if (!divisi) return "/admin";
  
  // Handle both string and number values
  const divisiStr = String(divisi).trim();
  const levelNum = level != null && level !== "" ? Number(level) : null;

  // Super operator: divisi 99 + level 99 → halaman pusat /super-ops
  if (divisiStr === "99" && levelNum === 99) {
    return "/super-ops";
  }
  
  // Get base route for division
  let baseRoute = null;
  
  // Try exact match first (for numeric strings like "3", "1", etc.)
  if (divisionRouteMap[divisiStr]) {
    baseRoute = divisionRouteMap[divisiStr];
  } else {
    // Fallback to lowercase for text values
    const normalized = divisiStr.toLowerCase();
    baseRoute = divisionRouteMap[normalized] || "/admin";
  }
  
  // Direksi (level 9 atau divisi 9) - redirect ke /direksi
  if (levelNum === 9 || divisiStr === "9") {
    return "/direksi";
  }
  
  // If level is provided and is 2 (Staff), append /staff to the route
  // Only apply for divisions that have staff routes (sales, finance, etc.)
  if (levelNum === 2 && baseRoute !== "/admin" && baseRoute !== "/hr/dashboard" && 
      baseRoute !== "/marketing" && baseRoute !== "/multimedia" && baseRoute !== "/it") {
    // Check if division supports staff routes
    const staffSupportedDivisions = ["/sales", "/finance"];
    if (staffSupportedDivisions.includes(baseRoute)) {
      return `${baseRoute}/staff`;
    }
  }
  
  // Level 1 (Leader) or no level specified - return base route
  return baseRoute;
}

