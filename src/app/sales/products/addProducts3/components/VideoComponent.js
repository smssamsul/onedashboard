"use client";

import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Slider } from "primereact/slider";
import { Button } from "primereact/button";
import { Trash2, Info, ChevronDown as ChevronDownIcon } from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function VideoComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const items = data.items || [];
  const [showAdvance, setShowAdvance] = useState(false);
  
  // Advanced settings state
  const [alignment, setAlignment] = useState(data.alignment || "center");
  const [videoWidth, setVideoWidth] = useState(data.videoWidth !== undefined ? data.videoWidth : 100); // Default 100%
  const [paddingTop, setPaddingTop] = useState(data.paddingTop || 0);
  const [paddingRight, setPaddingRight] = useState(data.paddingRight || 0);
  const [paddingBottom, setPaddingBottom] = useState(data.paddingBottom || 0);
  const [paddingLeft, setPaddingLeft] = useState(data.paddingLeft || 0);

  const addVideo = () => {
    const newItems = [...items, { url: "" }];
    onUpdate?.({ ...data, items: newItems });
  };

  const removeVideo = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate?.({ ...data, items: newItems });
  };

  const updateVideo = (index, value) => {
    const newItems = [...items];
    // Convert YouTube watch URL to embed URL
    let embedUrl = value;
    if (embedUrl.includes("watch?v=")) {
      embedUrl = embedUrl.replace("watch?v=", "embed/");
    }
    if (embedUrl.includes("youtu.be/")) {
      embedUrl = embedUrl.replace("youtu.be/", "youtube.com/embed/");
    }
    newItems[index] = { ...newItems[index], url: value, embedUrl: embedUrl };
    onUpdate?.({ ...data, items: newItems });
  };

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  // Update advance settings
  const updateAdvanceSetting = (field, value) => {
    const newData = { ...data, [field]: value };
    onUpdate?.(newData);
    
    // Update local state
    if (field === "alignment") setAlignment(value);
    if (field === "videoWidth") setVideoWidth(value);
    if (field === "paddingTop") setPaddingTop(value);
    if (field === "paddingRight") setPaddingRight(value);
    if (field === "paddingBottom") setPaddingBottom(value);
    if (field === "paddingLeft") setPaddingLeft(value);
  };

  return (
    <ComponentWrapper
      title="Video"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      {/* Info Box */}
      <div className="component-info-box" style={{ 
        padding: '12px 14px', 
        background: '#f0f9ff', 
        borderRadius: '8px',
        border: '1px solid #bae6fd',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <Info size={16} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ 
          margin: 0, 
          fontSize: '13px', 
          color: '#0c4a6e',
          lineHeight: '1.5'
        }}>
          <strong>Info:</strong> Video berupa link YouTube. Contoh: https://youtube.com/watch?v=...
        </p>
      </div>

      <div className="video-component-content">
        {items.map((item, i) => (
          <div key={i} className="video-item-card">
            <div className="video-item-header">
              <span className="video-item-number">Video {i + 1}</span>
              <Button
                icon={<Trash2 size={14} />}
                severity="danger"
                size="small"
                onClick={() => removeVideo(i)}
                tooltip="Hapus video"
              />
            </div>
            <div className="video-item-content">
              <div className="form-field-group">
                <label className="form-label-small">Link YouTube</label>
                <InputText
                  value={item.url}
                  onChange={(e) => updateVideo(i, e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full form-input"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          icon="pi pi-plus"
          label="Tambah Link"
          onClick={addVideo}
          className="add-item-btn"
        />
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
            {/* Alignment Section */}
            <div className="advance-section-group">
              <label className="advance-section-label">Posisi</label>
              <div className="advance-button-group">
                <button
                  type="button"
                  className={`advance-toggle-btn ${alignment === "left" ? "active" : ""}`}
                  onClick={() => updateAdvanceSetting("alignment", "left")}
                  title="Kiri"
                >
                  <div className="alignment-icon">
                    <div className="alignment-box">
                      <div className="alignment-inner alignment-left"></div>
                    </div>
                  </div>
                  <span>Kiri</span>
                </button>
                <button
                  type="button"
                  className={`advance-toggle-btn ${alignment === "center" ? "active" : ""}`}
                  onClick={() => updateAdvanceSetting("alignment", "center")}
                  title="Tengah"
                >
                  <div className="alignment-icon">
                    <div className="alignment-box">
                      <div className="alignment-inner alignment-center"></div>
                    </div>
                  </div>
                  <span>Tengah</span>
                </button>
                <button
                  type="button"
                  className={`advance-toggle-btn ${alignment === "right" ? "active" : ""}`}
                  onClick={() => updateAdvanceSetting("alignment", "right")}
                  title="Kanan"
                >
                  <div className="alignment-icon">
                    <div className="alignment-box">
                      <div className="alignment-inner alignment-right"></div>
                    </div>
                  </div>
                  <span>Kanan</span>
                </button>
              </div>
            </div>

            {/* Lebar Video */}
            <div className="advance-section-group">
              <label className="advance-section-label">Lebar Video</label>
              <div className="image-width-control">
                <Slider
                  value={videoWidth}
                  onChange={(e) => updateAdvanceSetting("videoWidth", e)}
                  min={0}
                  max={100}
                  className="image-width-slider"
                />
                <InputNumber
                  value={videoWidth}
                  onValueChange={(e) => updateAdvanceSetting("videoWidth", e.value || 0)}
                  onInput={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      updateAdvanceSetting("videoWidth", value);
                    }
                  }}
                  min={0}
                  max={100}
                  suffix=" %"
                  className="image-width-input"
                  showButtons={false}
                />
              </div>
            </div>

            {/* Padding Section */}
            <div className="advance-section-group">
              <label className="advance-section-label">Padding</label>
              <div className="advance-padding-grid">
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Atas</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingTop}
                      onValueChange={(e) => updateAdvanceSetting("paddingTop", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Kanan</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingRight}
                      onValueChange={(e) => updateAdvanceSetting("paddingRight", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Bawah</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingBottom}
                      onValueChange={(e) => updateAdvanceSetting("paddingBottom", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Kiri</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingLeft}
                      onValueChange={(e) => updateAdvanceSetting("paddingLeft", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ComponentWrapper>
  );
}

