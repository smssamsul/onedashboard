"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { convertToWebp } from "@/lib/image";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { 
  Bold, Italic, Underline, Strikethrough, 
  Link, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Smile,
  Pencil, Trash2, Eye, Star
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

// TestimoniItemEditor Component - Tiptap editor for each testimonial item
function TestimoniItemEditor({ itemIndex, content, onUpdate, onEditorReady }) {
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
        class: 'rich-text-editor testimoni-item-editor',
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

export default function TestimoniComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const componentTitle = data.componentTitle || "";
  const items = data.items || [];
  const [showImageActions, setShowImageActions] = useState({});
  const editorRefs = useRef({}); // Tiptap editor instances
  const [currentBoldStates, setCurrentBoldStates] = useState({});
  const [currentItalicStates, setCurrentItalicStates] = useState({});
  const [currentUnderlineStates, setCurrentUnderlineStates] = useState({});
  const [currentStrikethroughStates, setCurrentStrikethroughStates] = useState({});
  
  // Auto-expand all items by default
  const [expandedItems, setExpandedItems] = useState(() => {
    const expanded = new Set();
    items.forEach((_, i) => expanded.add(i));
    return expanded;
  });
  
  // Auto-expand new items when added
  useEffect(() => {
    const newExpanded = new Set(expandedItems);
    items.forEach((_, i) => {
      if (!newExpanded.has(i)) {
        newExpanded.add(i);
      }
    });
    if (newExpanded.size !== expandedItems.size) {
      setExpandedItems(newExpanded);
    }
  }, [items.length]);

  const handleChange = (field, value) => {
    onUpdate?.({ ...data, [field]: value });
  };

  const addTestimoni = () => {
    const newItems = [...items, { 
      gambar: "", 
      nama: "", 
      jabatan: "",
      isiTestimony: "<p></p>",
      showRating: true,
      rating: 5
    }];
    onUpdate?.({ ...data, items: newItems });
  };

  const removeTestimoni = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate?.({ ...data, items: newItems });
  };

  const updateTestimoni = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate?.({ ...data, items: newItems });
  };


  const handleFileChange = async (index, e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const webpDataUrl = await convertToWebp(file);
        updateTestimoni(index, "gambar", webpDataUrl);
      } catch (err) {
        console.error("Failed to convert testimoni image", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          updateTestimoni(index, "gambar", event.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };


  // Format selection - use Tiptap for Bold/Underline/Italic/Strikethrough, execCommand for others
  const formatSelection = (index, command, value = null) => {
    const editor = editorRefs.current[index];
    if (!editor) return;
    
    // Use Tiptap for Bold, Underline, Italic, Strikethrough
    if (command === "bold") {
      editor.chain().focus().toggleBold().run();
      setCurrentBoldStates(prev => ({ ...prev, [index]: editor.isActive('bold') }));
      return;
    }
    
    if (command === "underline") {
      editor.chain().focus().toggleUnderline().run();
      setCurrentUnderlineStates(prev => ({ ...prev, [index]: editor.isActive('underline') }));
      return;
    }
    
    if (command === "italic") {
      editor.chain().focus().toggleItalic().run();
      setCurrentItalicStates(prev => ({ ...prev, [index]: editor.isActive('italic') }));
      return;
    }
    
    if (command === "strikeThrough" || command === "strikethrough") {
      editor.chain().focus().toggleStrike().run();
      setCurrentStrikethroughStates(prev => ({ ...prev, [index]: editor.isActive('strike') }));
      return;
    }
    
    // For other commands (link, lists, align), still use execCommand
    // These are not critical formatting commands, so execCommand is acceptable
    const editorElement = editorRefs.current[index]?.view?.dom;
    if (!editorElement) return;
    
    editorElement.focus();
    document.execCommand(command, false, value);
  };

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

  return (
    <ComponentWrapper
      title="Testimoni"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="testimoni-component-content">
        {/* Judul Komponen */}
        <div className="form-field-group">
          <label className="form-label-small">Judul Komponen</label>
          <InputText
            value={componentTitle}
            onChange={(e) => handleChange("componentTitle", e.target.value)}
            placeholder="Cth: Yang akan Kamu Dapatkan"
            className="w-full form-input"
          />
        </div>

        {items.map((item, i) => {
          const isExpanded = expandedItems.has(i);
          const showActions = showImageActions[i] || false;

          return (
            <div key={i} className="testimoni-item-card">
              <div className="testimoni-item-header">
                <span className="testimoni-item-number">Testimoni {i + 1}</span>
                <div className="testimoni-item-header-actions">
                  <button
                    className="testimoni-move-btn"
                    onClick={() => {
                      if (i > 0) {
                        const newItems = [...items];
                        [newItems[i - 1], newItems[i]] = [newItems[i], newItems[i - 1]];
                        onUpdate?.({ ...data, items: newItems });
                      }
                    }}
                    disabled={i === 0}
                    title="Pindah ke atas"
                  >
                    ↑
                  </button>
                  <button
                    className="testimoni-move-btn"
                    onClick={() => {
                      if (i < items.length - 1) {
                        const newItems = [...items];
                        [newItems[i], newItems[i + 1]] = [newItems[i + 1], newItems[i]];
                        onUpdate?.({ ...data, items: newItems });
                      }
                    }}
                    disabled={i === items.length - 1}
                    title="Pindah ke bawah"
                  >
                    ↓
                  </button>
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    className="p-button-danger p-button-sm"
                    onClick={() => removeTestimoni(i)}
                    tooltip="Hapus testimoni"
                  />
                </div>
              </div>

              <div className="testimoni-item-content">
                  {/* Upload Foto */}
                  <div className="form-field-group">
                    <label className="form-label-small">Upload Foto</label>
                    {(item.gambar && (typeof item.gambar === 'string' || item.gambar.value)) ? (
                      <div className="uploaded-image-container">
                        <div 
                          className="uploaded-image-preview-box"
                          onMouseEnter={() => setShowImageActions({ ...showImageActions, [i]: true })}
                          onMouseLeave={() => setShowImageActions({ ...showImageActions, [i]: false })}
                        >
                          <img 
                            src={typeof item.gambar === 'string' ? item.gambar : URL.createObjectURL(item.gambar.value)} 
                            alt="Preview" 
                            className="uploaded-image-preview-img" 
                          />
                          {showActions && (
                            <div className="image-action-overlay">
                              <button className="image-action-btn" title="Edit">
                                <Pencil size={16} />
                              </button>
                              <button 
                                className="image-action-btn" 
                                title="Hapus" 
                                onClick={() => updateTestimoni(i, "gambar", "")}
                              >
                                <Trash2 size={16} />
                              </button>
                              <button className="image-action-btn" title="Lihat">
                                <Eye size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.gif,.heic"
                          onChange={(e) => handleFileChange(i, e)}
                          className="component-file-input"
                          id={`testimoni-image-replace-${i}`}
                        />
                        <label htmlFor={`testimoni-image-replace-${i}`} className="replace-image-label">
                          Ganti Gambar
                        </label>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.gif,.heic"
                          onChange={(e) => handleFileChange(i, e)}
                          className="component-file-input"
                          id={`testimoni-image-upload-${i}`}
                        />
                        <label htmlFor={`testimoni-image-upload-${i}`} className="component-upload-label">
                          <div className="upload-icon-wrapper">
                            <ImageIcon size={32} />
                          </div>
                          <span className="upload-text">Upload Foto</span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Nama */}
                  <div className="form-field-group">
                    <label className="form-label-small">
                      Nama <span className="required-asterisk">*</span>
                    </label>
                    <InputText
                      className="w-full form-input"
                      placeholder="Masukkan nama testimoni"
                      value={item.nama || ""}
                      onChange={(e) => updateTestimoni(i, "nama", e.target.value)}
                    />
                  </div>

                  {/* Jabatan / Pekerjaan */}
                  <div className="form-field-group">
                    <label className="form-label-small">Jabatan / Pekerjaan</label>
                    <InputText
                      className="w-full form-input"
                      placeholder="Masukkan jabatan atau pekerjaan"
                      value={item.jabatan || ""}
                      onChange={(e) => updateTestimoni(i, "jabatan", e.target.value)}
                    />
                  </div>

                  {/* Isi Testimony */}
                  <div className="form-field-group">
                    <label className="form-label-small">
                      Isi Testimony <span className="required-asterisk">*</span>
                    </label>
                    
                    {/* Rich Text Editor Toolbar */}
                    <div className="text-editor-toolbar">
                      <div className="toolbar-row">
                        <button 
                          className={`toolbar-btn ${currentBoldStates[i] ? "active" : ""}`}
                          title="Bold"
                          onClick={() => formatSelection(i, "bold")}
                        >
                          <Bold size={16} />
                        </button>
                        <button 
                          className={`toolbar-btn ${currentItalicStates[i] ? "active" : ""}`}
                          title="Italic"
                          onClick={() => formatSelection(i, "italic")}
                        >
                          <Italic size={16} />
                        </button>
                        <button 
                          className={`toolbar-btn ${currentUnderlineStates[i] ? "active" : ""}`}
                          title="Underline"
                          onClick={() => formatSelection(i, "underline")}
                        >
                          <Underline size={16} />
                        </button>
                        <button 
                          className={`toolbar-btn ${currentStrikethroughStates[i] ? "active" : ""}`}
                          title="Strikethrough"
                          onClick={() => formatSelection(i, "strikeThrough")}
                        >
                          <Strikethrough size={16} />
                        </button>
                        <button 
                          className="toolbar-btn"
                          title="Link"
                          onClick={() => {
                            const url = prompt("Masukkan URL:");
                            if (url) formatSelection(i, "createLink", url);
                          }}
                        >
                          <Link size={16} />
                        </button>
                        <button 
                          className="toolbar-btn"
                          title="Bulleted List"
                          onClick={() => formatSelection(i, "insertUnorderedList")}
                        >
                          <List size={16} />
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

                    {/* Rich Text Editor Area - Tiptap */}
                    <div className="text-editor-area">
                      <TestimoniItemEditor
                        itemIndex={i}
                        content={item.isiTestimony || item.deskripsi}
                        onUpdate={(html) => {
                          flushSync(() => {
                            updateTestimoni(i, "isiTestimony", html);
                          });
                        }}
                        onEditorReady={(editor) => {
                          editorRefs.current[i] = editor;
                          
                          // Sync button states
                          setCurrentBoldStates(prev => ({ ...prev, [i]: editor.isActive('bold') }));
                          setCurrentItalicStates(prev => ({ ...prev, [i]: editor.isActive('italic') }));
                          setCurrentUnderlineStates(prev => ({ ...prev, [i]: editor.isActive('underline') }));
                          setCurrentStrikethroughStates(prev => ({ ...prev, [i]: editor.isActive('strike') }));
                          
                          // Setup sync for button state changes
                          const updateButtonStates = () => {
                            try {
                              setCurrentBoldStates(prev => ({ ...prev, [i]: editor.isActive('bold') }));
                              setCurrentItalicStates(prev => ({ ...prev, [i]: editor.isActive('italic') }));
                              setCurrentUnderlineStates(prev => ({ ...prev, [i]: editor.isActive('underline') }));
                              setCurrentStrikethroughStates(prev => ({ ...prev, [i]: editor.isActive('strike') }));
                            } catch (e) {
                              console.error("Error updating button states:", e);
                            }
                          };
                          
                          editor.on('selectionUpdate', updateButtonStates);
                          editor.on('transaction', updateButtonStates);
                        }}
                      />
                    </div>
                  </div>

                  {/* Tampilkan Rating */}
                  <div className="form-field-group">
                    <div className="testimoni-rating-control">
                      <div className="testimoni-rating-toggle">
                        <InputSwitch
                          checked={item.showRating !== false}
                          onChange={(e) => updateTestimoni(i, "showRating", e.value)}
                        />
                        <label className="testimoni-rating-label">Tampilkan Rating</label>
                      </div>
                      {item.showRating !== false && (
                        <div className="testimoni-star-rating">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={`star-btn ${star <= (item.rating || 5) ? "filled" : ""}`}
                              onClick={() => updateTestimoni(i, "rating", star)}
                              title={`Rating ${star}`}
                            >
                              <Star 
                                size={20} 
                                fill={star <= (item.rating || 5) ? "#fbbf24" : "none"}
                                color="#fbbf24"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          );
        })}

        <Button
          icon="pi pi-plus"
          label="Tambah Testimoni"
          className="add-item-btn"
          onClick={addTestimoni}
        />
      </div>
    </ComponentWrapper>
  );
}
