"use client";

import { InputText } from "primereact/inputtext";
import ComponentWrapper from "./ComponentWrapper";

export default function SectionComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const background = data.background || "#ffffff";
  const padding = data.padding || "20px";

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  return (
    <ComponentWrapper
      title="Section"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="section-component-content">
        <div className="form-field-group">
          <label className="form-label-small">Background Color</label>
          <InputText
            value={background}
            onChange={(e) => handleChange("background", e.target.value)}
            placeholder="#ffffff"
            className="w-full form-input"
          />
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Padding</label>
          <InputText
            value={padding}
            onChange={(e) => handleChange("padding", e.target.value)}
            placeholder="20px"
            className="w-full form-input"
          />
        </div>
      </div>
    </ComponentWrapper>
  );
}

