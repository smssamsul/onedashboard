"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Type, Image as ImageIcon, Video, List, Quote, Square as ButtonIcon, GripVertical, X, Edit2, Trash2 } from "lucide-react";

// Available block types
export const BLOCK_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  BUTTON: 'button',
  LIST: 'list',
  QUOTE: 'quote',
  SPACER: 'spacer',
};

// Default block templates
const getDefaultBlock = (type) => {
  const templates = {
    [BLOCK_TYPES.TEXT]: {
      type: BLOCK_TYPES.TEXT,
      content: 'Klik untuk mengedit teks',
      style: {
        fontSize: '16px',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#1f2937',
      }
    },
    [BLOCK_TYPES.IMAGE]: {
      type: BLOCK_TYPES.IMAGE,
      src: null,
      file: null,
      alt: 'Image',
      style: {
        width: '100%',
        objectFit: 'cover',
      }
    },
    [BLOCK_TYPES.VIDEO]: {
      type: BLOCK_TYPES.VIDEO,
      url: '',
      style: {}
    },
    [BLOCK_TYPES.BUTTON]: {
      type: BLOCK_TYPES.BUTTON,
      text: 'Klik Disini',
      link: '#',
      style: {
        backgroundColor: '#F1A124',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px',
      }
    },
    [BLOCK_TYPES.LIST]: {
      type: BLOCK_TYPES.LIST,
      items: ['Item 1', 'Item 2', 'Item 3'],
      style: {}
    },
    [BLOCK_TYPES.QUOTE]: {
      type: BLOCK_TYPES.QUOTE,
      text: 'Kutipan menarik',
      author: '',
      style: {}
    },
    [BLOCK_TYPES.SPACER]: {
      type: BLOCK_TYPES.SPACER,
      height: '40px',
      style: {}
    },
  };
  return { ...templates[type], id: Date.now() + Math.random() };
};

