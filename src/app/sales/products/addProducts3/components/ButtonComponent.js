"use client";

import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import ComponentWrapper from "./ComponentWrapper";
import { BUTTON_SIZE_PRESETS } from "@/lib/landingPageButtonStyle";

const STYLE_OPTIONS = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Success", value: "success" },
  { label: "Danger", value: "danger" },
];

const SIZE_PRESET_OPTIONS = Object.entries(BUTTON_SIZE_PRESETS).map(([value, { label }]) => ({
  label,
  value,
}));

export default function ButtonComponent({
  data = {},
  allBlocks = [],
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
  index,
  isExpanded,
  onToggleExpand,
}) {
  const text = data.text || "Klik Disini";
  const link = data.link || "#form-pemesanan";
  const style = data.style || "primary";
  const sizePreset = data.sizePreset || "default";
  const fontSize = data.fontSize ?? null;
  const paddingX = data.paddingX ?? null;
  const paddingY = data.paddingY ?? null;
  const backgroundColor = data.backgroundColor ?? "";
  const textColor = data.textColor ?? "";
  const borderRadius = data.borderRadius ?? null;
  const fullWidth = Boolean(data.fullWidth);
  const fixedBottom = Boolean(data.fixedBottom);
  const fbPixelEvent = data.fbPixelEvent || "";

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  const applySizePreset = (preset) => {
    if (preset === "default") {
      onUpdate?.({
        ...data,
        sizePreset: "default",
        fontSize: null,
        paddingX: null,
        paddingY: null,
      });
      return;
    }
    if (preset === "small") {
      onUpdate?.({
        ...data,
        sizePreset: "small",
        fontSize: 14,
        paddingY: 10,
        paddingX: 20,
      });
      return;
    }
    if (preset === "large") {
      onUpdate?.({
        ...data,
        sizePreset: "large",
        fontSize: 18,
        paddingY: 16,
        paddingX: 32,
      });
      return;
    }
    onUpdate?.({
      ...data,
      sizePreset: "custom",
      fontSize: fontSize ?? 16,
      paddingY: paddingY ?? 12,
      paddingX: paddingX ?? 24,
    });
  };

  const sectionOptions = allBlocks
    .filter(b => b.type !== "button" && b.type !== "settings" && b.id !== data.componentId)
    .map((b, idx) => {
      const typeLabel = b.type.charAt(0).toUpperCase() + b.type.slice(1);
      return {
        label: `Scroll ke: ${typeLabel} (${idx + 1})`,
        value: `#${b.config?.componentId || b.id}`
      };
    });

  const isKnownLink = link === "#form-pemesanan" || sectionOptions.some(opt => opt.value === link);
  const dropdownValue = isKnownLink ? link : "custom";

  return (
    <ComponentWrapper
      title="Tombol"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="button-component-content">
        <div className="form-field-group">
          <label className="form-label-small">Text Tombol</label>
          <InputText
            value={text}
            onChange={(e) => handleChange("text", e.target.value)}
            placeholder="Klik Disini"
            className="w-full form-input"
          />
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Tujuan Link</label>
          <Dropdown
            value={dropdownValue}
            onChange={(e) => {
              if (e.value !== "custom") {
                handleChange("link", e.value);
              } else {
                handleChange("link", "");
              }
            }}
            options={[
              { label: "Form Pemesanan", value: "#form-pemesanan" },
              ...sectionOptions,
              { label: "Kustom Link", value: "custom" },
            ]}
            className="w-full"
          />
        </div>

        {dropdownValue === "custom" && (
          <div className="form-field-group" style={{ marginTop: 10 }}>
            <label className="form-label-small">Link / URL Kustom</label>
            <InputText
              value={link}
              onChange={(e) => handleChange("link", e.target.value)}
              placeholder="https://... atau #section-id"
              className="w-full form-input"
            />
          </div>
        )}

        <div className="form-field-group">
          <label className="form-label-small">Event Pixel Facebook</label>
          <Dropdown
            value={fbPixelEvent}
            onChange={(e) => handleChange("fbPixelEvent", e.value)}
            options={[
              { label: "Tidak Ada (Default)", value: "" },
              { label: "Lead", value: "Lead" },
              { label: "AddToCart", value: "AddToCart" },
              { label: "InitiateCheckout", value: "InitiateCheckout" },
              { label: "Purchase", value: "Purchase" },
              { label: "Contact", value: "Contact" },
              { label: "ViewContent", value: "ViewContent" }
            ]}
            className="w-full"
            placeholder="Pilih Event Pixel"
          />
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Gaya warna (preset)</label>
          <Dropdown
            value={style}
            onChange={(e) => handleChange("style", e.value)}
            options={STYLE_OPTIONS}
            className="w-full"
          />
          <small className="pengaturan-hint" style={{ display: "block", marginTop: 6 }}>
            Warna kustom di bawah menggantikan warna preset jika diisi.
          </small>
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Ukuran cepat</label>
          <Dropdown
            value={sizePreset}
            onChange={(e) => applySizePreset(e.value)}
            options={SIZE_PRESET_OPTIONS}
            className="w-full"
          />
        </div>

        {sizePreset === "custom" && (
          <div
            className="form-field-group"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}
          >
            <div>
              <label className="form-label-small">Font (px)</label>
              <InputNumber
                value={fontSize}
                onValueChange={(e) => handleChange("fontSize", e.value)}
                min={10}
                max={48}
                showButtons
                className="w-full"
                inputClassName="w-full"
              />
            </div>
            <div>
              <label className="form-label-small">Padding V (px)</label>
              <InputNumber
                value={paddingY}
                onValueChange={(e) => handleChange("paddingY", e.value)}
                min={-9999}
                max={48}
                showButtons
                className="w-full"
              />
            </div>
            <div>
              <label className="form-label-small">Padding H (px)</label>
              <InputNumber
                value={paddingX}
                onValueChange={(e) => handleChange("paddingX", e.value)}
                min={-9999}
                max={64}
                showButtons
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="form-field-group">
          <label className="form-label-small">Warna latar (opsional)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input
              type="color"
              aria-label="Pilih warna latar"
              value={backgroundColor && /^#[0-9A-Fa-f]{6}$/.test(backgroundColor) ? backgroundColor : "#f1a124"}
              onChange={(e) => handleChange("backgroundColor", e.target.value)}
              style={{ width: 44, height: 36, padding: 0, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }}
            />
            <InputText
              value={backgroundColor}
              onChange={(e) => handleChange("backgroundColor", e.target.value)}
              placeholder="#F1A124 atau kosongkan"
              className="form-input"
              style={{ flex: 1, minWidth: 140 }}
            />
            <button
              type="button"
              className="text-xs"
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
              onClick={() => handleChange("backgroundColor", "")}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Warna teks (opsional)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input
              type="color"
              aria-label="Pilih warna teks"
              value={textColor && /^#[0-9A-Fa-f]{6}$/.test(textColor) ? textColor : "#ffffff"}
              onChange={(e) => handleChange("textColor", e.target.value)}
              style={{ width: 44, height: 36, padding: 0, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }}
            />
            <InputText
              value={textColor}
              onChange={(e) => handleChange("textColor", e.target.value)}
              placeholder="#ffffff atau kosongkan"
              className="form-input"
              style={{ flex: 1, minWidth: 140 }}
            />
            <button
              type="button"
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
              onClick={() => handleChange("textColor", "")}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Sudut membulat (px)</label>
          <InputNumber
            value={borderRadius}
            onValueChange={(e) => handleChange("borderRadius", e.value)}
            min={0}
            max={48}
            placeholder="Default 6"
            showButtons
            className="w-full"
          />
        </div>

        <div className="form-field-group" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <InputSwitch checked={fullWidth} onChange={(e) => handleChange("fullWidth", e.value)} />
          <label className="form-label-small" style={{ margin: 0, cursor: "pointer" }} onClick={() => handleChange("fullWidth", !fullWidth)}>
            Lebar penuh (100%)
          </label>
        </div>

        <div className="form-field-group" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <InputSwitch checked={fixedBottom} onChange={(e) => handleChange("fixedBottom", e.value)} />
          <label className="form-label-small" style={{ margin: 0, cursor: "pointer" }} onClick={() => handleChange("fixedBottom", !fixedBottom)}>
            Fixed di bawah layar
          </label>
        </div>
      </div>
    </ComponentWrapper>
  );
}
