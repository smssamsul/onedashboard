"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { toast } from "react-hot-toast";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold, Italic, List, ListOrdered, Quote, AlignLeft,
    AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon,
    MoreHorizontal, ChevronDown, Strikethrough, Undo, Redo, SplitSquareHorizontal
} from "lucide-react";
import axios from "axios";
import "@/styles/sales/bonus.css";

const ArticleEditor = forwardRef(({ initialData, idorder, onSuccess, onCancel, extraPayload = {}, hideActions = false }, ref) => {
    const [title, setTitle] = useState(initialData?.title || "");
    const [slug, setSlug] = useState(initialData?.slug || "");
    const [saving, setSaving] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Initial content parsing
    const parseInitialContent = () => {
        try {
            if (!initialData?.content) return '<p></p>';

            // If it's a string (JSON string or HTML)
            if (typeof initialData.content === 'string') {
                // Try parsing JSON first
                try {
                    const parsed = JSON.parse(initialData.content);
                    // If it's Tiptap JSON (has type: 'doc' or array content)
                    if (Array.isArray(parsed)) {
                        return { type: 'doc', content: parsed };
                    }
                    if (parsed.type === 'doc') {
                        return parsed;
                    }
                    // If not valid JSON structure for Tiptap, return string (HTML?)
                    return initialData.content;
                } catch (e) {
                    // Not JSON, assume HTML string
                    return initialData.content;
                }
            }

            // If it's already an object/array
            if (Array.isArray(initialData.content)) {
                return { type: 'doc', content: initialData.content };
            }

            return initialData.content;
        } catch (e) {
            console.warn("Error parsing initial content:", e);
            return '<p></p>';
        }
    };

    // Convert File to Base64
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageFile = async (file) => {
        if (!file) return null;

        // Validasi tipe file
        if (!file.type.startsWith('image/')) {
            toast.error("File harus berupa gambar");
            return null;
        }

        setProcessingImage(true);
        try {
            const base64 = await convertFileToBase64(file);
            return base64;
        } catch (error) {
            console.error("Error converting image:", error);
            toast.error("Gagal memproses gambar");
            return null;
        } finally {
            setProcessingImage(false);
        }
    };

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
        ],
        content: parseInitialContent(),
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-8 bg-white',
            },
            handlePaste: (view, event, slice) => {
                const items = (event.clipboardData || event.originalEvent.clipboardData).items;
                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        event.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            handleImageFile(file).then((base64) => {
                                if (base64) {
                                    const { schema } = view.state;
                                    const node = schema.nodes.image.create({ src: base64 });
                                    const transaction = view.state.tr.replaceSelectionWith(node);
                                    view.dispatch(transaction);
                                }
                            });
                        }
                        return true;
                    }
                }
                return false;
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.indexOf('image') === 0) {
                        event.preventDefault();
                        handleImageFile(file).then((base64) => {
                            if (base64) {
                                const { schema } = view.state;
                                const node = schema.nodes.image.create({ src: base64 });
                                const transaction = view.state.tr.replaceSelectionWith(node);
                                view.dispatch(transaction);
                            }
                        });
                        return true;
                    }
                }
                return false;
            }
        },
    });

    useEffect(() => {
        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [editor]);

    useEffect(() => {
        if (!initialData && title) {
            setSlug(title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
        }
    }, [title, initialData]);

    const handleSave = async (forceStatus = null) => {
        if (!title) return toast.error("Judul wajib diisi");
        if (!editor) return toast.error("Editor belum siap");

        setSaving(true);
        try {
            const json = editor.getJSON();
            const payload = {
                id: initialData?.id,
                idorder: idorder || initialData?.idorder,
                title,
                slug,
                status: forceStatus || initialData?.status || "draft",
                content: json,
                ...extraPayload
            };

            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            let response;
            if (initialData?.id) {
                response = await axios.put(`/api/sales/post/${initialData.id}`, payload, { headers });
            } else {
                response = await axios.post("/api/sales/post", payload, { headers });
            }

            if (response.data?.success) {
                toast.success(initialData ? "Artikel diperbarui!" : "Artikel berhasil disimpan!");
                if (onSuccess) onSuccess();
            } else {
                toast.error(response.data?.message || "Gagal menyimpan");
            }
        } catch (err) {
            console.error("Save error:", err);
            const msg = err.response?.data?.message || "Gagal menyambung ke server";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleSave
    }));

    // Formatting Helpers
    const toggleBold = () => editor?.chain().focus().toggleBold().run();
    const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
    const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
    const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
    const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
    const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();

    const setTextAlign = (align) => editor?.chain().focus().setTextAlign(align).run();

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Enter URL', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        let finalUrl = url;
        if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
            finalUrl = 'https://' + url;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file).then((base64) => {
                if (base64) {
                    editor.chain().focus().setImage({ src: base64 }).run();
                }
            });
            e.target.value = '';
        }
    }

    const triggerAddImage = () => {
        fileInputRef.current?.click();
    };

    if (!editor) {
        return <div className="p-8 text-center">Loading editor...</div>;
    }

    return (
        <div className="wp-classic-layout">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                accept="image/*"
            />

            <div className="wp-title-section">
                <input
                    type="text"
                    className="wp-title-input"
                    placeholder="Enter title here"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            {title && (
                <div className="wp-permalink-line">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center">
                            <span className="text-gray-500 text-sm">Permalink: </span>
                            <a href="#" className="text-blue-600 text-sm hover:underline ml-1">
                                {typeof window !== 'undefined' ? window.location.origin : ''}/article/{slug}
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <div className="wp-media-section mt-4 mb-2">
                <button className="wp-add-media-btn" onClick={triggerAddImage} disabled={processingImage}>
                    <ImageIcon size={14} style={{ marginRight: 6 }} />
                    {processingImage ? "Procesing..." : "Add Media"}
                </button>
            </div>

            <div className="wp-editor-frame">
                <div className="wp-editor-tabs">
                    <button className="wp-tab active">Visual</button>
                    <button className="wp-tab">Text</button>
                </div>

                <div className="wp-toolbar">
                    <div className="wp-toolbar-row">
                        <button className={`wp-tool-btn dropdown ${editor.isActive('paragraph') ? 'active' : ''}`} title="Paragraph">Paragraph <ChevronDown size={10} /></button>
                        <button className={`wp-tool-btn ${editor.isActive('bold') ? 'active' : ''}`} onClick={toggleBold} title="Bold"><Bold size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive('italic') ? 'active' : ''}`} onClick={toggleItalic} title="Italic"><Italic size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={toggleBulletList} title="Bulleted List"><List size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive('orderedList') ? 'active' : ''}`} onClick={toggleOrderedList} title="Numbered List"><ListOrdered size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={toggleBlockquote} title="Blockquote"><Quote size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} onClick={() => setTextAlign('left')} title="Align Left"><AlignLeft size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} onClick={() => setTextAlign('center')} title="Align Center"><AlignCenter size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} onClick={() => setTextAlign('right')} title="Align Right"><AlignRight size={14} /></button>
                        <button className={`wp-tool-btn ${editor.isActive('link') ? 'active' : ''}`} onClick={setLink} title="Insert/edit link"><LinkIcon size={14} /></button>
                        <button className="wp-tool-btn" title="Insert Read More tag"><SplitSquareHorizontal size={14} /></button>
                        <button className="wp-tool-btn" title="Toolbar Toggle"><MoreHorizontal size={14} /></button>
                    </div>
                </div>

                <div className="wp-editor-content-area" onClick={() => editor.chain().focus().run()}>
                    <EditorContent editor={editor} />
                </div>

                <div className="wp-editor-footer">
                    <div className="text-xs text-gray-500">p</div>
                </div>
            </div>

            {!hideActions && (
                <div className="wp-publish-actions mt-6 p-4 bg-white border border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                        <button className="text-red-600 text-sm hover:underline">Move to Trash</button>
                        <button
                            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                            onClick={() => handleSave('published')}
                            disabled={saving}
                        >
                            {saving ? 'Publishing...' : 'Publish'}
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .wp-classic-layout {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                    color: #3c434a;
                    max-width: 100%;
                }
                .wp-title-section {
                    margin-bottom: 5px;
                }
                .wp-title-input {
                    width: 100%;
                    padding: 3px 8px;
                    font-size: 1.7em;
                    line-height: 100%;
                    height: 1.7em;
                    outline: 0;
                    margin: 0;
                    background-color: #fff;
                    border: 1px solid #8c8f94;
                    box-shadow: 0 0 0 transparent;
                    transition: box-shadow .1s linear;
                    color: #3c434a;
                }
                .wp-title-input:focus {
                    border-color: #2271b1;
                    box-shadow: 0 0 0 1px #2271b1;
                }
                .wp-permalink-line {
                    display: flex;
                    align-items: center;
                    margin-top: 2px;
                    margin-bottom: 10px;
                    font-size: 13px;
                }
                .wp-btn-small {
                    background: #f0f0f1;
                    border: 1px solid #8c8f94;
                    color: #2c3338;
                    font-size: 11px;
                    line-height: 1;
                    padding: 0 5px;
                    height: 20px;
                    border-radius: 3px;
                    cursor: pointer;
                }
                .wp-add-media-btn {
                    display: inline-flex;
                    align-items: center;
                    background: #f6f7f7;
                    border: 1px solid #2271b1;
                    color: #2271b1;
                    font-size: 13px;
                    font-weight: 600;
                    padding: 4px 10px;
                    cursor: pointer;
                    border-radius: 3px;
                    transition: 0.1s;
                }
                .wp-add-media-btn:hover {
                    background: #f0f0f1;
                    color: #135e96;
                    border-color: #135e96;
                }
                .wp-editor-frame {
                    border: 1px solid #c3c4c7;
                    background: #fff;
                    margin-top: 10px;
                }
                .wp-editor-tabs {
                    display: flex;
                    justify-content: flex-end;
                    background: #f0f0f1;
                    padding: 5px 10px 0;
                    border-bottom: 1px solid #c3c4c7;
                }
                .wp-tab {
                    background: #ebebeb;
                    border: 1px solid #c3c4c7;
                    border-bottom: none;
                    padding: 5px 10px;
                    font-size: 13px;
                    color: #50575e;
                    cursor: pointer;
                    margin-left: 5px;
                }
                .wp-tab.active {
                    background: #f6f7f7;
                    color: #000;
                    font-weight: 600;
                    padding-bottom: 6px;
                    margin-bottom: -1px;
                    border-bottom: 1px solid #f6f7f7;
                    z-index: 10;
                }
                .wp-toolbar {
                    background: #f6f7f7;
                    padding: 4px;
                    border-bottom: 1px solid #dcdcde;
                }
                .wp-toolbar-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2px;
                }
                .wp-tool-btn {
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: 1px solid transparent;
                    color: #50575e;
                    cursor: pointer;
                    border-radius: 2px;
                }
                .wp-tool-btn:hover, .wp-tool-btn.active {
                    background: #fff;
                    border-color: #c3c4c7;
                    color: #1d2327;
                }
                .wp-tool-btn.active {
                    background: #e5e5e5;
                    border-color: #8c8f94;
                    box-shadow: inset 0 1px 0 rgba(0,0,0,.1);
                }
                .wp-tool-btn.dropdown {
                    width: auto;
                    padding: 0 5px;
                    gap: 4px;
                    font-size: 13px;
                }
                .wp-editor-content-area {
                    min-height: 400px;
                    padding: 20px;
                    cursor: text;
                }
                .wp-editor-footer {
                    background: #f6f7f7;
                    padding: 4px 10px;
                    border-top: 1px solid #dcdcde;
                }
                .ProseMirror {
                    outline: none;
                    min-height: 400px;
                }
                .ProseMirror p {
                    margin-bottom: 1em;
                    line-height: 1.6;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                    padding-left: 1.5em;
                    margin-bottom: 1em;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5em;
                    margin-bottom: 1em;
                }
                .ProseMirror blockquote {
                    border-left: 3px solid #ccc;
                    padding-left: 1em;
                    margin-left: 0;
                    margin-right: 0;
                    font-style: italic;
                }
                .ProseMirror img {
                    max-width: 80%;
                    height: auto;
                    margin: 1.5rem auto;
                    display: block;
                    border-radius: 4px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </div>
    );
});

export default ArticleEditor;
