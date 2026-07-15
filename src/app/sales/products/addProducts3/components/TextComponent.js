"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { InputTextarea } from "primereact/inputtextarea";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import {
  Bold, Italic, Underline, Strikethrough,
  Subscript, Superscript, Link, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Smile,
  ChevronDown as ChevronDownIcon, ChevronUp,
  X, Monitor, Tablet, Smartphone
} from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

// Tiptap imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from './extensions/FontSize';

export default function TextComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const content = data.content || "<p>Text Baru</p>";
  const darkEditor = data.darkEditor || false;
  const lineHeightRaw = data.lineHeight;
  const lineHeight =
    Number.isFinite(Number(lineHeightRaw)) && Number(lineHeightRaw) > 0
      ? Number(lineHeightRaw)
      : 1.5;
  const fontFamily = data.fontFamily || "Page Font";
  const textColor = data.textColor || "#000000";
  const backgroundColor = data.backgroundColor || "transparent";
  const textAlign = data.textAlign || "left";
  const fontWeight = data.fontWeight || "normal";
  const fontStyle = data.fontStyle || "normal";
  const textDecoration = data.textDecoration || "none";
  const textTransform = data.textTransform || "none";
  const letterSpacingRaw = data.letterSpacing;
  const letterSpacing = Number.isFinite(Number(letterSpacingRaw)) ? Number(letterSpacingRaw) : 0;
  const wordSpacingRaw = data.wordSpacing;
  const wordSpacing = Number.isFinite(Number(wordSpacingRaw)) ? Number(wordSpacingRaw) : 0;

  // Advance settings
  const paddingTop = data.paddingTop || 0;
  const paddingRight = data.paddingRight || 0;
  const paddingBottom = data.paddingBottom || 0;
  const paddingLeft = data.paddingLeft || 0;
  const marginTop = data.marginTop ?? 0;
  const marginBottom = data.marginBottom ?? 0;
  const bgType = data.bgType || "none"; // none, color, image
  const bgColor = data.bgColor || "#ffffff";
  const bgImage = data.bgImage || "";
  const deviceView = data.deviceView || "desktop";
  const componentId = data.componentId || `text-${Date.now()}`;

  const [showAdvance, setShowAdvance] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showMoreColors, setShowMoreColors] = useState(false);
  const [showMoreBgColors, setShowMoreBgColors] = useState(false);

  // ✅ FIX: Gunakan Ref untuk menghindari stale closure pada Tiptap - Sangat penting agar mirroring real-time!
  const onUpdateRef = useRef(onUpdate);
  const dataRef = useRef(data);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    dataRef.current = data;
  }, [onUpdate, data]);

  // ✅ FIX: handleChange yang seseuai dengan arsitektur parent (parent yang melakukan merge)
  // Tidak perlu lagi merge { ...dataRef.current } karena bisa menyebabkan race condition / stale data
  const handleChange = (field, value) => {
    onUpdateRef.current?.({ [field]: value });
  };

  // ===== SINGLE SOURCE OF TRUTH: Active Style State (MS Word Style) =====
  const [activeFontSize, setActiveFontSize] = useState(16);
  const [activeFontFamily, setActiveFontFamily] = useState("Page Font");
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeBgColor, setActiveBgColor] = useState("transparent");
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeUnderline, setActiveUnderline] = useState(false);
  const [activeStrikethrough, setActiveStrikethrough] = useState(false);

  // UI State - untuk menampilkan style dari selection/cursor (read-only untuk UI)
  const [displayedFontSize, setDisplayedFontSize] = useState(16);
  const [displayedColor, setDisplayedColor] = useState("#000000");
  const [displayedBgColor, setDisplayedBgColor] = useState("transparent");
  const [displayedBold, setDisplayedBold] = useState(false);
  const [displayedItalic, setDisplayedItalic] = useState(false);
  const [displayedUnderline, setDisplayedUnderline] = useState(false);
  const [displayedStrikethrough, setDisplayedStrikethrough] = useState(false);

  // Legacy state untuk backward compatibility (akan dihapus bertahap)
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [selectedBgColor, setSelectedBgColor] = useState("#FFFF00");
  const [selectedFontSize, setSelectedFontSize] = useState(16);

  // Legacy current state untuk UI buttons (backward compatibility)
  const [currentBold, setCurrentBold] = useState(false);
  const [currentItalic, setCurrentItalic] = useState(false);
  const [currentUnderline, setCurrentUnderline] = useState(false);
  const [currentStrikethrough, setCurrentStrikethrough] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState("#000000");
  const [currentBgColor, setCurrentBgColor] = useState("transparent");

  const colorPickerRef = useRef(null);
  const bgColorPickerRef = useRef(null);
  const textColorButtonRef = useRef(null);
  const bgColorButtonRef = useRef(null);
  const boldButtonRef = useRef(null);
  const italicButtonRef = useRef(null);
  const underlineButtonRef = useRef(null);
  const strikethroughButtonRef = useRef(null);

  // Legacy refs (kept to avoid breakages if ref is passed, but unused internally now)
  const editorRef = useRef(null);
  const editorViewRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const lastUsedStylesRef = useRef({
    fontSize: 16,
    color: "#000000",
    backgroundColor: "transparent",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none"
  });

  // ===== TIPTAP EDITOR SETUP =====
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      // Export HTML on every change - Standard React update (batched)
      const html = editor.getHTML();
      handleChange("content", html);
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor',
        style: `
          min-height: 200px;
          padding: 12px 14px;
          line-height: ${lineHeight};
          letter-spacing: ${letterSpacing}px;
          word-spacing: ${wordSpacing}px;
          font-family: ${fontFamily !== "Page Font" ? fontFamily : "inherit"};
          color: ${textColor};
          text-align: ${textAlign};
          font-size: 16px;
        `,
      },
    },
  });

  // Update editor content when content prop changes externally
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== content) {
        editor.commands.setContent(content || '<p></p>');
      }
    }
  }, [content, editor]);

  // Update editor options when styling props change
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: 'rich-text-editor',
            style: `
              min-height: 200px;
              padding: 12px 14px;
              line-height: ${lineHeight};
              letter-spacing: ${letterSpacing}px;
              word-spacing: ${wordSpacing}px;
              font-family: ${fontFamily !== "Page Font" ? (fontFamily.includes(' ') && !fontFamily.startsWith("'") ? `'${fontFamily}'` : fontFamily) : "inherit"};
              color: ${textColor};
              text-align: ${textAlign};
              font-size: 16px;
            `,
          },
        },
      });
    }
  }, [editor, lineHeight, letterSpacing, wordSpacing, fontFamily, textColor, textAlign]);

  // Sync button state dengan editor selection (untuk color buttons)
  useEffect(() => {
    if (!editor) return;

    const updateColorFromSelection = () => {
      try {
        const textStyleAttrs = editor.getAttributes('textStyle');
        const highlightAttrs = editor.getAttributes('highlight');

        // 1. Detect Font Size
        if (textStyleAttrs.fontSize) {
          const size = parseInt(textStyleAttrs.fontSize);
          if (!isNaN(size)) {
            setDisplayedFontSize(size);
            setActiveFontSize(size);
            setSelectedFontSize(size);
          }
        } else {
          setDisplayedFontSize(16);
          setActiveFontSize(16);
          setSelectedFontSize(16);
        }

        // 2. Detect Font Family
        if (textStyleAttrs.fontFamily) {
          const family = textStyleAttrs.fontFamily.replace(/['"]/g, "");
          setActiveFontFamily(family);
        } else {
          setActiveFontFamily("Page Font");
        }

        // 3. Detect Text Color
        if (textStyleAttrs.color) {
          const color = textStyleAttrs.color;
          if (currentTextColor !== color) {
            setCurrentTextColor(color);
            setSelectedColor(color);
            setDisplayedColor(color);
            setActiveColor(color);
          }
        } else {
          const defaultColor = "#000000";
          if (currentTextColor !== defaultColor) {
            setCurrentTextColor(defaultColor);
            setSelectedColor(defaultColor);
            setDisplayedColor(defaultColor);
            setActiveColor(defaultColor);
          }
        }

        // 4. Detect Background Color (Highlight)
        if (highlightAttrs && highlightAttrs.color) {
          const bgColor = highlightAttrs.color;
          if (currentBgColor !== bgColor) {
            setCurrentBgColor(bgColor);
            setSelectedBgColor(bgColor);
            setDisplayedBgColor(bgColor);
            setActiveBgColor(bgColor);
          }
        } else {
          const defaultBgColor = "transparent";
          if (currentBgColor !== defaultBgColor) {
            setCurrentBgColor(defaultBgColor);
            setSelectedBgColor("#FFFF00");
            setDisplayedBgColor(defaultBgColor);
            setActiveBgColor(defaultBgColor);
          }
        }

        // 5. Detect Active Marks (Bold, Italic, etc)
        const isBold = editor.isActive('bold');
        const isItalic = editor.isActive('italic');
        const isUnderline = editor.isActive('underline');
        const isStrike = editor.isActive('strike');

        setDisplayedBold(isBold);
        setCurrentBold(isBold);
        setActiveBold(isBold);

        setDisplayedItalic(isItalic);
        setCurrentItalic(isItalic);
        setActiveItalic(isItalic);

        setDisplayedUnderline(isUnderline);
        setCurrentUnderline(isUnderline);
        setActiveUnderline(isUnderline);

        // 6. Detect Paragraph Style
        let pStyle = "normal";
        if (editor.isActive('heading', { level: 1 })) pStyle = "h1";
        else if (editor.isActive('heading', { level: 2 })) pStyle = "h2";
        else if (editor.isActive('heading', { level: 3 })) pStyle = "h3";

        // Update data state via handleChange without triggering infinite update
        if (data.paragraphStyle !== pStyle) {
          handleChange("paragraphStyle", pStyle);
        }

      } catch (e) {
        console.error("Error detecting styles from selection:", e);
      }
    };

    const handleUpdate = () => {
      updateColorFromSelection();
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    updateColorFromSelection();

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor, currentTextColor, currentBgColor]);

  // Preset colors
  const presetColors = [
    "#FF9900", "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
    "#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080",
    "#FF9999", "#99FF99", "#9999FF", "#FFFF99", "#FF99FF", "#99FFFF", "#FFCC99", "#CC99FF"
  ];

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
        setShowMoreColors(false);
      }
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(event.target)) {
        setShowBgColorPicker(false);
        setShowMoreBgColors(false);
      }
    };

    if (showColorPicker || showBgColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPicker, showBgColorPicker]);

  // handleChange moved up to handle Tiptap stale closure via Ref

  // ===== TYPOGRAPHY STANDARD =====
  const TYPOGRAPHY_STANDARD = {
    defaultFontSize: 16,
    defaultLineHeight: 1.5,
    defaultFontFamily: "Page Font",
    defaultColor: "#000000",
    paragraphMargin: "0 0 0 0",
  };

  // ===== TIPTAP HELPER FUNCTIONS (REPLACING LEGACY PROSEMIRROR CODE) =====
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleStrikethrough = () => editor?.chain().focus().toggleStrike().run();

  const applyTextColor = (color) => {
    editor?.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  };

  const applyBgColor = (color) => {
    if (color === 'transparent') {
      editor?.chain().focus().unsetHighlight().run();
    } else {
      editor?.chain().focus().toggleHighlight({ color: color }).run();
    }
    setShowBgColorPicker(false);
  };

  const applyFontSize = (size) => {
    editor?.chain().focus().setFontSize(`${size}px`).run();
  };

  const applyFontFamily = (font) => {
    // Check if font is default
    const isDefault = font === "Page Font";
    if (isDefault) {
      editor?.chain().focus().unsetFontFamily().run();
    } else {
      editor?.chain().focus().setFontFamily(font).run();
    }
  };

  const formatSelection = (command, value) => {
    if (!editor) return;

    switch (command) {
      case 'createLink':
        if (value) {
          editor.chain().focus().setLink({ href: value }).run();
        } else {
          editor.chain().focus().unsetLink().run();
        }
        break;
      case 'insertOrderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'insertUnorderedList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'insertImage':
        if (value) {
          editor.chain().focus().setImage({ src: value }).run();
        }
        break;
      default:
        console.warn(`Unknown format command: ${command}`);
    }
  };

  const paragraphStyles = [
    { label: "Normal", value: "normal" },
    { label: "Heading 1", value: "h1" },
    { label: "Heading 2", value: "h2" },
    { label: "Heading 3", value: "h3" },
  ];

  const fontFamilyOptions = [
    { label: "Page Font", value: "Page Font" },
    { label: "Arial", value: "Arial" },
    { label: "Helvetica", value: "Helvetica" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Georgia", value: "Georgia" },
    { label: "Verdana", value: "Verdana" },
    { label: "Courier New", value: "Courier New" },
    { label: "Roboto", value: "Roboto" },
    { label: "Open Sans", value: "Open Sans" },
    { label: "Lato", value: "Lato" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Poppins", value: "Poppins" },
  ];

  const textAlignOptions = [
    { label: "Kiri", value: "left", icon: AlignLeft },
    { label: "Tengah", value: "center", icon: AlignCenter },
    { label: "Kanan", value: "right", icon: AlignRight },
    { label: "Rata Kiri-Kanan", value: "justify", icon: AlignJustify },
  ];

  return (
    <ComponentWrapper
      title="Text"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      {/* Toggle Dark Editor */}
      <div className="text-editor-toggle">
        <span>Background Editor Gelap</span>
        <InputSwitch
          checked={darkEditor}
          onChange={(e) => handleChange("darkEditor", e.value)}
        />
      </div>

      {/* Formatting Toolbar - Simple Layout */}
      <div className="text-editor-toolbar">
        {/* Row 1: Bold, Italic, Text Color, Background Color, Underline, Strikethrough, Link, Lists, Align */}
        <div className="toolbar-row">
          <button
            className={`toolbar-btn ${editor?.isActive('bold') ? "active" : ""}`}
            title="Bold"
            onClick={toggleBold}
            disabled={!editor}
          >
            <Bold size={16} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('italic') ? "active" : ""}`}
            title="Italic"
            onClick={toggleItalic}
            disabled={!editor}
          >
            <Italic size={16} />
          </button>
          {/* Text Color Button */}
          <div className="toolbar-color-picker-wrapper word-style-color-picker" ref={colorPickerRef}>
            <button
              ref={textColorButtonRef}
              className={`toolbar-btn-text-color ${showColorPicker ? "active" : ""}`}
              title="Font Color"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowMoreColors(false);
              }}
            >
              <div className="text-color-button-content">
                <span className="text-color-letter">A</span>
                <div className="text-color-bar" style={{ backgroundColor: currentTextColor }}></div>
              </div>
              <ChevronDownIcon size={10} style={{ marginLeft: "4px" }} />
            </button>
            {showColorPicker && (
              <div className="word-color-picker-popup">
                <div className="word-color-picker-header">Font Color</div>
                <div className="word-color-preset-grid">
                  {presetColors.map((color, idx) => (
                    <button
                      key={idx}
                      className={`word-color-preset-item ${selectedColor === color ? "selected" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => applyTextColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                <div className="word-color-picker-divider"></div>
                <button
                  className="word-color-more-btn"
                  onClick={() => {
                    setShowMoreColors(!showMoreColors);
                  }}
                >
                  More Colors...
                </button>
                {showMoreColors && (
                  <div className="word-color-more-panel">
                    <div className="word-color-more-label">Custom Color</div>
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => applyTextColor(e.target.value)}
                      style={{ width: "100%", height: "40px", cursor: "pointer", marginBottom: "8px" }}
                    />
                    <input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === "") {
                          applyTextColor(value || "#000000");
                        }
                      }}
                      placeholder="#000000"
                      className="word-color-hex-input"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Background Color Button */}
          <div className="toolbar-color-picker-wrapper word-style-color-picker" ref={bgColorPickerRef}>
            <button
              ref={bgColorButtonRef}
              className={`toolbar-btn-bg-color ${showBgColorPicker ? "active" : ""}`}
              title="Text Highlight Color"
              onClick={() => {
                setShowBgColorPicker(!showBgColorPicker);
                setShowMoreBgColors(false);
              }}
            >
              <div className="bg-color-button-content">
                <span className="bg-color-letter">ab</span>
                <div
                  className="bg-color-bar"
                  style={{
                    backgroundColor: currentBgColor === "transparent" ? "#FFFF00" : currentBgColor
                  }}
                ></div>
              </div>
              <ChevronDownIcon size={10} style={{ marginLeft: "4px" }} />
            </button>
            {showBgColorPicker && (
              <div className="word-color-picker-popup">
                <div className="word-color-picker-header">Text Highlight Color</div>
                <div className="word-color-preset-grid">
                  <button
                    className={`word-color-preset-item ${currentBgColor === "transparent" ? "selected" : ""}`}
                    style={{
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #ccc",
                      position: "relative"
                    }}
                    onClick={() => {
                      applyBgColor("transparent");
                    }}
                    title="No Color"
                  >
                    <span style={{ fontSize: "10px", color: "#999" }}>×</span>
                  </button>
                  {presetColors.map((color, idx) => (
                    <button
                      key={idx}
                      className={`word-color-preset-item ${selectedBgColor === color ? "selected" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => applyBgColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                <div className="word-color-picker-divider"></div>
                <button
                  className="word-color-more-btn"
                  onClick={() => {
                    setShowMoreBgColors(!showMoreBgColors);
                  }}
                >
                  More Colors...
                </button>
                {showMoreBgColors && (
                  <div className="word-color-more-panel">
                    <div className="word-color-more-label">Custom Color</div>
                    <input
                      type="color"
                      value={selectedBgColor === "transparent" ? "#ffffff" : selectedBgColor}
                      onChange={(e) => applyBgColor(e.target.value)}
                      style={{ width: "100%", height: "40px", cursor: "pointer", marginBottom: "8px" }}
                    />
                    <input
                      type="text"
                      value={selectedBgColor === "transparent" ? "" : selectedBgColor}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          applyBgColor("transparent");
                        } else if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          applyBgColor(value);
                        }
                      }}
                      placeholder="Transparent atau #hex"
                      className="word-color-hex-input"
                      style={{ marginBottom: "8px" }}
                    />
                    <button
                      className="toolbar-transparent-btn"
                      onClick={() => applyBgColor("transparent")}
                    >
                      No Color
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            className={`toolbar-btn ${editor?.isActive('underline') ? "active" : ""}`}
            title="Underline"
            onClick={toggleUnderline}
            disabled={!editor}
          >
            <Underline size={16} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('strike') ? "active" : ""}`}
            title="Strikethrough"
            onClick={toggleStrikethrough}
            disabled={!editor}
          >
            <Strikethrough size={16} />
          </button>
          <button
            className="toolbar-btn"
            title="Link"
            onClick={() => formatSelection("createLink", prompt("Enter URL:"))}
          >
            <Link size={16} />
          </button>
          <button
            className="toolbar-btn"
            title="Numbered List"
            onClick={() => formatSelection("insertOrderedList")}
          >
            <ListOrdered size={16} />
          </button>
          <button
            className="toolbar-btn"
            title="Bullet List"
            onClick={() => formatSelection("insertUnorderedList")}
          >
            <List size={16} />
          </button>
          <div className="toolbar-align-group">
            {textAlignOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  className={`toolbar-btn ${textAlign === option.value ? "active" : ""}`}
                  title={option.label}
                  onClick={() => handleChange("textAlign", option.value)}
                >
                  <IconComponent size={16} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Paragraph Style, Font Size */}
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
              value={displayedFontSize}
              onMouseDown={(e) => {
                e.preventDefault();
                // Tiptap handles focus better, removing saveSelection call
                editor?.commands.focus();
              }}
              onInput={(e) => {
                const inputValue = e.target.value;
                const value = parseFloat(inputValue);
                if (!isNaN(value) && value >= 8 && value <= 200) {
                  const size = Math.round(value);
                  setDisplayedFontSize(size);
                }
              }}
              onValueChange={(e) => {
                const size = e.value || displayedFontSize;
                if (size >= 8 && size <= 200) {
                  applyFontSize(size);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const inputValue = e.target.value;
                  const value = parseFloat(inputValue);
                  if (!isNaN(value) && value >= 8 && value <= 200) {
                    const size = Math.round(value);
                    applyFontSize(size);
                    e.target.focus();
                  }
                }
              }}
              onBlur={(e) => {
                const inputValue = e.target.value;
                const value = parseFloat(inputValue);
                if (!isNaN(value) && value >= 8 && value <= 200) {
                  const size = Math.round(value);
                  applyFontSize(size);
                } else {
                  setDisplayedFontSize(activeFontSize);
                }
              }}
              min={8}
              max={200}
              showButtons={true}
              suffix=" px"
              className="toolbar-input"
              placeholder="16"
              title="Font Size"
            />
          </div>
          <div className="toolbar-input-group" title="Jarak baris / line spacing (line-height)">
            <span className="toolbar-typography-mini-label">Jarak baris</span>
            <InputNumber
              value={lineHeight}
              onValueChange={(e) =>
                handleChange("lineHeight", e.value != null && e.value > 0 ? e.value : 1.5)
              }
              min={0.1}
              max={5}
              step={0.1}
              minFractionDigits={0}
              maxFractionDigits={2}
              className="toolbar-input toolbar-line-height-input"
            />
          </div>
        </div>

        {/* Row 3: Font Family, Line Height, Image, Emoji */}
        <div className="toolbar-row">
          <Dropdown
            value={fontFamily}
            options={fontFamilyOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => {
              handleChange("fontFamily", e.value);
              applyFontFamily(e.value);
            }}
            className="toolbar-dropdown"
            placeholder="Page Font"
          />
          <div className="toolbar-input-group" title="Jarak antar huruf (letter-spacing)">
            <span className="toolbar-typography-mini-label">Jarak huruf</span>
            <InputNumber
              value={letterSpacing}
              onValueChange={(e) => handleChange("letterSpacing", e.value != null ? e.value : 0)}
              min={-3}
              max={40}
              step={0.5}
              minFractionDigits={0}
              maxFractionDigits={2}
              className="toolbar-input toolbar-letter-spacing-input"
            />
            <span className="toolbar-input-suffix">px</span>
          </div>
          <div className="toolbar-input-group" title="Jarak antar kata (word-spacing)">
            <span className="toolbar-typography-mini-label">Jarak kata</span>
            <InputNumber
              value={wordSpacing}
              onValueChange={(e) => handleChange("wordSpacing", e.value != null ? e.value : 0)}
              min={-8}
              max={48}
              step={0.5}
              minFractionDigits={0}
              maxFractionDigits={2}
              className="toolbar-input toolbar-letter-spacing-input"
            />
            <span className="toolbar-input-suffix">px</span>
          </div>
          <button
            className="toolbar-btn"
            title="Insert Image"
            onClick={() => {
              const url = prompt("Enter image URL:");
              if (url) {
                formatSelection("insertImage", url);
              }
            }}
          >
            <ImageIcon size={16} />
          </button>
          <button
            className="toolbar-btn"
            title="Insert Emoji"
            onClick={() => {
              const emoji = prompt("Enter emoji:");
              if (emoji) {
                // Insert emoji using Tiptap command to ensure history tracking
                editor?.chain().focus().insertContent(emoji).run();
              }
            }}
          >
            <Smile size={16} />
          </button>
        </div>
      </div>

      {/* Rich Text Editor Area - Tiptap */}
      <div
        className={`text-editor-area ${darkEditor ? 'dark' : ''}`}
        style={{
          marginTop: `${Number(marginTop) || 0}px`,
          marginBottom: `${Number(marginBottom) || 0}px`,
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Advance Section */}
      <div className="component-advance-section">
        <button
          className="component-advance-toggle"
          onClick={() => setShowAdvance(!showAdvance)}
        >
          <span>Advance</span>
          {showAdvance ? <ChevronUp size={16} /> : <ChevronDownIcon size={16} />}
        </button>

        {showAdvance && (
          <div className="component-advance-content">
            {/* Desain - Background */}
            <div className="advance-section-group">
              <div className="advance-section-label">Desain</div>
              <div className="advance-section-sublabel">Latar (Background)</div>
              <div className="advance-bg-type-buttons">
                <button
                  className={`advance-bg-type-btn ${bgType === "none" ? "active" : ""}`}
                  onClick={() => handleChange("bgType", "none")}
                  title="No Background"
                >
                  <X size={18} />
                </button>
                <button
                  className={`advance-bg-type-btn ${bgType === "color" ? "active" : ""}`}
                  onClick={() => handleChange("bgType", "color")}
                  title="Warna"
                >
                  Warna
                </button>
                <button
                  className={`advance-bg-type-btn ${bgType === "image" ? "active" : ""}`}
                  onClick={() => handleChange("bgType", "image")}
                  title="Gambar"
                >
                  Gambar
                </button>
              </div>

              {bgType === "color" && (
                <div className="form-field-group" style={{ marginTop: "12px" }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => handleChange("bgColor", e.target.value)}
                    className="advance-color-input"
                  />
                  <InputText
                    value={bgColor}
                    onChange={(e) => handleChange("bgColor", e.target.value)}
                    placeholder="#ffffff"
                    className="w-full form-input"
                    style={{ marginTop: "8px" }}
                  />
                </div>
              )}

              {bgType === "image" && (
                <div className="form-field-group" style={{ marginTop: "12px" }}>
                  <InputText
                    value={bgImage}
                    onChange={(e) => handleChange("bgImage", e.target.value)}
                    placeholder="URL gambar"
                    className="w-full form-input"
                  />
                </div>
              )}
            </div>

            {/* Device View */}
            <div className="advance-section-group">
              <div className="advance-device-view-buttons">
                <button
                  className={`advance-device-btn ${deviceView === "desktop" ? "active" : ""}`}
                  onClick={() => handleChange("deviceView", "desktop")}
                  title="Desktop"
                >
                  <Monitor size={16} />
                  <span>Desktop</span>
                </button>
                <button
                  className={`advance-device-btn ${deviceView === "tablet" ? "active" : ""}`}
                  onClick={() => handleChange("deviceView", "tablet")}
                  title="Tablet"
                >
                  <Tablet size={16} />
                  <span>Tablet</span>
                </button>
                <button
                  className={`advance-device-btn ${deviceView === "mobile" ? "active" : ""}`}
                  onClick={() => handleChange("deviceView", "mobile")}
                  title="Mobile"
                >
                  <Smartphone size={16} />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Margin blok (jarak ke komponen lain) */}
            <div className="advance-section-group">
              <div className="advance-section-sublabel">Jarak teks atas dan bawah (margin luar)</div>
              <div className="advance-padding-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Margin atas</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={marginTop}
                      onValueChange={(e) => handleChange("marginTop", e.value != null ? e.value : 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Margin bawah</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={marginBottom}
                      onValueChange={(e) => handleChange("marginBottom", e.value != null ? e.value : 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Padding Settings */}
            <div className="advance-section-group">
              <div className="advance-padding-grid">
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Atas</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingTop}
                      onValueChange={(e) => handleChange("paddingTop", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Kanan</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingRight}
                      onValueChange={(e) => handleChange("paddingRight", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Bawah</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingBottom}
                      onValueChange={(e) => handleChange("paddingBottom", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
                <div className="advance-padding-item">
                  <label className="advance-padding-label">Padding Kiri</label>
                  <div className="advance-padding-input-wrapper">
                    <InputNumber
                      value={paddingLeft}
                      onValueChange={(e) => handleChange("paddingLeft", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-padding-input"
                    />
                    <span className="advance-padding-unit">px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Component ID */}
            <div className="advance-section-group">
              <div className="advance-section-label">Pengaturan Lainnya</div>
              <div className="form-field-group">
                <label className="form-label-small">
                  Component ID <span className="required">*</span>
                </label>
                <InputText
                  value={componentId}
                  onChange={(e) => handleChange("componentId", e.target.value)}
                  placeholder="text-area-87nnmcFZXQ"
                  className="w-full form-input"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ComponentWrapper>
  );
}
