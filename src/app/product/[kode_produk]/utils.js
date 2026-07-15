// Server-side utility functions untuk normalisasi dan parsing data
// Dapat digunakan di Server Component tanpa "use client"

/**
 * Normalisasi data landingpage dari backend
 * Memastikan child blocks memiliki parentId yang benar untuk relasi dengan section
 */
export function normalizeLandingpageData(landingpageData) {
  if (!Array.isArray(landingpageData)) {
    return landingpageData;
  }

  // Optimasi: Cek dulu apakah perlu normalisasi sebelum deep clone
  const blocksWithParentId = landingpageData.filter(b => b && b.parentId);
  const sections = landingpageData.filter(item => item && item.type === 'section');
  
  // Jika sudah normalized, skip clone
  if (blocksWithParentId.length > 0 && sections.length === 0) {
    return landingpageData;
  }
  
  // Cek apakah semua section sudah tidak punya content.children (sudah normalized)
  const needsNormalization = sections.some(section => {
    const sectionComponentId = section.config?.componentId;
    if (!sectionComponentId) return false;
    
    const existingChildren = landingpageData.filter(b => 
      b && b.type && b.parentId === sectionComponentId
    );
    
    if (existingChildren.length > 0) return false;
    
    const sectionChildren = section.content?.children || [];
    return Array.isArray(sectionChildren) && sectionChildren.length > 0;
  });
  
  if (!needsNormalization) {
    return landingpageData;
  }

  // Deep clone hanya jika benar-benar perlu
  const normalized = JSON.parse(JSON.stringify(landingpageData));

  sections.forEach(section => {
    const sectionComponentId = section.config?.componentId;
    if (!sectionComponentId) return;

    const existingChildren = normalized.filter(b => 
      b && b.type && b.parentId === sectionComponentId
    );
    
    if (existingChildren.length > 0) {
      if (section.content && section.content.children) {
        delete section.content.children;
      }
      return;
    }

    const sectionChildren = section.content?.children || [];
    if (!Array.isArray(sectionChildren) || sectionChildren.length === 0) {
      if (section.content) {
        delete section.content.children;
      }
      return;
    }

    sectionChildren.forEach((childRef) => {
      let childBlock = null;

      if (typeof childRef === 'object' && childRef !== null && childRef.type) {
        const childComponentId = childRef.config?.componentId || childRef.componentId;
        const childOrder = childRef.order;
        
        childBlock = normalized.find(b => {
          if (!b || b.type === 'section' || b.type === 'settings') return false;
          if (childComponentId && b.config?.componentId === childComponentId) return true;
          if (childOrder && b.order === childOrder) return true;
          return false;
        });
      } else if (typeof childRef === 'string' || typeof childRef === 'number') {
        const childId = String(childRef);
        childBlock = normalized.find(b => {
          if (!b || b.type === 'section' || b.type === 'settings') return false;
          return b.config?.componentId === childId || String(b.order) === childId;
        });
      }

      if (childBlock && !childBlock.parentId) {
        childBlock.parentId = sectionComponentId;
      }
    });

    if (section.content) {
      delete section.content.children;
    }
  });

  return normalized;
}

/**
 * Parse bundling data dari response backend
 */
export function parseBundlingData(data) {
  let bundlingData = [];
  if (data.bundling_rel && Array.isArray(data.bundling_rel)) {
    bundlingData = data.bundling_rel
      .filter(item => item.status === 'A')
      .map(item => ({
        id: item.id,
        nama: item.nama,
        harga: typeof item.harga === 'string' ? parseInt(item.harga) : item.harga
      }));
  } else if (data.bundling) {
    if (typeof data.bundling === 'string') {
      try {
        bundlingData = JSON.parse(data.bundling);
      } catch (e) {
        bundlingData = [];
      }
    } else if (Array.isArray(data.bundling)) {
      bundlingData = data.bundling;
    }
  }
  
  return Array.isArray(bundlingData) ? bundlingData : [];
}

/**
 * Parse landingpage data dari response backend
 */
export function parseLandingpageData(data) {
  let landingpageData = data.landingpage;
  
  if (typeof landingpageData === 'string') {
    try {
      landingpageData = JSON.parse(landingpageData);
    } catch (e) {
      return null;
    }
  }

  if (!Array.isArray(landingpageData)) {
    return null;
  }

  return normalizeLandingpageData(landingpageData);
}

/**
 * Filter root blocks (exclude settings dan blocks with parentId)
 */
export function getRootBlocks(landingpage) {
  if (!landingpage || !Array.isArray(landingpage)) return [];
  
  return landingpage.filter((item) => {
    if (!item || !item.type) return false;
    if (item.type === 'settings') return false;
    if (item.parentId) return false;
    return true;
  });
}

/**
 * Get settings block dari landingpage
 */
export function getSettings(landingpage) {
  return landingpage && Array.isArray(landingpage) && landingpage.length > 0 && landingpage[0].type === 'settings'
    ? landingpage[0]
    : null;
}

