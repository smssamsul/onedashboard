"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputSwitch } from "primereact/inputswitch";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { 
  Trash2, ChevronDown as ChevronDownIcon, ChevronUp,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link,
  Monitor, Tablet, Smartphone,
  X, CheckCircle2, Circle, Minus, ArrowRight, ArrowRightCircle,
  ArrowLeft, ArrowLeftRight, ChevronRight, CheckSquare, ShieldCheck,
  Lock, Dot, Target, Link as LinkIcon, PlusCircle, MinusCircle,
  Check, Star, Heart, ThumbsUp, Award, Zap, Flame, Sparkles,
  ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle, PlayCircle,
  PauseCircle, StopCircle, Radio, Square, Hexagon, Triangle,
  AlertCircle, Info, HelpCircle, Ban, Shield, Key, Unlock,
  Image as ImageIcon, Smile, MapPin, Calendar, Clock
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

// Icon options - banyak icon seperti di gambar
const ICON_OPTIONS = [
  { name: "CheckCircle2", component: CheckCircle2 },
  { name: "Circle", component: Circle },
  { name: "Minus", component: Minus },
  { name: "ArrowRight", component: ArrowRight },
  { name: "ArrowRightCircle", component: ArrowRightCircle },
  { name: "ArrowLeft", component: ArrowLeft },
  { name: "ArrowLeftRight", component: ArrowLeftRight },
  { name: "ChevronRight", component: ChevronRight },
  { name: "CheckSquare", component: CheckSquare },
  { name: "ShieldCheck", component: ShieldCheck },
  { name: "Lock", component: Lock },
  { name: "Dot", component: Dot },
  { name: "Target", component: Target },
  { name: "Link", component: LinkIcon },
  { name: "PlusCircle", component: PlusCircle },
  { name: "MinusCircle", component: MinusCircle },
  { name: "Check", component: Check },
  { name: "X", component: X },
  { name: "Star", component: Star },
  { name: "Heart", component: Heart },
  { name: "ThumbsUp", component: ThumbsUp },
  { name: "Award", component: Award },
  { name: "Zap", component: Zap },
  { name: "Flame", component: Flame },
  { name: "Sparkles", component: Sparkles },
  { name: "ArrowUp", component: ArrowUp },
  { name: "ArrowDown", component: ArrowDown },
  { name: "ArrowUpCircle", component: ArrowUpCircle },
  { name: "ArrowDownCircle", component: ArrowDownCircle },
  { name: "PlayCircle", component: PlayCircle },
  { name: "PauseCircle", component: PauseCircle },
  { name: "StopCircle", component: StopCircle },
  { name: "Radio", component: Radio },
  { name: "Square", component: Square },
  { name: "Hexagon", component: Hexagon },
  { name: "Triangle", component: Triangle },
  { name: "AlertCircle", component: AlertCircle },
  { name: "Info", component: Info },
  { name: "HelpCircle", component: HelpCircle },
  { name: "Ban", component: Ban },
  { name: "Shield", component: Shield },
  { name: "Key", component: Key },
  { name: "Unlock", component: Unlock },
  { name: "MapPin", component: MapPin },
  { name: "Calendar", component: Calendar },
  { name: "Clock", component: Clock },
];

// Preset colors untuk icon
const PRESET_ICON_COLORS = [
  "#374151", // Dark grey
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#F1A124", // Orange
];

// Preset colors untuk text editor (sama seperti TextComponent)
const presetColors = [
  "#FF9900", // Primary color
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080",
  "#FF9999", "#99FF99", "#9999FF", "#FFFF99", "#FF99FF", "#99FFFF", "#FFCC99", "#CC99FF"
];

// ListItemEditor Component - Tiptap editor for each list item
function ListItemEditor({ itemIndex, content, onUpdate, onEditorReady }) {
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
      const html = editor.getHTML();
      onUpdate?.(html);
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor list-item-editor',
        style: `
          min-height: 100px;
          padding: 12px 14px;
          text-align: left;
          direction: ltr;
          unicode-bidi: normal;
        `,
      },
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Update content when prop changes externally
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== content && content !== '<p></p>') {
        editor.commands.setContent(content || '<p></p>');
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}