export default function PageBuilder({ 
  blocks = [], 
  onChange,
  onImageUpload 
}) {
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const canvasRef = useRef(null);

  // Handle drag start from sidebar
  const handleDragStart = useCallback((e, blockType) => {
    const newBlock = getDefaultBlock(blockType);
    setDraggedBlock(newBlock);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('blockType', blockType);
  }, []);

  // Handle drag over canvas
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop on canvas
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedBlock) {
      const newBlocks = [...blocks, draggedBlock];
      onChange(newBlocks);
      setDraggedBlock(null);
    } else {
      const blockType = e.dataTransfer.getData('blockType');
      if (blockType) {
        const newBlock = getDefaultBlock(blockType);
        const newBlocks = [...blocks, newBlock];
        onChange(newBlocks);
      }
    }
  }, [blocks, draggedBlock, onChange]);

  // Handle drag start for reordering
  const handleBlockDragStart = useCallback((e, index) => {
    setDraggedBlock(blocks[index]);
    setDraggedOverIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [blocks]);

  // Handle drop for reordering
  const handleBlockDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedBlock && draggedOverIndex !== null) {
      const newBlocks = [...blocks];
      const [removed] = newBlocks.splice(draggedOverIndex, 1);
      newBlocks.splice(dropIndex, 0, removed);
      onChange(newBlocks);
      setDraggedBlock(null);
      setDraggedOverIndex(null);
    }
  }, [blocks, draggedBlock, draggedOverIndex, onChange]);

  // Add block at specific position
  const handleAddBlock = useCallback((blockType, index = null) => {
    const newBlock = getDefaultBlock(blockType);
    const newBlocks = [...blocks];
    if (index !== null) {
      newBlocks.splice(index, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    onChange(newBlocks);
    setShowAddMenu(false);
  }, [blocks, onChange]);

  // Update block
  const handleUpdateBlock = useCallback((index, updatedBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updatedBlock };
    onChange(newBlocks);
  }, [blocks, onChange]);

  // Delete block
  const handleDeleteBlock = useCallback((index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  }, [blocks, onChange]);

  // Handle image upload
  const handleImageUpload = useCallback((index, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const updatedBlock = {
          ...blocks[index],
          src: e.target.result,
          file: file,
        };
        handleUpdateBlock(index, updatedBlock);
      };
      reader.readAsDataURL(file);
    }
  }, [blocks, handleUpdateBlock]);

  return (
    <div className="page-builder-container">
      {/* Sidebar - Block Library */}
      <div className="page-builder-sidebar">
        <div className="page-builder-sidebar-header">
          <h3>Elemen</h3>
          <p>Drag & drop ke canvas</p>
        </div>
        <div className="page-builder-blocks">
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.TEXT)}
          >
            <Type size={20} />
            <span>Text</span>
          </div>
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.IMAGE)}
          >
            <ImageIcon size={20} />
            <span>Image</span>
          </div>
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.VIDEO)}
          >
            <Video size={20} />
            <span>Video</span>
          </div>
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.BUTTON)}
          >
            <ButtonIcon size={20} />
            <span>Button</span>
          </div>
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.LIST)}
          >
            <List size={20} />
            <span>List</span>
          </div>
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.QUOTE)}
          >
            <Quote size={20} />
            <span>Quote</span>
          </div>
          <div
            className="page-builder-block-item"
            draggable
            onDragStart={(e) => handleDragStart(e, BLOCK_TYPES.SPACER)}
          >
            <div style={{ width: 20, height: 20, border: '2px dashed #9ca3af' }} />
            <span>Spacer</span>
          </div>
        </div>
      </div>

      {/* Canvas - Landing Page Builder */}
      <div className="page-builder-canvas-wrapper">
        <div className="page-builder-canvas-header">
          <h3>Landing Page Builder</h3>
          <button
            className="page-builder-add-btn"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            <Plus size={18} />
            Tambah Elemen
          </button>
        </div>
        
        <div
          ref={canvasRef}
          className="page-builder-canvas"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {blocks.length === 0 ? (
            <div className="page-builder-empty">
              <div className="page-builder-empty-icon">
                <Plus size={48} />
              </div>
              <p className="page-builder-empty-text">
                Drag elemen dari sidebar atau klik "Tambah Elemen"
              </p>
              <p className="page-builder-empty-hint">
                Mulai membangun landing page Anda
              </p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <BlockRenderer
                key={block.id || index}
                block={block}
                index={index}
                isEditing={editingBlock === index}
                onEdit={() => setEditingBlock(index)}
                onCancel={() => setEditingBlock(null)}
                onUpdate={(updated) => handleUpdateBlock(index, updated)}
                onDelete={() => handleDeleteBlock(index)}
                onImageUpload={(file) => handleImageUpload(index, file)}
                onDragStart={(e) => handleBlockDragStart(e, index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggedOverIndex(index);
                }}
                onDrop={(e) => handleBlockDrop(e, index)}
              />
            ))
          )}
        </div>

        {/* Add Menu */}
        {showAddMenu && (
          <div className="page-builder-add-menu">
            <div className="page-builder-add-menu-header">
              <h4>Tambah Elemen</h4>
              <button onClick={() => setShowAddMenu(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="page-builder-add-menu-grid">
              {Object.values(BLOCK_TYPES).map(type => (
                <button
                  key={type}
                  className="page-builder-add-menu-item"
                  onClick={() => handleAddBlock(type)}
                >
                  {type === BLOCK_TYPES.TEXT && <Type size={24} />}
                  {type === BLOCK_TYPES.IMAGE && <ImageIcon size={24} />}
                  {type === BLOCK_TYPES.VIDEO && <Video size={24} />}
                  {type === BLOCK_TYPES.BUTTON && <ButtonIcon size={24} />}
                  {type === BLOCK_TYPES.LIST && <List size={24} />}
                  {type === BLOCK_TYPES.QUOTE && <Quote size={24} />}
                  {type === BLOCK_TYPES.SPACER && (
                    <div style={{ width: 24, height: 24, border: '2px dashed #9ca3af' }} />
                  )}
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Block Renderer Component
function BlockRenderer({
  block,
  index,
  isEditing,
  onEdit,
  onCancel,
  onUpdate,
  onDelete,
  onImageUpload,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const [localContent, setLocalContent] = useState(block);

  // Sync localContent when block changes externally
  useEffect(() => {
    setLocalContent(block);
  }, [block]);

  const handleSave = () => {
    onUpdate(localContent);
    onCancel();
  };

  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return isEditing ? (
          <div className="page-builder-text-editor">
            <textarea
              value={localContent.content || ''}
              onChange={(e) => setLocalContent({ ...localContent, content: e.target.value })}
              className="page-builder-text-input"
              placeholder="Masukkan teks"
              rows={4}
            />
            <div className="page-builder-text-preview" style={localContent.style || {}}>
              {localContent.content || 'Preview teks'}
            </div>
          </div>
        ) : (
          <div
            style={block.style || {}}
            className="page-builder-text-block"
          >
            {block.content || 'Klik untuk mengedit teks'}
          </div>
        );

      case 'image':
        return (
          <div className="page-builder-image-block">
            {block.src ? (
              <img src={block.src} alt={block.alt} style={block.style} />
            ) : (
              <div className="page-builder-image-placeholder">
                <ImageIcon size={32} />
                <p>Klik untuk upload gambar</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) onImageUpload(file);
                  }}
                  style={{ display: 'none' }}
                  id={`image-upload-${index}`}
                />
                <label htmlFor={`image-upload-${index}`} className="page-builder-upload-label">
                  Pilih Gambar
                </label>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="page-builder-video-block">
            <input
              type="text"
              placeholder="Masukkan URL video (YouTube, dll)"
              value={block.url || ''}
              onChange={(e) => setLocalContent({ ...localContent, url: e.target.value })}
              className="page-builder-video-input"
            />
            {(isEditing ? localContent.url : block.url) && (
              <div className="page-builder-video-preview">
                <iframe
                  src={isEditing ? localContent.url : block.url}
                  style={{ width: '100%', minHeight: '400px', border: 'none' }}
                  title="Video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="page-builder-button-block">
            {isEditing ? (
              <>
                <input
                  type="text"
                  placeholder="Text button"
                  value={localContent.text || ''}
                  onChange={(e) => setLocalContent({ ...localContent, text: e.target.value })}
                  className="page-builder-button-input"
                />
                <input
                  type="text"
                  placeholder="Link"
                  value={localContent.link || ''}
                  onChange={(e) => setLocalContent({ ...localContent, link: e.target.value })}
                  className="page-builder-button-input"
                />
                <button
                  style={localContent.style || block.style}
                  className="page-builder-button-preview"
                  type="button"
                >
                  {localContent.text || block.text || 'Button'}
                </button>
              </>
            ) : (
              <button
                style={block.style}
                className="page-builder-button-preview"
                type="button"
              >
                {block.text || 'Button'}
              </button>
            )}
          </div>
        );

      case 'list':
        return (
          <div className="page-builder-list-block">
            {(isEditing ? (localContent.items || []) : (block.items || [])).map((item, i) => (
              <div key={i} className="page-builder-list-item">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...(localContent.items || block.items || [])];
                        newItems[i] = e.target.value;
                        setLocalContent({ ...localContent, items: newItems });
                      }}
                      className="page-builder-list-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = (localContent.items || block.items || []).filter((_, idx) => idx !== i);
                        setLocalContent({ ...localContent, items: newItems });
                      }}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div className="page-builder-list-display">
                    <span>{i + 1}.</span>
                    <span>{item}</span>
                  </div>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  const newItems = [...(localContent.items || block.items || []), 'Item baru'];
                  setLocalContent({ ...localContent, items: newItems });
                }}
                className="page-builder-add-list-item"
              >
                <Plus size={16} /> Tambah Item
              </button>
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="page-builder-quote-block">
            {isEditing ? (
              <>
                <textarea
                  placeholder="Kutipan"
                  value={localContent.text || ''}
                  onChange={(e) => setLocalContent({ ...localContent, text: e.target.value })}
                  className="page-builder-quote-text"
                />
                <input
                  type="text"
                  placeholder="Author (opsional)"
                  value={localContent.author || ''}
                  onChange={(e) => setLocalContent({ ...localContent, author: e.target.value })}
                  className="page-builder-quote-author"
                />
              </>
            ) : (
              <>
                <div className="page-builder-quote-display">
                  "{block.text || 'Kutipan'}"
                </div>
                {block.author && (
                  <div className="page-builder-quote-author-display">
                    — {block.author}
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'spacer':
        return (
          <div
            className="page-builder-spacer-block"
            style={{ height: (isEditing ? localContent.height : block.height) || '40px' }}
          >
            {isEditing && (
              <div className="page-builder-spacer-handle">
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={parseInt(isEditing ? localContent.height : block.height) || 40}
                  onChange={(e) => setLocalContent({ ...localContent, height: `${e.target.value}px` })}
                />
                <span>{(isEditing ? localContent.height : block.height) || '40px'}</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`page-builder-block-wrapper ${isEditing ? 'editing' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="page-builder-block-toolbar">
        <div className="page-builder-block-handle">
          <GripVertical size={16} />
        </div>
        <div className="page-builder-block-actions">
          <button onClick={onEdit} title="Edit">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} title="Hapus">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="page-builder-block-content">
        {isEditing ? (
          <div className="page-builder-block-editor">
            {renderBlock()}
            <div className="page-builder-block-editor-actions">
              <button onClick={handleSave} className="page-builder-save-btn">
                Simpan
              </button>
              <button onClick={onCancel} className="page-builder-cancel-btn">
                Batal
              </button>
            </div>
          </div>
        ) : (
          renderBlock()
        )}
      </div>
    </div>
  );
}

