"use client";

import { useRef } from "react";
import Editor from "@monaco-editor/react";
import ComponentWrapper from "./ComponentWrapper";

export default function HTMLComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const code = data.code || "";
  const editorRef = useRef(null);

  const handleChange = (value) => {
    onUpdate?.({ ...data, code: value ?? "" });
  };

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleMount = (editor) => {
    editorRef.current = editor;
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
          <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
            <Editor
              height="420px"
              defaultLanguage="html"
              value={code}
              onChange={handleChange}
              onMount={handleMount}
              theme="vs-dark"
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
