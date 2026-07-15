"use client";

import { useState, useEffect } from "react";
import { buildImageUrl, convertToWebp } from "@/lib/image";
import { flushSync } from "react-dom";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Slider } from "primereact/slider";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import {
  Image as ImageIcon, Info, ChevronDown as ChevronDownIcon, ChevronUp,
  Pencil, Trash2, Eye, Settings, X, ChevronDown, ChevronUp as ChevronUpIcon,
  ArrowDown, ArrowUp
} from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function ImageSliderComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const images = data.images || [];
  const sliderType = data.sliderType || "gallery"; // gallery, banner
  const autoslide = data.autoslide || false;
  const autoslideDuration = data.autoslideDuration || 5;
  const showCaption = data.showCaption || false;

  // Advanced settings state (sama seperti ImageComponent)
  const [alignment, setAlignment] = useState(data.alignment || "center");
  const [imageWidth, setImageWidth] = useState(data.imageWidth || 100);
  const [imageFit, setImageFit] = useState(data.imageFit || "fill");
  const [aspectRatio, setAspectRatio] = useState(data.aspectRatio || "OFF");
  const [backgroundType, setBackgroundType] = useState(data.backgroundType || "none");
  const [backgroundColor, setBackgroundColor] = useState(data.backgroundColor || "#ffffff");
  const [backgroundImage, setBackgroundImage] = useState(data.backgroundImage || "");
  const [device, setDevice] = useState(data.device || "mobile");
  const [paddingTop, setPaddingTop] = useState(data.paddingTop || 0);
  const [paddingRight, setPaddingRight] = useState(data.paddingRight || 0);
  const [paddingBottom, setPaddingBottom] = useState(data.paddingBottom || 0);
  const [paddingLeft, setPaddingLeft] = useState(data.paddingLeft || 0);
  const [componentId, setComponentId] = useState(data.componentId || `img-slider-${Math.random().toString(36).substr(2, 9)}`);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showImageActions, setShowImageActions] = useState({});

  const handleChange = (field, value) => {
    flushSync(() => {
      onUpdate?.({ ...data, [field]: value });
    });
  };

  // Update component when advanced settings change
  useEffect(() => {
    onUpdate?.({
      ...data,
      alignment,
      imageWidth,
      imageFit,
      aspectRatio,
      backgroundType,
      backgroundColor,
      backgroundImage,
      device,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      componentId,
    });
  }, [alignment, imageWidth, imageFit, aspectRatio, backgroundType, backgroundColor, backgroundImage, device, paddingTop, paddingRight, paddingBottom, paddingLeft, componentId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const webpDataUrl = await convertToWebp(file);
        const newImage = {
          src: webpDataUrl,
          file: file,
          alt: "",
          caption: "",
          link: ""
        };
        handleChange("images", [...images, newImage]);
      } catch (err) {
        console.error("Failed to convert image", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImage = {
            src: event.target.result,
            file: file,
            alt: "",
            caption: "",
            link: ""
          };
          handleChange("images", [...images, newImage]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleImageFileChange = async (imageIndex, e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const webpDataUrl = await convertToWebp(file);
        const newImages = [...images];
        newImages[imageIndex] = {
          ...newImages[imageIndex],
          src: webpDataUrl,
          file: file
        };
        handleChange("images", newImages);
      } catch (err) {
        console.error("Failed to convert image", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImages = [...images];
          newImages[imageIndex] = {
            ...newImages[imageIndex],
            src: event.target.result,
            file: file
          };
          handleChange("images", newImages);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (imageIndex) => {
    const newImages = images.filter((_, i) => i !== imageIndex);
    handleChange("images", newImages);
  };

  const moveImage = (imageIndex, direction) => {
    if (direction === "up" && imageIndex === 0) return;
    if (direction === "down" && imageIndex === images.length - 1) return;

    const newImages = [...images];
    const newIndex = direction === "up" ? imageIndex - 1 : imageIndex + 1;
    [newImages[imageIndex], newImages[newIndex]] = [newImages[newIndex], newImages[imageIndex]];
    handleChange("images", newImages);
  };

  const updateImage = (imageIndex, field, value) => {
    const newImages = [...images];
    newImages[imageIndex] = { ...newImages[imageIndex], [field]: value };
    handleChange("images", newImages);
  };

  const handleBackgroundFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const webpDataUrl = await convertToWebp(file);
        setBackgroundImage(webpDataUrl);
      } catch (err) {
        console.error("Failed to convert background image", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          setBackgroundImage(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <ComponentWrapper
      title="Image Slider"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      {/* Info Box */}
      <div className="component-info-box">
        <Info size={16} />
        <span>
          Jika Anda menggunakan Safari, hasil upload gambar akan dalam format JPEG. Selain Safari, akan dalam format WEBP.
        </span>
      </div>

      {/* Images List */}
      {images.map((image, i) => (
        <div key={i} className="image-slider-item" style={{ marginBottom: "16px" }}>
          <div className="uploaded-image-container">
            <div
              className="uploaded-image-preview-box"
              onMouseEnter={() => setShowImageActions({ ...showImageActions, [i]: true })}
              onMouseLeave={() => setShowImageActions({ ...showImageActions, [i]: false })}
            >
              <img
                src={buildImageUrl(image.src)}
                alt="Preview"
                className="uploaded-image-preview-img"
              />
              {showImageActions[i] && (
                <div className="image-action-overlay">
                  <button
                    className="image-action-btn"
                    title={i === 0 ? "Tidak bisa pindah ke atas" : "Pindah ke atas"}
                    onClick={() => moveImage(i, "up")}
                    disabled={i === 0}
                    style={{ opacity: i === 0 ? 0.5 : 1 }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="image-action-btn"
                    title={i === images.length - 1 ? "Tidak bisa pindah ke bawah" : "Pindah ke bawah"}
                    onClick={() => moveImage(i, "down")}
                    disabled={i === images.length - 1}
                    style={{ opacity: i === images.length - 1 ? 0.5 : 1 }}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="image-action-btn"
                    title="Hapus"
                    onClick={() => removeImage(i)}
                  >
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
              onChange={(e) => handleImageFileChange(i, e)}
              className="component-file-input"
              id={`image-replace-${index}-${i}`}
            />
            <label htmlFor={`image-replace-${index}-${i}`} className="replace-image-label">
              Ganti Gambar
            </label>
          </div>

          {/* Image Details */}
          <div className="form-field-group" style={{ marginTop: "8px" }}>
            <InputText
              value={image.alt || ""}
              onChange={(e) => updateImage(i, "alt", e.target.value)}
              placeholder="Alt Text"
              className="w-full form-input"
              style={{ marginBottom: "8px" }}
            />
            <InputText
              value={image.caption || ""}
              onChange={(e) => updateImage(i, "caption", e.target.value)}
              placeholder="Caption"
              className="w-full form-input"
              style={{ marginBottom: "8px" }}
            />
            {sliderType === "banner" && (
              <InputText
                value={image.link || ""}
                onChange={(e) => updateImage(i, "link", e.target.value)}
                placeholder="Link (untuk aksi klik)"
                className="w-full form-input"
              />
            )}
          </div>
        </div>
      ))}

      {/* Add Image Button */}
      <div style={{ marginTop: "16px", marginBottom: "16px" }}>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.heic"
          onChange={handleFileChange}
          className="component-file-input"
          id={`image-upload-${index}`}
        />
        <label htmlFor={`image-upload-${index}`} className="add-image-link">
          + Tambah Gambar
        </label>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "16px 0" }} />

      {/* Settings (hanya muncul jika lebih dari 1 gambar) */}
      {images.length > 1 && (
        <>
          <div className="form-field-group">
            <label className="form-label-small">Tipe</label>
            <Dropdown
              value={sliderType}
              onChange={(e) => handleChange("sliderType", e.value)}
              options={[
                { label: "Gallery", value: "gallery" },
                { label: "Banner", value: "banner" },
              ]}
              className="w-full"
            />
          </div>

          <div className="component-info-box" style={{ marginTop: "8px", marginBottom: "16px" }}>
            <Info size={16} />
            <span>
              Gunakan tipe 'Banner' untuk dapat mengaktifkan aksi klik pada gambar
            </span>
          </div>

          <div className="form-field-group">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <InputSwitch
                checked={autoslide}
                onChange={(e) => handleChange("autoslide", e.value)}
              />
              <label className="form-label-small" style={{ margin: 0 }}>Autoslide Gambar</label>
            </div>
            {autoslide && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <InputNumber
                  value={autoslideDuration}
                  onValueChange={(e) => handleChange("autoslideDuration", e.value || 5)}
                  min={1}
                  max={60}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button className="advance-toggle-btn" style={{ padding: "8px 16px" }}>
                  Detik
                </button>
              </div>
            )}
          </div>

          <div className="form-field-group">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <InputSwitch
                checked={showCaption}
                onChange={(e) => handleChange("showCaption", e.value)}
              />
              <label className="form-label-small" style={{ margin: 0 }}>Tampil Caption di Gambar Depan</label>
            </div>
          </div>
        </>
      )}

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
            {/* Desain Section */}
            <div className="advance-section-group">
              <label className="advance-section-label">Desain</label>

              {/* Perataan Gambar */}
              <div className="advance-subsection">
                <label className="advance-section-sublabel">Perataan Gambar</label>
                <div className="advance-button-group">
                  <button
                    type="button"
                    className={`advance-toggle-btn ${alignment === "left" ? "active" : ""}`}
                    onClick={() => setAlignment("left")}
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
                    onClick={() => setAlignment("center")}
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
                    onClick={() => setAlignment("right")}
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

              {/* Lebar Gambar */}
              <div className="advance-subsection">
                <label className="advance-section-sublabel">Lebar Gambar</label>
                <div className="image-width-control">
                  <Slider
                    value={imageWidth}
                    onChange={(e) => setImageWidth(e)}
                    min={0}
                    max={100}
                    className="image-width-slider"
                  />
                  <InputNumber
                    value={imageWidth}
                    onValueChange={(e) => setImageWidth(e.value || 0)}
                    onInput={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        setImageWidth(value);
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

              {/* Penyesuaian Gambar */}
              <div className="advance-subsection">
                <label className="advance-section-sublabel">Penyesuaian Gambar</label>
                <div className="advance-button-group">
                  <button
                    type="button"
                    className={`advance-toggle-btn ${imageFit === "fill" ? "active" : ""}`}
                    onClick={() => setImageFit("fill")}
                    title="Fill"
                  >
                    <div className="fit-icon">
                      <div className="fit-box">
                        <div className="fit-inner fit-fill"></div>
                      </div>
                    </div>
                    <span>Fill</span>
                  </button>
                  <button
                    type="button"
                    className={`advance-toggle-btn ${imageFit === "fit" ? "active" : ""}`}
                    onClick={() => setImageFit("fit")}
                    title="Fit"
                  >
                    <div className="fit-icon">
                      <div className="fit-box">
                        <div className="fit-inner fit-contain"></div>
                      </div>
                    </div>
                    <span>Fit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Aspect Ratio Section */}
            <div className="advance-section-group">
              <label className="advance-section-label">Aspect Ratio</label>
              <div className="aspect-ratio-buttons">
                {["OFF", "1:1", "3:2", "4:3", "5:4", "16:10", "16:9", "9:16"].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    className={`aspect-ratio-btn ${aspectRatio === ratio ? "active" : ""}`}
                    onClick={() => setAspectRatio(ratio)}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Latar (Background) Section */}
            <div className="advance-section-group">
              <label className="advance-section-label">Latar (Background)</label>
              <div className="advance-bg-type-buttons">
                <button
                  type="button"
                  className={`advance-bg-type-btn ${backgroundType === "none" ? "active" : ""}`}
                  onClick={() => setBackgroundType("none")}
                  title="Tidak ada background"
                >
                  <div className="bg-none-icon">
                    <X size={16} />
                  </div>
                </button>
                <button
                  type="button"
                  className={`advance-bg-type-btn ${backgroundType === "color" ? "active" : ""}`}
                  onClick={() => setBackgroundType("color")}
                >
                  Warna
                </button>
                <button
                  type="button"
                  className={`advance-bg-type-btn ${backgroundType === "image" ? "active" : ""}`}
                  onClick={() => setBackgroundType("image")}
                >
                  Gambar
                </button>
              </div>

              {/* Background Color Picker */}
              {backgroundType === "color" && (
                <div className="advance-subsection" style={{ marginTop: "12px" }}>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="advance-color-input"
                  />
                </div>
              )}

              {/* Background Image Upload */}
              {backgroundType === "image" && (
                <div className="advance-subsection" style={{ marginTop: "12px" }}>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleBackgroundFileChange}
                    className="component-file-input"
                    id={`bg-image-upload-${index}`}
                  />
                  <label htmlFor={`bg-image-upload-${index}`} className="replace-image-label">
                    {backgroundImage ? "Ganti Background" : "Upload Background"}
                  </label>
                  {backgroundImage && (
                    <div className="bg-image-preview" style={{ marginTop: "8px" }}>
                      <img src={backgroundImage} alt="Background preview" style={{ maxWidth: "100%", borderRadius: "6px" }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Device Section */}
            <div className="advance-section-group">
              <div className="advance-device-view-buttons">
                <button
                  type="button"
                  className={`advance-device-btn ${device === "desktop" ? "active" : ""}`}
                  onClick={() => setDevice("desktop")}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={`advance-device-btn ${device === "tablet" ? "active" : ""}`}
                  onClick={() => setDevice("tablet")}
                >
                  Tablet
                </button>
                <button
                  type="button"
                  className={`advance-device-btn ${device === "mobile" ? "active" : ""}`}
                  onClick={() => setDevice("mobile")}
                >
                  Mobile
                </button>
              </div>
            </div>

            {/* Padding Section */}
            <div className="advance-section-group">
              <label className="advance-section-label">Padding</label>
              <div className="advance-padding-grid">
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Atas</label>
                  <div className="advance-padding-input-wrapper">
                    <div className="advance-padding-input">
                      <InputNumber
                        value={paddingTop}
                        onValueChange={(e) => setPaddingTop(e.value || 0)}
                        min={-9999}
                        className="w-full"
                      />
                    </div>
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Kanan</label>
                  <div className="advance-padding-input-wrapper">
                    <div className="advance-padding-input">
                      <InputNumber
                        value={paddingRight}
                        onValueChange={(e) => setPaddingRight(e.value || 0)}
                        min={-9999}
                        className="w-full"
                      />
                    </div>
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Bawah</label>
                  <div className="advance-padding-input-wrapper">
                    <div className="advance-padding-input">
                      <InputNumber
                        value={paddingBottom}
                        onValueChange={(e) => setPaddingBottom(e.value || 0)}
                        min={-9999}
                        className="w-full"
                      />
                    </div>
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Kiri</label>
                  <div className="advance-padding-input-wrapper">
                    <div className="advance-padding-input">
                      <InputNumber
                        value={paddingLeft}
                        onValueChange={(e) => setPaddingLeft(e.value || 0)}
                        min={-9999}
                        className="w-full"
                      />
                    </div>
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pengaturan Lainnya Section */}
            <div className="advance-section-group">
              <div className="advance-other-settings-divider"></div>
              <label className="advance-section-label">
                Pengaturan Lainnya
              </label>
              <div className="form-field-group">
                <label className="form-label-small">
                  Component ID <span className="required-asterisk">*</span>
                </label>
                <InputText
                  value={componentId}
                  onChange={(e) => setComponentId(e.target.value)}
                  placeholder="Component ID"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ComponentWrapper>
  );
}

