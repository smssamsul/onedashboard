"use client";

import { useState, useRef } from "react";
import { 
  Type, Image as ImageIcon, FileText, List, MessageSquare, 
  HelpCircle, Image as SliderIcon, Square, Youtube, Link as LinkIcon,
  MapPin, Film, Minus, Code, ChevronDown, ChevronUp, X,
  Monitor, Tablet, Smartphone, Save, Rocket
} from "lucide-react";
import { Dialog } from "primereact/dialog";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import "@/styles/sales/landing-page-studio.css";

// Komponen yang tersedia
const COMPONENT_CATEGORIES = {
  seringDigunakan: {
    label: "Sering Digunakan",
    components: [
      { id: "text", name: "Teks", icon: Type, color: "#3b82f6" },
      { id: "image", name: "Gambar", icon: ImageIcon, color: "#10b981" },
    ]
  },
  formPemesanan: {
    label: "Form Pemesanan Online",
    components: [
      { id: "form", name: "Form Pemesanan", icon: FileText, color: "#8b5cf6" },
      { id: "list", name: "Daftar", icon: List, color: "#f59e0b" },
      { id: "testimoni", name: "Testimoni", icon: MessageSquare, color: "#ec4899" },
      { id: "faq", name: "FAQ", icon: HelpCircle, color: "#06b6d4" },
    ]
  },
  salesPage: {
    label: "Sales Page",
    components: [
      { id: "slider", name: "Gambar Slider", icon: SliderIcon, color: "#ef4444" },
      { id: "button", name: "Tombol", icon: Square, color: "#F1A124" },
      { id: "youtube", name: "YouTube", icon: Youtube, color: "#dc2626" },
      { id: "embed", name: "Embed", icon: LinkIcon, color: "#6366f1" },
      { id: "scroll-target", name: "Scroll Target", icon: MapPin, color: "#14b8a6" },
      { id: "animation", name: "Animation", icon: Film, color: "#a855f7" },
    ]
  },
  lainnya: {
    label: "Lainnya",
    components: [
      { id: "section", name: "Section", icon: Minus, color: "#64748b" },
      { id: "html", name: "HTML", icon: Code, color: "#475569" },
      { id: "divider", name: "Divider", icon: Minus, color: "#94a3b8" },
    ]
  }
};

