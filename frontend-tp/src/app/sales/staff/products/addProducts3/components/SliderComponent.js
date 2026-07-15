"use client";

import { Button } from "primereact/button";
import { Trash2 } from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function SliderComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const images = data.images || [];

  const addImage = () => {
    const newImages = [...images, { src: "", alt: "", caption: "" }];
    onUpdate?.({ ...data, images: newImages });
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onUpdate?.({ ...data, images: newImages });
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImages = [...images];
        newImages[index] = { ...newImages[index], src: event.target.result };
        onUpdate?.({ ...data, images: newImages });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateImage = (index, field, value) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    onUpdate?.({ ...data, images: newImages });
  };

  return (
    <ComponentWrapper
      title="Gambar Slider"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="slider-component-content">
        {images.map((img, i) => (
          <div key={i} className="slider-item-editor">
            <div className="slider-item-header">
              <span>Gambar {i + 1}</span>
              <Button
                icon={<Trash2 size={14} />}
                severity="danger"
                size="small"
                onClick={() => removeImage(i)}
              />
            </div>

            <div className="form-field-group">
              <label className="form-label-small">Upload Gambar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(i, e)}
                className="file-input"
              />
              {img.src && (
                <div className="image-preview-small">
                  <img src={img.src} alt={img.alt || `Slider ${i + 1}`} />
                </div>
              )}
            </div>

            <div className="form-field-group">
              <label className="form-label-small">Alt Text</label>
              <input
                type="text"
                value={img.alt}
                onChange={(e) => updateImage(i, "alt", e.target.value)}
                placeholder="Deskripsi gambar"
                className="w-full form-input"
              />
            </div>

            <div className="form-field-group">
              <label className="form-label-small">Caption</label>
              <input
                type="text"
                value={img.caption}
                onChange={(e) => updateImage(i, "caption", e.target.value)}
                placeholder="Caption (opsional)"
                className="w-full form-input"
              />
            </div>
          </div>
        ))}

        <Button
          label="Tambah Gambar"
          icon="pi pi-plus"
          onClick={addImage}
          className="add-item-btn"
        />
      </div>
    </ComponentWrapper>
  );
}

