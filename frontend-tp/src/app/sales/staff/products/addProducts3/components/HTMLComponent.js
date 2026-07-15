"use client";

import { InputTextarea } from "primereact/inputtextarea";
import ComponentWrapper from "./ComponentWrapper";

export default function HTMLComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const code = data.code || "";

  const handleChange = (value) => {
    onUpdate?.({ ...data, code: value });
  };

  return (
    <ComponentWrapper
      title="HTML"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="html-component-content">
        <div className="form-field-group">
          <label className="form-label-small">HTML Code</label>
          <InputTextarea
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Masukkan HTML code di sini"
            rows={8}
            className="w-full font-mono text-sm form-input"
          />
        </div>
      </div>
    </ComponentWrapper>
  );
}