export default function LandingPageStudio({ blocks = [], onBlocksChange, form, onFormChange }) {
  const [activeTab, setActiveTab] = useState("konten");
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handler untuk menambah komponen baru
  const handleAddComponent = (componentId) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: componentId,
      data: getDefaultBlockData(componentId),
      order: blocks.length + 1,
    };
    
    onBlocksChange([...blocks, newBlock]);
    setShowComponentModal(false);
    setSelectedBlock(newBlock);
  };

  // Default data untuk setiap tipe komponen
  const getDefaultBlockData = (type) => {
    const defaults = {
      text: { content: "Text Baru", fontSize: "16px", fontFamily: "Page Font", lineHeight: "1.5" },
      image: { src: null, alt: "Image", caption: "" },
      form: { fields: [] },
      list: { items: [] },
      testimoni: { items: [] },
      faq: { items: [] },
      slider: { images: [] },
      button: { text: "Klik Disini", link: "#", style: "primary" },
      youtube: { url: "" },
      embed: { code: "" },
      "scroll-target": { target: "" },
      animation: { type: "fade" },
      section: { background: "#ffffff", padding: "20px" },
      html: { code: "" },
      divider: { style: "solid", color: "#e5e7eb" },
    };
    return defaults[type] || {};
  };

  // Handler untuk update block
  const handleUpdateBlock = (blockId, data) => {
    const updatedBlocks = blocks.map(block => 
      block.id === blockId ? { ...block, data: { ...block.data, ...data } } : block
    );
    onBlocksChange(updatedBlocks);
  };

  // Handler untuk delete block
  const handleDeleteBlock = (blockId) => {
    const updatedBlocks = blocks.filter(block => block.id !== blockId);
    onBlocksChange(updatedBlocks);
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  // Render komponen di modal
  const renderComponentGrid = () => {
    return Object.entries(COMPONENT_CATEGORIES).map(([key, category]) => (
      <div key={key} className="component-category">
        <h3 className="component-category-title">{category.label}</h3>
        <div className="component-grid">
          {category.components.map((component) => {
            const Icon = component.icon;
            return (
              <button
                key={component.id}
                className="component-item"
                onClick={() => handleAddComponent(component.id)}
              >
                <div 
                  className="component-icon" 
                  style={{ backgroundColor: `${component.color}15`, color: component.color }}
                >
                  <Icon size={24} />
                </div>
                <span className="component-name">{component.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="landing-page-studio">
      {/* Header */}
      <div className="studio-header">
        <div className="studio-header-left">
          <div className="studio-tabs">
            <button 
              className={`studio-tab ${activeTab === "konten" ? "active" : ""}`}
              onClick={() => setActiveTab("konten")}
            >
              Konten
            </button>
            <button 
              className={`studio-tab ${activeTab === "desain" ? "active" : ""}`}
              onClick={() => setActiveTab("desain")}
            >
              Desain
            </button>
            <button 
              className={`studio-tab ${activeTab === "pengaturan" ? "active" : ""}`}
              onClick={() => setActiveTab("pengaturan")}
            >
              Pengaturan
            </button>
          </div>
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? ">>" : "<<"}
          </button>
        </div>
        
        <div className="studio-header-center">
          <div className="editing-badge">
            <span className="editing-dot"></span>
            Only you are editing this page
          </div>
          <div className="device-preview">
            <button className="device-btn active">
              <Monitor size={18} />
            </button>
            <button className="device-btn">
              <Tablet size={18} />
            </button>
            <button className="device-btn">
              <Smartphone size={18} />
            </button>
          </div>
        </div>

        <div className="studio-header-right">
          <Button 
            label="Simpan" 
            icon="pi pi-save"
            className="save-btn"
            onClick={() => console.log("Save")}
          />
          <Button 
            label="Simpan & Terbitkan" 
            icon="pi pi-send"
            className="save-publish-btn"
            onClick={() => console.log("Save & Publish")}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="studio-main">
        {/* Left Sidebar - Component Editor */}
        {!sidebarCollapsed && (
          <div className="studio-sidebar">
            {blocks.map((block, index) => (
              <div 
                key={block.id} 
                className={`component-editor-item ${selectedBlock?.id === block.id ? "active" : ""}`}
                onClick={() => setSelectedBlock(block)}
              >
                <div className="component-editor-header">
                  <div className="component-editor-title">
                    {block.type === "text" && <Type size={16} />}
                    {block.type === "image" && <ImageIcon size={16} />}
                    {block.type === "gambar" && <ImageIcon size={16} />}
                    <span>{block.type === "gambar" ? "Gambar" : block.type === "text" ? "Text" : block.type}</span>
                  </div>
                  <div className="component-editor-actions">
                    <button className="component-action-btn">
                      <ChevronUp size={14} />
                    </button>
                    <button className="component-action-btn">
                      <ChevronDown size={14} />
                    </button>
                    <button 
                      className="component-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(block.id);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Component Button */}
            <button 
              className="add-component-btn"
              onClick={() => setShowComponentModal(true)}
            >
              <span className="add-component-icon">+</span>
              Tambah Komponen Baru
            </button>

            {/* Component Editor Panel */}
            {selectedBlock && (
              <div className="component-editor-panel">
                <h3 className="editor-panel-title">Edit {selectedBlock.type}</h3>
                {selectedBlock.type === "text" && (
                  <div className="editor-panel-content">
                    <div className="editor-option">
                      <label>Background Editor Gelap</label>
                      <InputSwitch checked={false} />
                    </div>
                    <div className="editor-toolbar">
                      <button className="toolbar-btn"><strong>B</strong></button>
                      <button className="toolbar-btn"><em>I</em></button>
                      <button className="toolbar-btn"><u>U</u></button>
                      <button className="toolbar-btn">S</button>
                      <button className="toolbar-btn"><LinkIcon size={14} /></button>
                      <button className="toolbar-btn">•</button>
                      <button className="toolbar-btn">1.</button>
                      <button className="toolbar-btn">≡</button>
                      <button className="toolbar-btn">≡</button>
                      <button className="toolbar-btn">≡</button>
                    </div>
                    <div className="editor-controls">
                      <select className="editor-select">
                        <option>Normal</option>
                      </select>
                      <select className="editor-select">
                        <option>16px</option>
                      </select>
                      <select className="editor-select">
                        <option>Page Font</option>
                      </select>
                      <select className="editor-select">
                        <option>1.5</option>
                      </select>
                    </div>
                    <textarea
                      className="editor-textarea"
                      value={selectedBlock.data?.content || ""}
                      onChange={(e) => handleUpdateBlock(selectedBlock.id, { content: e.target.value })}
                      placeholder="Text Baru"
                    />
                  </div>
                )}
                {selectedBlock.type === "gambar" && (
                  <div className="editor-panel-content">
                    <p>Image editor akan ditampilkan di sini</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Preview Area */}
        <div className="studio-preview">
          <div className="preview-canvas">
            {blocks.length === 0 ? (
              <div className="empty-canvas">
                <p>Mulai dengan menambahkan komponen baru</p>
              </div>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="preview-block">
                  {block.type === "text" && (
                    <div className="preview-text">
                      {block.data?.content || "Text Baru"}
                    </div>
                  )}
                  {block.type === "gambar" && (
                    <div className="preview-image">
                      {block.data?.src ? (
                        <img src={block.data.src} alt={block.data.alt || "Image"} />
                      ) : (
                        <div className="image-placeholder">Gambar</div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Component Selection Modal */}
      <Dialog
        visible={showComponentModal}
        onHide={() => setShowComponentModal(false)}
        header="Pilih Komponen"
        className="component-modal"
        style={{ width: "90vw", maxWidth: "800px" }}
        modal
        dismissableMask
      >
        <div className="component-modal-content">
          {renderComponentGrid()}
        </div>
        <div className="component-modal-footer">
          <Button 
            label="Cancel" 
            className="p-button-text p-button-secondary"
            onClick={() => setShowComponentModal(false)}
          />
        </div>
      </Dialog>
    </div>
  );
}

