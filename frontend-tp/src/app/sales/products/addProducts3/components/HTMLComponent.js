"use client";

import { useRef } from "react";
import Editor from "@monaco-editor/react";
import ComponentWrapper from "./ComponentWrapper";

export default function HTMLComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const code = data.code || "";
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleChange = (value) => {
    onUpdate?.({ ...data, code: value ?? "" });
  };

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // biar bisa pilih file yang sama lagi kalau mau re-import
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      handleChange(String(reader.result || ""));
      setTimeout(() => handleFormat(), 100);
    };
    reader.readAsText(file);
  };

  const handleMount = (editor) => {
    editorRef.current = editor;
    // Paksa layout ulang begitu mount - tanpa ini suka nyisa celah putih kosong
    // di bawah toolbar sebelum area kode gelapnya kebentuk sempurna.
    editor.layout();
    // Rapikan otomatis begitu dibuka - kode hasil import/paste sering masih 1 baris panjang
    setTimeout(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    }, 300);
  };

  return (
    <ComponentWrapper
      title="HTML"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="html-component-content">
        <div className="form-field-group">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <label className="form-label-small" style={{ marginBottom: 0 }}>HTML Code</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,text/html"
                onChange={handleFileSelected}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={handleImportClick}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#7c3aed",
                  background: "#f5f3ff",
                  border: "1px solid #ddd6fe",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Import File .html
              </button>
              <button
                type="button"
                onClick={handleFormat}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#3b82f6",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Rapikan Kode
              </button>
            </div>
          </div>
          <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
            <Editor
              height="700px"
              defaultLanguage="html"
              value={code}
              onChange={handleChange}
              onMount={handleMount}
              theme="vs-dark"
              loading={<div style={{ background: "#1e1e1e", width: "100%", height: "700px" }} />}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                formatOnPaste: true,
                lineNumbers: "off",
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 8,
                lineNumbersMinChars: 0,
              }}
            />
          </div>
        </div>
      </div>
    </ComponentWrapper>
  );
}
