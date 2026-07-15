"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, MoreVertical } from "lucide-react";

export default function ComponentWrapper({ 
  title, 
  children, 
  index, 
  onMoveUp, 
  onMoveDown, 
  onDelete,
  isExpanded = true,
  onToggleExpand,
  isRequired = false
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="sidebar-component-card">
      {/* Header dengan arrow dan menu */}
      <div className="component-card-header" onClick={onToggleExpand}>
        <div className="component-card-header-left">
          <button 
            className={`component-move-btn-up ${index === 0 ? 'disabled' : ''}`}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            title="Pindah ke atas"
          >
            <ChevronUp size={16} />
          </button>
          <ChevronDown 
            size={16} 
            className="component-move-icon-down"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            title="Pindah ke bawah"
          />
          <span className="component-card-title">{title}</span>
        </div>
        <div className="component-menu-wrapper" ref={menuRef}>
          <button 
            className="component-menu-btn"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            title="Menu"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="component-menu-dropdown">
              <button className="menu-item" onClick={() => { setShowMenu(false); }}>
                Duplikat
              </button>
              {!isRequired && (
                <button className="menu-item menu-item-danger" onClick={() => { setShowMenu(false); onDelete(); }}>
                  Hapus
                </button>
              )}
              {isRequired && (
                <button className="menu-item menu-item-disabled" disabled>
                  Hapus (Tidak bisa dihapus)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="component-card-content">
          {children}
        </div>
      )}
    </div>
  );
}

