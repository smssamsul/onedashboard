"use client";

import { InputTextarea } from "primereact/inputtextarea";
import ComponentWrapper from "./ComponentWrapper";

export default function EmbedComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const code = data.code || "";

  const handleChange = (value) => {
    onUpdate?.({ ...data, code: value });
  };

  return (
    <ComponentWrapper
      title="Embed"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="embed-component-content">
        <div className="form-field-group">
          <label className="form-label-small">Embed Code (HTML)</label>
          <InputTextarea
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Paste embed code di sini (iframe, script, dll)"
            rows={5}
            className="w-full form-input"
          />
        </div>
      </div>
    </ComponentWrapper>
  );
}

