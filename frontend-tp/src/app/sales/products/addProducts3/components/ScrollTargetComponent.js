"use client";

import { InputText } from "primereact/inputtext";
import ComponentWrapper from "./ComponentWrapper";

export default function ScrollTargetComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const target = data.target || "";

  const handleChange = (value) => {
    onUpdate?.({ ...data, target: value });
  };

  return (
    <ComponentWrapper
      title="Scroll Target"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="scroll-target-component-content">
        <div className="form-field-group">
          <label className="form-label-small">Target ID</label>
          <InputText
            value={target}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="target-id"
            className="w-full form-input"
          />
          <p className="text-xs text-gray-500 mt-1">
            ID elemen yang akan di-scroll ke sini
          </p>
        </div>
      </div>
    </ComponentWrapper>
  );
}

