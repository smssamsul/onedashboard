"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, GripVertical } from "lucide-react";

export default function DragDropGallery({
  items = [],
  onAdd,
  onRemove,
  onUpdate,
  onReorder,
  label = "Gallery Produk",
  description = "Tambah gambar produk dengan caption",
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection for new item
  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} bukan file gambar. Silakan pilih file gambar.`);
        return false;
      }
      return true;
    });

    validFiles.forEach(file => {
      if (onAdd) {
        onAdd({
          path: { type: "file", value: file },
          caption: "",
        });
      }
    });
  }, [onAdd]);

  // Handle drag events for drop zone
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    handleFiles(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleFiles]);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Drag and drop for reordering
  const handleItemDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
  }, []);

  const handleItemDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleItemDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && onReorder) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, onReorder]);

  return (
    <div className="drag-drop-gallery-wrapper">
      <div className="drag-drop-gallery-header">
        <div>
          <h4 className="drag-drop-gallery-title">{label}</h4>
          <p className="drag-drop-gallery-description">{description}</p>
        </div>
      </div>

      {/* Drop zone for adding new files */}
      <div
        className={`drag-drop-gallery-zone ${isDragging ? "dragging" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="drag-drop-input-hidden"
        />
        <div className="drag-drop-gallery-zone-content">
          <Upload size={32} />
          <div>
            <p className="drag-drop-gallery-zone-label">
              Drag & drop gambar di sini atau klik untuk memilih
            </p>
            <p className="drag-drop-gallery-zone-hint">
              Anda dapat memilih multiple file sekaligus
            </p>
          </div>
        </div>
      </div>

      {/* Gallery items */}
      {items.length > 0 && (
        <div className="drag-drop-gallery-items">
          {items.map((item, index) => {
            const file = item.path?.value;
            const preview = file ? URL.createObjectURL(file) : null;

            return (
              <div
                key={index}
                className={`drag-drop-gallery-item ${draggedIndex === index ? "dragging" : ""}`}
                draggable={!!onReorder}
                onDragStart={(e) => handleItemDragStart(e, index)}
                onDragOver={(e) => handleItemDragOver(e, index)}
                onDrop={(e) => handleItemDrop(e, index)}
              >
                {/* Drag handle */}
                {onReorder && (
                  <div className="drag-drop-gallery-handle">
                    <GripVertical size={20} />
                  </div>
                )}

                {/* Preview */}
                <div className="drag-drop-gallery-preview">
                  {preview ? (
                    <>
                      <img
                        src={preview}
                        alt={`Gallery item ${index + 1}`}
                        className="drag-drop-gallery-image"
                      />
                      <button
                        type="button"
                        className="drag-drop-gallery-remove"
                        onClick={() => onRemove && onRemove(index)}
                        aria-label="Hapus gambar"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="drag-drop-gallery-placeholder">
                      <ImageIcon size={24} />
                      <span>No image</span>
                    </div>
                  )}
                </div>

                {/* Caption input */}
                <div className="drag-drop-gallery-caption">
                  <label className="drag-drop-gallery-caption-label">
                    Caption {index + 1}
                  </label>
                  <input
                    type="text"
                    className="drag-drop-gallery-caption-input"
                    placeholder="Masukkan caption gambar"
                    value={item.caption || ""}
                    onChange={(e) => {
                      if (onUpdate) {
                        onUpdate(index, { ...item, caption: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

