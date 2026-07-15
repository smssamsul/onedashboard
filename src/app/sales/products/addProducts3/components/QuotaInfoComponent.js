"use client";

import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import ComponentWrapper from "./ComponentWrapper";

export default function QuotaInfoComponent({
  data = {},
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
  index,
  isExpanded,
  onToggleExpand,
}) {
  const totalKuota = data.totalKuota ?? 60;
  const sisaKuota = data.sisaKuota ?? 47;
  const headline = data.headline ?? "Sisa kuota terbatas!";
  const subtext =
    data.subtext ??
    "Jangan tunda lagi, amankan kursi Anda sebelum kuota habis.";
  const highlightText = data.highlightText ?? "Daftar sekarang sebelum kehabisan.";

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  return (
    <ComponentWrapper
      title="Info Kuota"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="form-field-group">
        <label className="form-label-small">Sisa Kuota</label>
        <InputNumber
          value={sisaKuota}
          onValueChange={(e) => handleChange("sisaKuota", e.value ?? 0)}
          min={0}
          className="w-full"
        />
      </div>

      <div className="form-field-group">
        <label className="form-label-small">Total Kuota</label>
        <InputNumber
          value={totalKuota}
          onValueChange={(e) => handleChange("totalKuota", e.value ?? 0)}
          min={0}
          className="w-full"
        />
      </div>

      <div className="form-field-group">
        <label className="form-label-small">Headline</label>
        <InputText
          value={headline}
          onChange={(e) => handleChange("headline", e.target.value)}
          placeholder="Sisa kuota terbatas!"
          className="w-full form-input"
        />
      </div>

      <div className="form-field-group">
        <label className="form-label-small">Subtext</label>
        <InputText
          value={subtext}
          onChange={(e) => handleChange("subtext", e.target.value)}
          placeholder="Jangan tunda lagi..."
          className="w-full form-input"
        />
      </div>

      <div className="form-field-group">
        <label className="form-label-small">Highlight</label>
        <InputText
          value={highlightText}
          onChange={(e) => handleChange("highlightText", e.target.value)}
          placeholder="Daftar sekarang sebelum kehabisan."
          className="w-full form-input"
        />
      </div>
    </ComponentWrapper>
  );
}


