"use client";

import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Image as ImageIcon, Info, ChevronDown as ChevronDownIcon, Pencil, Trash2, Eye, Settings } from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function ImageComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const src = data.src || "";
  const alt = data.alt || "";
  const caption = data.caption || "";
  const [showAdvance, setShowAdvance] = useState(false);
  const [showImageActions, setShowImageActions] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate?.({ ...data, src: event.target.result, file: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  return (
    <ComponentWrapper
      title="Gambar"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      {/* Info Box */}
      <div className="component-info-box">
        <Info size={16} />
        <span>
          Jika Anda menggunakan Safari, hasil upload gambar akan dalam format JPEG. Selain Safari, akan dalam format WEBP.
        </span>
      </div>

      {/* Upload Area */}
      <div className="component-upload-area">
        {src ? (
          <div className="uploaded-image-container">
            <div 
              className="uploaded-image-preview-box"
              onMouseEnter={() => setShowImageActions(true)}
              onMouseLeave={() => setShowImageActions(false)}
            >
              <img src={src} alt="Preview" className="uploaded-image-preview-img" />
              {showImageActions && (
                <div className="image-action-overlay">
                  <button className="image-action-btn" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button className="image-action-btn" title="Hapus" onClick={() => onUpdate?.({ ...data, src: "" })}>
                    <Trash2 size={16} />
                  </button>
                  <button className="image-action-btn" title="Lihat">
                    <Eye size={16} />
                  </button>
                  <button className="image-action-btn" title="Pengaturan">
                    <Settings size={16} />
                  </button>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.heic"
              onChange={handleFileChange}
              className="component-file-input"
              id={`image-replace-${index}`}
            />
            <label htmlFor={`image-replace-${index}`} className="replace-image-label">
              Ganti Gambar
            </label>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.heic"
              onChange={handleFileChange}
              className="component-file-input"
              id={`image-upload-${index}`}
            />
            <label htmlFor={`image-upload-${index}`} className="component-upload-label">
              <div className="upload-icon-wrapper">
                <ImageIcon size={32} />
              </div>
              <span className="upload-text">Upload Gambar *</span>
              <span className="upload-formats">.jpg, .jpeg, .png, .webp, .gif, .heic</span>
            </label>
          </>
        )}
      </div>

      {/* Advance Section */}
      <div className="component-advance-section">
        <button 
          className="component-advance-toggle"
          onClick={() => setShowAdvance(!showAdvance)}
        >
          <span>Advance</span>
          <ChevronDownIcon 
            size={16} 
            className={showAdvance ? "rotate-180" : ""}
          />
        </button>
        
        {showAdvance && (
          <div className="component-advance-content">
            <div className="form-field-group">
              <label className="form-label-small">Alt Text</label>
              <InputText
                value={alt}
                onChange={(e) => handleChange("alt", e.target.value)}
                placeholder="Deskripsi gambar"
                className="w-full"
              />
            </div>

            <div className="form-field-group">
              <label className="form-label-small">Caption</label>
              <InputText
                value={caption}
                onChange={(e) => handleChange("caption", e.target.value)}
                placeholder="Caption gambar (opsional)"
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </ComponentWrapper>
  );
}