export default function ListComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const items = data.items || [];
  const componentTitle = data.componentTitle || "";
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showIconPicker, setShowIconPicker] = useState({});
  const [showAdvance, setShowAdvance] = useState(false);
  
  // State untuk setiap editor (per item index)
  const [editorStates, setEditorStates] = useState({});
  const [showColorPicker, setShowColorPicker] = useState({});
  const [showBgColorPicker, setShowBgColorPicker] = useState({});
  const [showMoreColors, setShowMoreColors] = useState({});
  const [showMoreBgColors, setShowMoreBgColors] = useState({});
  
  // Refs untuk setiap editor
  const editorRefs = useRef({}); // Tiptap editor instances
  const textColorButtonRefs = useRef({});
  const bgColorButtonRefs = useRef({});
  const lastUsedStylesRefs = useRef({}); // Legacy ref untuk backward compatibility
  const savedSelectionRefs = useRef({}); // Legacy ref untuk backward compatibility (tidak digunakan lagi dengan Tiptap)
  
  // State untuk setiap editor (per item index)
  const [currentTextColors, setCurrentTextColors] = useState({});
  const [currentBgColors, setCurrentBgColors] = useState({});
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedBgColors, setSelectedBgColors] = useState({});
  const [currentBoldStates, setCurrentBoldStates] = useState({});
  const [currentUnderlineStates, setCurrentUnderlineStates] = useState({});
  const [currentItalicStates, setCurrentItalicStates] = useState({});
  const [currentStrikethroughStates, setCurrentStrikethroughStates] = useState({});
  
  // Helper function to get or create editor for an item
  const getEditor = (itemIndex) => {
    if (!editorRefs.current[itemIndex]) {
      // Editor will be created via useEditor in a separate component
      // For now, return null and we'll create editors in useEffect
      return null;
    }
    return editorRefs.current[itemIndex];
  };
  
  // Advance settings
  const paddingTop = data.paddingTop || 0;
  const paddingRight = data.paddingRight || 0;
  const paddingBottom = data.paddingBottom || 0;
  const paddingLeft = data.paddingLeft || 0;
  const bgType = data.bgType || "none";
  const bgColor = data.bgColor || "#ffffff";
  const bgImage = data.bgImage || "";
  const deviceView = data.deviceView || "desktop";
  const componentId = data.componentId || `list-${Date.now()}`;

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  const addItem = () => {
    const newIndex = items.length;
    const newItems = [...items, { 
      nama: "",
      content: "<p></p>",
      icon: "CheckCircle2",
      iconColor: "#10b981"
    }];
    onUpdate?.({ ...data, items: newItems });
    
    // Initialize editor state for new item
    initializeEditorState(newIndex);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate?.({ ...data, items: newItems });
  };

  const updateItem = (index, field, value, immediate = false) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Use flushSync for immediate canvas update when needed
    if (immediate) {
      flushSync(() => {
        onUpdate?.({ ...data, items: newItems });
      });
    } else {
      onUpdate?.({ ...data, items: newItems });
    }
  };

  const toggleItemExpand = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const toggleIconPicker = (index) => {
    setShowIconPicker(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Close icon picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.icon-picker-trigger') && !event.target.closest('.icon-picker-grid')) {
        setShowIconPicker({});
      }
    };

    if (Object.values(showIconPicker).some(v => v)) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showIconPicker]);

  // Initialize editor states for all items
  useEffect(() => {
    items.forEach((_, i) => {
      initializeEditorState(i);
    });
  }, [items.length]);
  
  // Cleanup editors when items are removed
  useEffect(() => {
    return () => {
      // Cleanup Tiptap editors when component unmounts or items are removed
      Object.keys(editorRefs.current).forEach(itemIndex => {
        const index = parseInt(itemIndex);
        if (index >= items.length) {
          // Item was removed, cleanup its editor
          if (editorRefs.current[itemIndex]) {
            editorRefs.current[itemIndex].destroy();
            delete editorRefs.current[itemIndex];
          }
        }
      });
    };
  }, [items.length]);

  // Detect styles from selection/cursor - simple version using queryCommandState
  const detectStyles = (itemIndex) => {
    const editor = document.getElementById(`list-editor-${itemIndex}`);
    if (!editor) return;
    
    // Ensure LTR
    editor.setAttribute("dir", "ltr");
    editor.style.direction = "ltr";
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    
    // Use queryCommandState for simple detection
    const isBold = document.queryCommandState("bold");
    const isItalic = document.queryCommandState("italic");
    const isUnderline = document.queryCommandState("underline");
    const isStrikethrough = document.queryCommandState("strikeThrough");
    
    // For color and font size, still use computed style
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    
    const computedStyle = window.getComputedStyle(node);
    
    // Detect color
    const color = computedStyle.color || node.style.color || "#000000";
    const colorHex = colorToHex(color);
    
    // Detect background color
    const bgColor = computedStyle.backgroundColor || node.style.backgroundColor || "transparent";
    const bgColorHex = bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent" ? "transparent" : colorToHex(bgColor);
    
    // Detect font size
    const fontSize = computedStyle.fontSize || node.style.fontSize || "16px";
    const fontSizeNum = parseInt(fontSize);
    
    // Update displayed state (UI only)
    updateEditorState(itemIndex, {
      currentBold: isBold,
      currentItalic: isItalic,
      currentUnderline: isUnderline,
      currentStrikethrough: isStrikethrough,
      currentTextColor: colorHex,
      currentBgColor: bgColorHex,
      displayedFontSize: fontSizeNum || 16
    });
    
    // Update button visuals
    const boldBtn = editor.parentElement?.querySelector('.toolbar-btn[title="Bold"]');
    if (boldBtn) {
      if (isBold) {
        boldBtn.classList.add('active');
        boldBtn.style.setProperty('background-color', '#F1A124', 'important');
        boldBtn.style.setProperty('border-color', '#F1A124', 'important');
        boldBtn.style.setProperty('color', '#ffffff', 'important');
      } else {
        boldBtn.classList.remove('active');
        boldBtn.className = 'toolbar-btn';
        boldBtn.style.removeProperty('background-color');
        boldBtn.style.removeProperty('border-color');
        boldBtn.style.removeProperty('color');
      }
    }
    
    const italicBtn = editor.parentElement?.querySelector('.toolbar-btn[title="Italic"]');
    if (italicBtn) {
      if (isItalic) {
        italicBtn.classList.add('active');
        italicBtn.style.setProperty('background-color', '#F1A124', 'important');
        italicBtn.style.setProperty('border-color', '#F1A124', 'important');
        italicBtn.style.setProperty('color', '#ffffff', 'important');
      } else {
        italicBtn.classList.remove('active');
        italicBtn.className = 'toolbar-btn';
        italicBtn.style.removeProperty('background-color');
        italicBtn.style.removeProperty('border-color');
        italicBtn.style.removeProperty('color');
      }
    }
    
    const underlineBtn = editor.parentElement?.querySelector('.toolbar-btn[title="Underline"]');
    if (underlineBtn) {
      if (isUnderline) {
        underlineBtn.classList.add('active');
        underlineBtn.style.setProperty('background-color', '#F1A124', 'important');
        underlineBtn.style.setProperty('border-color', '#F1A124', 'important');
        underlineBtn.style.setProperty('color', '#ffffff', 'important');
      } else {
        underlineBtn.classList.remove('active');
        underlineBtn.className = 'toolbar-btn';
        underlineBtn.style.removeProperty('background-color');
        underlineBtn.style.removeProperty('border-color');
        underlineBtn.style.removeProperty('color');
      }
    }
    
    const strikethroughBtn = editor.parentElement?.querySelector('.toolbar-btn[title="Strikethrough"]');
    if (strikethroughBtn) {
      if (isStrikethrough) {
        strikethroughBtn.classList.add('active');
        strikethroughBtn.style.setProperty('background-color', '#F1A124', 'important');
        strikethroughBtn.style.setProperty('border-color', '#F1A124', 'important');
        strikethroughBtn.style.setProperty('color', '#ffffff', 'important');
      } else {
        strikethroughBtn.classList.remove('active');
        strikethroughBtn.className = 'toolbar-btn';
        strikethroughBtn.style.removeProperty('background-color');
        strikethroughBtn.style.removeProperty('border-color');
        strikethroughBtn.style.removeProperty('color');
      }
    }
  };
  
  // Helper: Convert RGB to Hex
  const colorToHex = (color) => {
    if (color.startsWith("#")) return color;
    if (color === "transparent" || color === "rgba(0, 0, 0, 0)") return "transparent";
    
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
    
    return color;
  };

  // Simple text editor handlers - independent from TextComponent
  // ProseMirror handles input automatically via dispatchTransaction
  // This function is kept for backward compatibility but no longer needed
  const handleEditorInput = (index) => {
    // ProseMirror handles content updates automatically in dispatchTransaction
    // No manual handling needed
  };

  // ProseMirror handles keydown automatically via keymap plugins
  // This function is kept for backward compatibility but no longer needed
  const handleEditorKeyDown = (index, e) => {
    // ProseMirror handles keyboard events via keymap plugins
    // No manual handling needed
  };

  // Initialize editor state for an item
  const initializeEditorState = (itemIndex) => {
    if (!editorStates[itemIndex]) {
      setEditorStates(prev => ({
        ...prev,
        [itemIndex]: {
          activeFontSize: 16,
          activeColor: "#000000",
          activeBgColor: "transparent",
          activeBold: false,
          activeItalic: false,
          activeUnderline: false,
          activeStrikethrough: false,
          currentBold: false,
          currentItalic: false,
          currentUnderline: false,
          currentStrikethrough: false,
          currentTextColor: "#000000",
          currentBgColor: "transparent",
          displayedFontSize: 16,
          selectedColor: "#000000",
          selectedBgColor: "#FFFF00"
        }
      }));
      
      if (!lastUsedStylesRefs.current[itemIndex]) {
        lastUsedStylesRefs.current[itemIndex] = {
          fontSize: 16,
          color: "#000000",
          backgroundColor: "transparent",
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none"
        };
      }
    }
  };
  
  // Get editor state helper
  const getEditorState = (itemIndex) => {
    // Get state from new state objects
    return {
      currentBold: currentBoldStates[itemIndex] || false,
      currentItalic: currentItalicStates[itemIndex] || false,
      currentUnderline: currentUnderlineStates[itemIndex] || false,
      currentStrikethrough: currentStrikethroughStates[itemIndex] || false,
      currentTextColor: currentTextColors[itemIndex] || "#000000",
      currentBgColor: currentBgColors[itemIndex] || "transparent",
      selectedColor: selectedColors[itemIndex] || "#000000",
      selectedBgColor: selectedBgColors[itemIndex] || "#FFFF00",
      displayedFontSize: editorStates[itemIndex]?.displayedFontSize || 16,
      ...editorStates[itemIndex]
    };
  };
  
  // Legacy getEditorState - keeping for backward compatibility
  const getEditorStateOld = (itemIndex) => {
    initializeEditorState(itemIndex);
    return editorStates[itemIndex] || {
      activeFontSize: 16,
      activeColor: "#000000",
      activeBgColor: "transparent",
      activeBold: false,
      activeItalic: false,
      activeUnderline: false,
      activeStrikethrough: false,
      currentBold: false,
      currentItalic: false,
      currentUnderline: false,
      currentStrikethrough: false,
      currentTextColor: "#000000",
      currentBgColor: "transparent",
      displayedFontSize: 16,
      selectedColor: "#000000",
      selectedBgColor: "#FFFF00"
    };
  };
  
  // Update editor state helper
  const updateEditorState = (itemIndex, updates) => {
    setEditorStates(prev => ({
      ...prev,
      [itemIndex]: { ...getEditorState(itemIndex), ...updates }
    }));
  };
  
  // Save selection for an editor
  const saveSelection = (itemIndex) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const editor = document.getElementById(`list-editor-${itemIndex}`);
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedSelectionRefs.current[itemIndex] = {
          range: range.cloneRange(),
          startContainer: range.startContainer,
          startOffset: range.startOffset,
          endContainer: range.endContainer,
          endOffset: range.endOffset,
          collapsed: range.collapsed,
          text: range.toString()
        };
      }
    }
  };
  
  // Restore selection for an editor
  const restoreSelection = (itemIndex) => {
    const saved = savedSelectionRefs.current[itemIndex];
    if (saved) {
      const selection = window.getSelection();
      const range = saved.range;
      try {
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // If range is invalid, try to recreate it
        try {
          const newRange = document.createRange();
          newRange.setStart(saved.startContainer, saved.startOffset);
          newRange.setEnd(saved.endContainer, saved.endOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e2) {
          // Selection restore failed
        }
      }
    }
  };
  
  // Tiptap toggle bold
  const toggleBold = (itemIndex, e) => {
    if (e) e.preventDefault();
    const editor = editorRefs.current[itemIndex];
    if (!editor) return;
    
    editor.chain().focus().toggleBold().run();
    
    // Update UI state
    setCurrentBoldStates(prev => ({
      ...prev,
      [itemIndex]: editor.isActive('bold')
    }));
  };
  
  const toggleItalic = (itemIndex, e) => {
    if (e) e.preventDefault();
    const editor = editorRefs.current[itemIndex];
    if (!editor) return;
    
    editor.chain().focus().toggleItalic().run();
    
    // Update UI state
    setCurrentItalicStates(prev => ({
      ...prev,
      [itemIndex]: editor.isActive('italic')
    }));
  };
  
  // Tiptap toggle underline
  const toggleUnderline = (itemIndex, e) => {
    if (e) e.preventDefault();
    const editor = editorRefs.current[itemIndex];
    if (!editor) return;
    
    editor.chain().focus().toggleUnderline().run();
    
    // Update UI state
    setCurrentUnderlineStates(prev => ({
      ...prev,
      [itemIndex]: editor.isActive('underline')
    }));
  };
  
  // Tiptap toggle strikethrough
  const toggleStrikethrough = (itemIndex, e) => {
    if (e) e.preventDefault();
    const editor = editorRefs.current[itemIndex];
    if (!editor) return;
    
    editor.chain().focus().toggleStrike().run();
    
    // Update UI state
    setCurrentStrikethroughStates(prev => ({
      ...prev,
      [itemIndex]: editor.isActive('strike')
    }));
  };
  
  // Apply text color using Tiptap
  const applyTextColor = (itemIndex, color) => {
    const editor = editorRefs.current[itemIndex];
    if (!editor) return;
    
    editor.chain().focus().setColor(color).run();
    
    flushSync(() => {
      setCurrentTextColors(prev => ({ ...prev, [itemIndex]: color }));
      setSelectedColors(prev => ({ ...prev, [itemIndex]: color }));
    });
    
    requestAnimationFrame(() => {
      if (textColorButtonRefs.current[itemIndex]) {
        const btn = textColorButtonRefs.current[itemIndex];
        const colorBar = btn.querySelector('.text-color-bar');
        if (colorBar) {
          colorBar.style.backgroundColor = color;
        }
      }
    });
    
    setShowColorPicker(prev => ({ ...prev, [itemIndex]: false }));
  };
  
  // Apply background color using Tiptap
  const applyBgColor = (itemIndex, color) => {
    const editor = editorRefs.current[itemIndex];
    if (!editor) return;
    
    const bgColorValue = color === "transparent" ? "transparent" : color;
    
    editor.chain().focus();
    
    if (color === "transparent") {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: color }).run();
    }
    
    flushSync(() => {
      setCurrentBgColors(prev => ({ ...prev, [itemIndex]: bgColorValue }));
      setSelectedBgColors(prev => ({ ...prev, [itemIndex]: color === "transparent" ? "#FFFF00" : color }));
    });
    
    requestAnimationFrame(() => {
      if (bgColorButtonRefs.current[itemIndex]) {
        const btn = bgColorButtonRefs.current[itemIndex];
        const bgColorBar = btn.querySelector('.bg-color-bar');
        if (bgColorBar) {
          bgColorBar.style.backgroundColor = color === "transparent" ? "#FFFF00" : color;
        }
      }
    });
    
    setShowBgColorPicker(prev => ({ ...prev, [itemIndex]: false }));
  };
  
  // Apply font size - simple version
  const applyFontSize = (itemIndex, size) => {
    const editor = document.getElementById(`list-editor-${itemIndex}`);
    if (!editor) return;
    
    // Ensure LTR
    editor.setAttribute("dir", "ltr");
    editor.style.direction = "ltr";
    
    editor.focus();
    restoreSelection(itemIndex);
    
    // Apply font size directly via style (no execCommand for more control)
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        // Selection: wrap content in span with font size
        const contents = range.extractContents();
        const span = document.createElement("span");
        span.style.fontSize = `${size}px`;
        span.setAttribute("dir", "ltr");
        span.style.direction = "ltr";
        span.style.unicodeBidi = "normal";
        span.appendChild(contents);
        range.insertNode(span);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Collapsed cursor: insert marker span
        const marker = document.createElement("span");
        marker.style.fontSize = `${size}px`;
        marker.setAttribute("dir", "ltr");
        marker.style.direction = "ltr";
        marker.style.unicodeBidi = "normal";
        marker.innerHTML = "\u200B";
        range.insertNode(marker);
        const newRange = document.createRange();
        newRange.setStart(marker, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    updateEditorState(itemIndex, {
      activeFontSize: size,
      displayedFontSize: size
    });
    
    // Immediately update content and canvas
    const html = editor.innerHTML;
    updateItem(itemIndex, "content", html, true);
    
    // Also call handleEditorInput for style detection
    requestAnimationFrame(() => {
      detectStyles(itemIndex);
    });
  };
  
  // Format selection (untuk command lain seperti link, list, dll)
  const formatSelection = (itemIndex, command, value = null) => {
    const editor = document.getElementById(`list-editor-${itemIndex}`);
    if (!editor) return;
    
    editor.focus();
    restoreSelection(itemIndex);
    document.execCommand(command, false, value);
    handleEditorInput(itemIndex);
  };

  return (
    <ComponentWrapper
      title="Daftar / List Point"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="list-component-content">
        {/* Judul Komponen */}
        <div className="form-field-group">
          <label className="form-label-small">Judul Komponen</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <InputText
              value={componentTitle || ""}
              onChange={(e) => handleChange("componentTitle", e.target.value)}
              placeholder="List"
              className="w-full form-input"
              style={{ flex: 1 }}
            />
            <input
              type="color"
              value={data.titleColor || "#000000"}
              onChange={(e) => handleChange("titleColor", e.target.value)}
              style={{ width: "40px", height: "40px", padding: "0", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", background: "none" }}
              title="Warna Judul"
            />
          </div>
        </div>

        {items.map((item, i) => {
          const isExpanded = expandedItems.has(i);
          const showPicker = showIconPicker[i] || false;
          const IconComponent = ICON_OPTIONS.find(opt => opt.name === item.icon)?.component || CheckCircle2;
          const iconColor = item.iconColor || "#10b981";
          
          return (
            <div key={i} className="list-item-editor-wrapper">
              {/* List Item Header */}
              <div 
                className="list-item-header"
                onClick={() => toggleItemExpand(i)}
              >
                <div className="list-item-header-left">
                  <ChevronDownIcon 
                    size={16} 
                    className={`list-item-chevron ${isExpanded ? "expanded" : ""}`}
                  />
                  <span className="list-item-label">Daftar {i + 1}</span>
                </div>
                <Button
                  icon={<Trash2 size={14} />}
                  severity="danger"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(i);
                  }}
                />
              </div>

              {/* List Item Content */}
              {isExpanded && (
                <div className="list-item-content">
                  {/* Item Label */}
                  <div className="form-field-group">
                    <label className="form-label-small">Item</label>
                    
                    {/* Rich Text Editor Toolbar - Sama seperti TextComponent */}
                    <div className="text-editor-toolbar">
                      {/* Row 1: Bold, Italic, Text Color, Background Color, Underline, Strikethrough, Link, Lists, Align */}
                      <div className="toolbar-row">
                        <button 
                          className={`toolbar-btn ${getEditorState(i).currentBold ? "active" : ""}`}
                          title="Bold"
                          onClick={(e) => toggleBold(i, e)}
                        >
                          <Bold size={16} />
                        </button>
                        <button 
                          className={`toolbar-btn ${getEditorState(i).currentItalic ? "active" : ""}`}
                          title="Italic"
                          onClick={(e) => toggleItalic(i, e)}
                        >
                          <Italic size={16} />
                        </button>
                        {/* Text Color Button */}
                        <div className="toolbar-color-picker-wrapper word-style-color-picker">
                        <button 
                            ref={(el) => { textColorButtonRefs.current[i] = el; }}
                            className={`toolbar-btn-text-color ${showColorPicker[i] ? "active" : ""}`}
                            title="Font Color"
                            onClick={() => {
                              setShowColorPicker(prev => ({ ...prev, [i]: !prev[i] }));
                              setShowMoreColors(prev => ({ ...prev, [i]: false }));
                            }}
                          >
                            <div className="text-color-button-content">
                              <span className="text-color-letter">A</span>
                              <div className="text-color-bar" style={{ backgroundColor: getEditorState(i).currentTextColor }}></div>
                            </div>
                            <ChevronDownIcon size={10} style={{ marginLeft: "4px" }} />
                          </button>
                          {showColorPicker[i] && (
                            <div className="word-color-picker-popup">
                              <div className="word-color-picker-header">Font Color</div>
                              <div className="word-color-preset-grid">
                                {presetColors.map((color, idx) => (
                                  <button
                                    key={idx}
                                    className={`word-color-preset-item ${getEditorState(i).selectedColor === color ? "selected" : ""}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => applyTextColor(i, color)}
                                    title={color}
                                  />
                                ))}
                              </div>
                              <div className="word-color-picker-divider"></div>
                              <button
                                className="word-color-more-btn"
                                onClick={() => {
                                  setShowMoreColors(prev => ({ ...prev, [i]: !prev[i] }));
                                }}
                              >
                                More Colors...
                              </button>
                              {showMoreColors[i] && (
                                <div className="word-color-more-panel">
                                  <div className="word-color-more-label">Custom Color</div>
                                  <input
                                    type="color"
                                    value={getEditorState(i).selectedColor}
                                    onChange={(e) => applyTextColor(i, e.target.value)}
                                    style={{ width: "100%", height: "40px", cursor: "pointer", marginBottom: "8px" }}
                                  />
                                  <input
                                    type="text"
                                    value={getEditorState(i).selectedColor}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === "") {
                                        applyTextColor(i, value || "#000000");
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
                        <div className="toolbar-color-picker-wrapper word-style-color-picker">
                          <button
                            ref={(el) => { bgColorButtonRefs.current[i] = el; }}
                            className={`toolbar-btn-bg-color ${showBgColorPicker[i] ? "active" : ""}`}
                            title="Text Highlight Color"
                            onClick={() => {
                              setShowBgColorPicker(prev => ({ ...prev, [i]: !prev[i] }));
                              setShowMoreBgColors(prev => ({ ...prev, [i]: false }));
                            }}
                          >
                            <div className="bg-color-button-content">
                              <span className="bg-color-letter">ab</span>
                              <div 
                                className="bg-color-bar" 
                                style={{ 
                                  backgroundColor: getEditorState(i).currentBgColor === "transparent" ? "#FFFF00" : getEditorState(i).currentBgColor
                                }}
                              ></div>
                            </div>
                            <ChevronDownIcon size={10} style={{ marginLeft: "4px" }} />
                          </button>
                          {showBgColorPicker[i] && (
                            <div className="word-color-picker-popup">
                              <div className="word-color-picker-header">Text Highlight Color</div>
                              <div className="word-color-preset-grid">
                                <button
                                  className={`word-color-preset-item ${getEditorState(i).currentBgColor === "transparent" ? "selected" : ""}`}
                                  style={{ 
                                    backgroundColor: "#f0f0f0",
                                    border: "1px solid #ccc",
                                    position: "relative"
                                  }}
                                  onClick={() => applyBgColor(i, "transparent")}
                                  title="No Color"
                                >
                                  <span style={{ fontSize: "10px", color: "#999" }}>×</span>
                                </button>
                                {presetColors.map((color, idx) => (
                                  <button
                                    key={idx}
                                    className={`word-color-preset-item ${getEditorState(i).selectedBgColor === color ? "selected" : ""}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => applyBgColor(i, color)}
                                    title={color}
                                  />
                                ))}
                              </div>
                              <div className="word-color-picker-divider"></div>
                              <button
                                className="word-color-more-btn"
                                onClick={() => {
                                  setShowMoreBgColors(prev => ({ ...prev, [i]: !prev[i] }));
                                }}
                              >
                                More Colors...
                              </button>
                              {showMoreBgColors[i] && (
                                <div className="word-color-more-panel">
                                  <div className="word-color-more-label">Custom Color</div>
                                  <input
                                    type="color"
                                    value={getEditorState(i).currentBgColor === "transparent" ? "#ffffff" : getEditorState(i).currentBgColor}
                                    onChange={(e) => applyBgColor(i, e.target.value)}
                                    style={{ width: "100%", height: "40px", cursor: "pointer", marginBottom: "8px" }}
                                  />
                                  <input
                                    type="text"
                                    value={getEditorState(i).currentBgColor === "transparent" ? "" : getEditorState(i).currentBgColor}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === "") {
                                        applyBgColor(i, "transparent");
                                      } else if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                        applyBgColor(i, value);
                                      }
                                    }}
                                    placeholder="Transparent atau #hex"
                                    className="word-color-hex-input"
                                    style={{ marginBottom: "8px" }}
                                  />
                                  <button 
                                    className="toolbar-transparent-btn"
                                    onClick={() => applyBgColor(i, "transparent")}
                                  >
                                    No Color
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <button 
                          className={`toolbar-btn ${getEditorState(i).currentUnderline ? "active" : ""}`}
                          title="Underline"
                          onClick={(e) => toggleUnderline(i, e)}
                        >
                          <Underline size={16} />
                        </button>
                        <button 
                          className={`toolbar-btn ${getEditorState(i).currentStrikethrough ? "active" : ""}`}
                          title="Strikethrough"
                          onClick={(e) => toggleStrikethrough(i, e)}
                        >
                          <Strikethrough size={16} />
                        </button>
                        <button 
                          className="toolbar-btn"
                          title="Link"
                          onClick={() => formatSelection(i, "createLink", prompt("Enter URL:"))}
                        >
                          <Link size={16} />
                        </button>
                        <button 
                          className="toolbar-btn"
                          title="Numbered List"
                          onClick={() => formatSelection(i, "insertOrderedList")}
                        >
                          <ListOrdered size={16} />
                        </button>
                        <button 
                          className="toolbar-btn"
                          title="Bullet List"
                          onClick={() => formatSelection(i, "insertUnorderedList")}
                        >
                          <List size={16} />
                        </button>
                        <div className="toolbar-align-group">
                          <button
                            className="toolbar-btn"
                            title="Align Left"
                            onClick={() => formatSelection(i, "justifyLeft")}
                          >
                            <AlignLeft size={16} />
                          </button>
                          <button
                            className="toolbar-btn"
                            title="Align Center"
                            onClick={() => formatSelection(i, "justifyCenter")}
                          >
                            <AlignCenter size={16} />
                          </button>
                          <button
                            className="toolbar-btn"
                            title="Align Right"
                            onClick={() => formatSelection(i, "justifyRight")}
                          >
                            <AlignRight size={16} />
                          </button>
                          <button
                            className="toolbar-btn"
                            title="Justify"
                            onClick={() => formatSelection(i, "justifyFull")}
                          >
                            <AlignJustify size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Row 2: Font Size */}
                      <div className="toolbar-row">
                        <div className="toolbar-input-group">
                          <InputNumber
                            value={getEditorState(i).displayedFontSize}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection(i);
                              requestAnimationFrame(() => {
                                e.target.focus();
                              });
                            }}
                            onFocus={() => saveSelection(i)}
                            onInput={(e) => {
                              const inputValue = e.target.value;
                              const value = parseFloat(inputValue);
                              if (!isNaN(value) && value >= 8 && value <= 200) {
                                const size = Math.round(value);
                                applyFontSize(i, size);
                              }
                            }}
                            onValueChange={(e) => {
                              const size = e.value || getEditorState(i).displayedFontSize;
                              if (size >= 8 && size <= 200) {
                                applyFontSize(i, size);
                              }
                            }}
                            onBlur={() => {
                              const size = getEditorState(i).displayedFontSize;
                              if (size >= 8 && size <= 200) {
                                applyFontSize(i, size);
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
                      </div>
                    </div>

                    {/* Rich Text Editor Area - Tiptap */}
                    <div className="text-editor-area">
                      <ListItemEditor
                        itemIndex={i}
                        content={item.content}
                        onUpdate={(html) => {
                          updateItem(i, "content", html, true);
                        }}
                        onEditorReady={(editor) => {
                          editorRefs.current[i] = editor;
                          
                          // Initialize color states from editor
                          const textStyleAttrs = editor.getAttributes('textStyle');
                          const highlightAttrs = editor.getAttributes('highlight');
                          const detectedTextColor = textStyleAttrs.color || "#000000";
                          const detectedBgColor = highlightAttrs.color || "transparent";
                          
                          setCurrentTextColors(prev => ({ ...prev, [i]: detectedTextColor }));
                          setCurrentBgColors(prev => ({ ...prev, [i]: detectedBgColor }));
                          setSelectedColors(prev => ({ ...prev, [i]: detectedTextColor }));
                          setSelectedBgColors(prev => ({ ...prev, [i]: detectedBgColor === "transparent" ? "#FFFF00" : detectedBgColor }));
                          
                          // Sync button states
                          setCurrentBoldStates(prev => ({ ...prev, [i]: editor.isActive('bold') }));
                          setCurrentItalicStates(prev => ({ ...prev, [i]: editor.isActive('italic') }));
                          setCurrentUnderlineStates(prev => ({ ...prev, [i]: editor.isActive('underline') }));
                          setCurrentStrikethroughStates(prev => ({ ...prev, [i]: editor.isActive('strike') }));
                          
                          // Setup sync for color changes
                          const updateColorFromSelection = () => {
                            try {
                              const textStyleAttrs = editor.getAttributes('textStyle');
                              const highlightAttrs = editor.getAttributes('highlight');
                              
                              const detectedTextColor = textStyleAttrs.color || "#000000";
                              const detectedBgColor = highlightAttrs.color || "transparent";
                              
                              setCurrentTextColors(prev => {
                                if (prev[i] !== detectedTextColor) {
                                  return { ...prev, [i]: detectedTextColor };
                                }
                                return prev;
                              });
                              
                              setCurrentBgColors(prev => {
                                if (prev[i] !== detectedBgColor) {
                                  return { ...prev, [i]: detectedBgColor };
                                }
                                return prev;
                              });
                              
                              setSelectedColors(prev => ({ ...prev, [i]: detectedTextColor }));
                              setSelectedBgColors(prev => ({ ...prev, [i]: detectedBgColor === "transparent" ? "#FFFF00" : detectedBgColor }));
                              
                              // Update button visuals
                              requestAnimationFrame(() => {
                                if (textColorButtonRefs.current[i]) {
                                  const colorBar = textColorButtonRefs.current[i].querySelector('.text-color-bar');
                                  if (colorBar) colorBar.style.backgroundColor = detectedTextColor;
                                }
                                if (bgColorButtonRefs.current[i]) {
                                  const bgColorBar = bgColorButtonRefs.current[i].querySelector('.bg-color-bar');
                                  if (bgColorBar) bgColorBar.style.backgroundColor = detectedBgColor === "transparent" ? "#FFFF00" : detectedBgColor;
                                }
                              });
                              
                              // Update button states
                              setCurrentBoldStates(prev => ({ ...prev, [i]: editor.isActive('bold') }));
                              setCurrentItalicStates(prev => ({ ...prev, [i]: editor.isActive('italic') }));
                              setCurrentUnderlineStates(prev => ({ ...prev, [i]: editor.isActive('underline') }));
                              setCurrentStrikethroughStates(prev => ({ ...prev, [i]: editor.isActive('strike') }));
                            } catch (e) {
                              console.error("Error updating color from selection:", e);
                            }
                          };
                          
                          editor.on('selectionUpdate', updateColorFromSelection);
                          editor.on('transaction', updateColorFromSelection);
                        }}
                      />
                    </div>
                  </div>

                  {/* Icon Picker Section */}
                  <div className="form-field-group">
                    <label className="form-label-small">Pilih Icon</label>
                    
                    {/* Color Swatches */}
                    <div className="icon-color-swatches">
                      {PRESET_ICON_COLORS.map((color, idx) => (
                        <button
                          key={idx}
                          className={`icon-color-swatch ${iconColor === color ? "selected" : ""}`}
                          style={{ 
                            backgroundColor: color,
                            border: iconColor === color ? "2px solid #F1A124" : "1px solid #e5e7eb"
                          }}
                          onClick={() => updateItem(i, "iconColor", color)}
                          title={color}
                        />
                      ))}
                    </div>

                    {/* Icon Picker Button */}
                    <button
                      className="icon-picker-trigger"
                      onClick={() => toggleIconPicker(i)}
                    >
                      <IconComponent size={20} style={{ color: iconColor }} />
                      <ChevronDownIcon size={14} />
                    </button>

                    {/* Icon Grid */}
                    {showPicker && (
                      <div className="icon-picker-grid">
                        {ICON_OPTIONS.map((iconOpt, idx) => {
                          const IconOptComponent = iconOpt.component;
                          return (
                            <button
                              key={idx}
                              className={`icon-picker-item ${item.icon === iconOpt.name ? "selected" : ""}`}
                              onClick={() => {
                                updateItem(i, "icon", iconOpt.name);
                                setShowIconPicker(prev => ({ ...prev, [i]: false }));
                              }}
                              title={iconOpt.name}
                            >
                              <IconOptComponent size={20} style={{ color: iconColor }} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <Button
          label="+ Tambah Daftar"
          icon="pi pi-plus"
          size="small"
          onClick={addItem}
          className="add-item-btn"
        />
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
                  placeholder="list-area-87nnmcFZXQ"
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
