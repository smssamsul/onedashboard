"use client";

import ComponentWrapper from "./ComponentWrapper";

export default function PriceComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  return (
    <ComponentWrapper
      title="Harga"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="price-component-content">
        <div className="price-notification-box">
          <p className="text-sm text-gray-600">
            <strong>Catatan:</strong> Setting harga dapat dilakukan di bagian <strong>Pengaturan</strong>
          </p>
        </div>
      </div>
    </ComponentWrapper>
  );
}

