"use client";

import { Dropdown } from "primereact/dropdown";
import ComponentWrapper from "./ComponentWrapper";

export default function AnimationComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const type = data.type || "fade";

  const handleChange = (value) => {
    onUpdate?.({ ...data, type: value });
  };

  return (
    <ComponentWrapper
      title="Animation"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="animation-component-content">
        <div className="form-field-group">
          <label className="form-label-small">Animation Type</label>
          <Dropdown
            value={type}
            onChange={(e) => handleChange(e.value)}
            options={[
              { label: "Fade", value: "fade" },
              { label: "Slide Up", value: "slide-up" },
              { label: "Slide Down", value: "slide-down" },
              { label: "Slide Left", value: "slide-left" },
              { label: "Slide Right", value: "slide-right" },
              { label: "Zoom In", value: "zoom-in" },
              { label: "Zoom Out", value: "zoom-out" },
            ]}
            className="w-full"
          />
        </div>
      </div>
    </ComponentWrapper>
  );
}

