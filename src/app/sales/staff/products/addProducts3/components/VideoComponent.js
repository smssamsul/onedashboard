"use client";

import { InputText } from "primereact/inputtext";
import ComponentWrapper from "./ComponentWrapper";

export default function VideoComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index }) {
  const url = data.url || "";

  const handleChange = (value) => {
    // Convert YouTube watch URL to embed URL
    let embedUrl = value;
    if (embedUrl.includes("watch?v=")) {
      embedUrl = embedUrl.replace("watch?v=", "embed/");
    }
    if (embedUrl.includes("youtu.be/")) {
      embedUrl = embedUrl.replace("youtu.be/", "youtube.com/embed/");
    }
    
    onUpdate?.({ ...data, url: value, embedUrl: embedUrl });
  };

  return (
    <ComponentWrapper
      title="Video YouTube"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
    >
      <div className="video-component-content">
        <div className="form-field-group">
          <label className="form-label-small">URL Video YouTube</label>
          <InputText
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full form-input"
          />
        </div>
        
        {data.embedUrl && (
          <div className="video-preview">
            <iframe
              src={data.embedUrl}
              title="Video Preview"
              allowFullScreen
              className="preview-iframe"
            />
          </div>
        )}
      </div>
    </ComponentWrapper>
  );
}

