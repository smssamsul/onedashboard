"use client";

import { useState } from "react";
import { InputTextarea } from "primereact/inputtextarea";
import { InputSwitch } from "primereact/inputswitch";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { 
  Bold, Italic, Underline, Strikethrough, 
  Subscript, Link, List, ListOrdered, 
  AlignLeft, AlignRight, Image as ImageIcon, Smile,
  ChevronDown as ChevronDownIcon
} from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function TextComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const content = data.content || "Text Baru";
  const darkEditor = data.darkEditor || false;
  const fontSize = data.fontSize || 16;
  const lineHeight = data.lineHeight || 1.5;
  const fontFamily = data.fontFamily || "Page Font";
  const [showAdvance, setShowAdvance] = useState(false);

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  const paragraphStyles = [
    { label: "Normal", value: "normal" },
    { label: "Heading 1", value: "h1" },
    { label: "Heading 2", value: "h2" },
    { label: "Heading 3", value: "h3" },
  ];

  return (
    <ComponentWrapper
      title="Text"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      {/* Toggle Dark Editor */}
      <div className="text-editor-toggle">
        <span>Background Editor Gelap</span>
        <InputSwitch
          checked={darkEditor}
          onChange={(e) => handleChange("darkEditor", e.value)}
        />
      </div>

      {/* Formatting Toolbar */}
      <div className="text-editor-toolbar">
        {/* Top Row */}
        <div className="toolbar-row">
          <button className="toolbar-btn" title="Bold">
            <Bold size={16} />
          </button>
          <button className="toolbar-btn" title="Italic">
            <Italic size={16} />
          </button>
          <button className="toolbar-btn" title="Text Color">
            <span style={{ textDecoration: 'underline' }}>A</span>
            <ChevronDownIcon size={12} />
          </button>
          <button className="toolbar-btn" title="Strikethrough">
            <Strikethrough size={16} />
          </button>
          <button className="toolbar-btn" title="Underline">
            <Underline size={16} />
          </button>
          <button className="toolbar-btn" title="Superscript">
            <Subscript size={16} />
          </button>
          <button className="toolbar-btn" title="Link">
            <Link size={16} />
          </button>
          <button className="toolbar-btn" title="Bullet List">
            <List size={16} />
          </button>
          <button className="toolbar-btn" title="Numbered List">
            <ListOrdered size={16} />
          </button>
          <button className="toolbar-btn" title="Indent">
            <AlignRight size={16} />
          </button>
          <button className="toolbar-btn" title="Outdent">
            <AlignLeft size={16} />
          </button>
        </div>

        {/* Middle Row */}
        <div className="toolbar-row">
          <Dropdown
            value={data.paragraphStyle || "normal"}
            options={paragraphStyles}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => handleChange("paragraphStyle", e.value)}
            className="toolbar-dropdown"
            placeholder="Normal"
          />
          <div className="toolbar-input-group">
            <InputNumber
              value={fontSize}
              onValueChange={(e) => handleChange("fontSize", e.value)}
              min={8}
              max={72}
              suffix="px"
              className="toolbar-input"
            />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="toolbar-row">
          <span className="toolbar-label">{fontFamily}</span>
          <div className="toolbar-input-group">
            <InputNumber
              value={lineHeight}
              onValueChange={(e) => handleChange("lineHeight", e.value)}
              min={0.5}
              max={3}
              step={0.1}
              className="toolbar-input"
            />
          </div>
          <button className="toolbar-btn" title="Insert Image">
            <ImageIcon size={16} />
          </button>
          <button className="toolbar-btn" title="Insert Emoji">
            <Smile size={16} />
          </button>
        </div>
      </div>

      {/* Text Editor Area */}
      <div className={`text-editor-area ${darkEditor ? 'dark' : ''}`}>
        <InputTextarea
          value={content}
          onChange={(e) => handleChange("content", e.target.value)}
          placeholder="Masukkan teks..."
          rows={8}
          className="w-full text-editor-textarea"
        />
      </div>

      {/* Advance Section */}
      <div className="component-advance-section">
        <button 
          className="component-advance-toggle"
          onClick={() => setShowAdvance(!showAdvance)}
        >
          <span>Advance</span>
          <ChevronDownIcon 
            size={16} 
            className={showAdvance ? "rotate-180" : ""}
          />
        </button>
        
        {showAdvance && (
          <div className="component-advance-content">
            <div className="form-field-group">
              <label className="form-label-small">Font Family</label>
              <input
                type="text"
                value={fontFamily}
                onChange={(e) => handleChange("fontFamily", e.target.value)}
                className="w-full form-input"
              />
            </div>
          </div>
        )}
      </div>
    </ComponentWrapper>
  );
}

