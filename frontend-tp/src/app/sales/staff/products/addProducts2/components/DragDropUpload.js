"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export default function DragDropUpload({
  value,
  onChange,
  accept = "image/*",
  multiple = false,
  maxFiles = 10,
  label = "Upload File",
  description = "Drag and drop gambar di sini atau klik untuk memilih",
  preview = true,
  className = "",
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, multiple ? maxFiles : 1);
    
    // Validate file types
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} bukan file gambar. Silakan pilih file gambar.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    if (multiple) {
      setPreviews(prev => [...prev, ...newPreviews].slice(0, maxFiles));
      // For multiple files, call onChange with array
      if (onChange) {
        const fileObjects = validFiles.map(file => ({
          type: "file",
          value: file
        }));
        onChange(fileObjects);
      }
    } else {
      setPreviews(newPreviews.slice(0, 1));
      // For single file, call onChange with single object
      if (onChange) {
        onChange({ type: "file", value: validFiles[0] });
      }
    }
  }, [multiple, maxFiles, onChange]);

  // Handle drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    handleFiles(files);
  }, [handleFiles]);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Remove preview
  const removePreview = useCallback((index) => {
    setPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke object URL to prevent memory leak
      if (prev[index]?.preview) {
        URL.revokeObjectURL(prev[index].preview);
      }
      
      // Update form value
      if (onChange) {
        if (multiple) {
          const remainingFiles = newPreviews.map(p => ({
            type: "file",
            value: p.file
          }));
          onChange(remainingFiles);
        } else {
          onChange(null);
        }
      }
      
      return newPreviews;
    });
  }, [multiple, onChange]);

  // Sync with external value changes (only when value changes externally, not from internal state)
  useEffect(() => {
    // Only sync if value is provided and different from current previews
    const currentFile = multiple 
      ? previews.map(p => p.file)
      : (previews[0]?.file || null);
    
    const externalFile = multiple && Array.isArray(value)
      ? value.filter(v => v?.type === "file" && v?.value).map(v => v.value)
      : (!multiple && value?.type === "file" && value?.value ? value.value : null);

    // Check if files are different
    const filesChanged = multiple
      ? JSON.stringify(currentFile) !== JSON.stringify(externalFile)
      : currentFile !== externalFile;

    if (filesChanged) {
      // Clean up old previews
      previews.forEach(p => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });

      if (value) {
        if (multiple && Array.isArray(value)) {
          const filePreviews = value
            .filter(v => v?.type === "file" && v?.value)
            .map(v => ({
              file: v.value,
              preview: URL.createObjectURL(v.value),
            }));
          setPreviews(filePreviews);
        } else if (!multiple && value?.type === "file" && value?.value) {
          setPreviews([{
            file: value.value,
            preview: URL.createObjectURL(value.value),
          }]);
        }
      } else {
        setPreviews([]);
      }
    }

    // Cleanup function
    return () => {
      previews.forEach(p => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
    };
  }, [value, multiple]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`drag-drop-upload-wrapper ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="drag-drop-input-hidden"
        aria-label={label}
      />

      {/* Drag and drop area */}
      <div
        className={`drag-drop-area ${isDragging ? "dragging" : ""} ${previews.length > 0 ? "has-files" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={label}
      >
        <div className="drag-drop-content">
          {previews.length === 0 ? (
            <>
              <div className="drag-drop-icon">
                <Upload size={48} />
              </div>
              <div className="drag-drop-text">
                <p className="drag-drop-label">{label}</p>
                <p className="drag-drop-description">{description}</p>
                {multiple && (
                  <p className="drag-drop-hint">
                    Maksimal {maxFiles} file (klik atau drag & drop)
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="drag-drop-preview-grid">
              {previews.map((preview, index) => (
                <div key={index} className="drag-drop-preview-item">
                  {preview && (
                    <>
                      <img
                        src={preview.preview}
                        alt={`Preview ${index + 1}`}
                        className="drag-drop-preview-image"
                      />
                      <button
                        type="button"
                        className="drag-drop-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePreview(index);
                        }}
                        aria-label="Hapus gambar"
                      >
                        <X size={16} />
                      </button>
                      <div className="drag-drop-file-info">
                        <p className="drag-drop-file-name" title={preview.file.name}>
                          {preview.file.name}
                        </p>
                        <p className="drag-drop-file-size">
                          {(preview.file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {multiple && previews.length < maxFiles && (
                <div
                  className="drag-drop-add-more"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  <ImageIcon size={24} />
                  <span>Tambah Gambar</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

