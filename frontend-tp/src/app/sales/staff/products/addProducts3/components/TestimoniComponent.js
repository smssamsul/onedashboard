"use client";

import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import ComponentWrapper from "./ComponentWrapper";

export default function TestimoniComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const items = data.items || [];

  const addTestimoni = () => {
    const newItems = [...items, { gambar: { type: "file", value: null }, nama: "", deskripsi: "" }];
    onUpdate?.({ ...data, items: newItems });
  };

  const removeTestimoni = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate?.({ ...data, items: newItems });
  };

  const updateTestimoni = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate?.({ ...data, items: newItems });
  };

  return (
    <ComponentWrapper
      title="Testimoni"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="testimoni-component-content">
        {items.map((item, i) => (
          <div key={i} className="testimoni-item-card">
            <div className="testimoni-item-header">
              <span className="testimoni-item-number">Testimoni {i + 1}</span>
              <Button
                icon="pi pi-trash"
                severity="danger"
                className="p-button-danger p-button-sm"
                onClick={() => removeTestimoni(i)}
                tooltip="Hapus testimoni"
              />
            </div>
            <div className="testimoni-item-content">
              <div className="form-field-group">
                <label className="form-label-small">Upload Foto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    updateTestimoni(i, "gambar", { type: "file", value: e.target.files[0] })
                  }
                  className="file-input"
                />
                {item.gambar?.type === "file" && item.gambar.value && (
                  <div className="file-preview">
                    <img 
                      src={URL.createObjectURL(item.gambar.value)} 
                      alt={`Testimoni ${i + 1}`}
                      className="preview-thumbnail"
                    />
                  </div>
                )}
              </div>
              <div className="form-field-group">
                <label className="form-label-small">Nama</label>
                <InputText
                  className="w-full form-input"
                  placeholder="Masukkan nama testimoni"
                  value={item.nama}
                  onChange={(e) => updateTestimoni(i, "nama", e.target.value)}
                />
              </div>
              <div className="form-field-group">
                <label className="form-label-small">Deskripsi</label>
                <InputTextarea
                  className="w-full form-input"
                  rows={3}
                  placeholder="Masukkan deskripsi testimoni"
                  value={item.deskripsi}
                  onChange={(e) => updateTestimoni(i, "deskripsi", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          icon="pi pi-plus"
          label="Tambah Testimoni"
          className="add-item-btn"
          onClick={addTestimoni}
        />
      </div>
    </ComponentWrapper>
  );
}

