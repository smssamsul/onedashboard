"use client";

import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Trash2 } from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function ListComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const items = data.items || [];

  const addItem = () => {
    const newItems = [...items, { nama: "" }];
    onUpdate?.({ ...data, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate?.({ ...data, items: newItems });
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], nama: value };
    onUpdate?.({ ...data, items: newItems });
  };

  return (
    <ComponentWrapper
      title="Daftar / List Point"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="list-component-content">
        {items.map((item, i) => (
          <div key={i} className="list-item-editor">
            <div className="list-item-number">{i + 1}</div>
            <InputText
              value={item.nama}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Point ${i + 1}`}
              className="flex-1"
            />
            <Button
              icon={<Trash2 size={14} />}
              severity="danger"
              size="small"
              onClick={() => removeItem(i)}
            />
          </div>
        ))}

        <Button
          label="Tambah Point"
          icon="pi pi-plus"
          size="small"
          onClick={addItem}
          className="add-item-btn"
        />
      </div>
    </ComponentWrapper>
  );
}

