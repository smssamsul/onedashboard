"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, ChevronRight, MoreVertical } from "lucide-react";

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
  // Debug log untuk props - hanya log jika onToggleExpand tidak ada
  if (!onToggleExpand) {
    console.error('[ComponentWrapper] onToggleExpand is missing!', {
      title,
      index,
      isExpanded,
      hasOnToggleExpand: !!onToggleExpand,
      onToggleExpandType: typeof onToggleExpand,
      allProps: { title, index, isExpanded, onToggleExpand, onMoveUp, onMoveDown, onDelete },
      stackTrace: new Error().stack
    });
  }
  
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

  const handleHeaderClick = (e) => {
    console.log('[ComponentWrapper] handleHeaderClick called', {
      target: e.target,
      currentTarget: e.currentTarget,
      hasOnToggleExpand: !!onToggleExpand,
      isExpanded
    });
    
    // Hanya toggle jika klik bukan di button atau menu
    const clickedButton = e.target.closest('button');
    const clickedMenu = e.target.closest('.component-menu-wrapper');
    const clickedMoveButtons = e.target.closest('.component-move-buttons');
    const clickedExpandIcon = e.target.closest('.component-expand-icon-wrapper');
    
    console.log('[ComponentWrapper] Click detection', {
      clickedButton: !!clickedButton,
      clickedMenu: !!clickedMenu,
      clickedMoveButtons: !!clickedMoveButtons,
      clickedExpandIcon: !!clickedExpandIcon
    });
    
    // Jangan toggle jika klik di button atau menu
    if (clickedButton || clickedMenu || clickedMoveButtons) {
      console.log('[ComponentWrapper] Click ignored - button/menu clicked');
      return;
    }
    
    // Toggle expand/collapse - allow clicking on expand icon area
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[ComponentWrapper] Calling onToggleExpand', {
      hasOnToggleExpand: !!onToggleExpand,
      title,
      index
    });
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      console.error('[ComponentWrapper] onToggleExpand is not defined!', {
        title,
        index,
        isExpanded,
        propsReceived: { title, index, isExpanded, onToggleExpand, onMoveUp, onMoveDown, onDelete },
        stackTrace: new Error().stack
      });
    }
  };

  return (
    <div className="sidebar-component-card">
      {/* Header dengan arrow dan menu */}
      <div 
        className="component-card-header" 
        onClick={handleHeaderClick}
      >
        <div className="component-card-header-left">
          <div className="component-move-buttons">
            <button 
              className={`component-move-btn-up ${index === 0 ? 'disabled' : ''}`}
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={index === 0}
              title="Pindah ke atas"
            >
              <ChevronUp size={14} />
            </button>
            <button 
              className="component-move-btn-down"
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              title="Pindah ke bawah"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <div 
            className="component-expand-icon-wrapper"
            onClick={(e) => {
              console.log('[ComponentWrapper] Expand icon clicked', {
                hasOnToggleExpand: !!onToggleExpand,
                isExpanded
              });
              e.stopPropagation();
              if (onToggleExpand) {
                console.log('[ComponentWrapper] Calling onToggleExpand from icon');
                onToggleExpand();
              } else {
                console.warn('[ComponentWrapper] onToggleExpand is not defined (from icon)!');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <ChevronDown 
              size={16} 
              className={`component-expand-icon ${isExpanded ? "expanded" : ""}`}
            />
          </div>
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

