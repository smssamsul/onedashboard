"use client";

import { useState, useRef, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { 
  X, ChevronUp, ChevronDown as ChevronDownIcon,
  Type, Image as ImageIcon, FileText, List, MessageSquare, 
  HelpCircle, Youtube, Layout, MousePointerClick
} from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

// Import semua komponen untuk render children
import {
  TextComponent,
  ImageComponent,
  VideoComponent,
  TestimoniComponent,
  ListComponent,
  FormComponent,
  FAQComponent,
  PriceComponent,
  ButtonComponent,
  SliderComponent,
  EmbedComponent,
  HTMLComponent,
  DividerComponent,
  ScrollTargetComponent,
  AnimationComponent,
} from './index';

const COMPONENT_CATEGORIES = {
  seringDigunakan: {
    label: "Sering Digunakan",
    components: [
      { id: "text", name: "Teks", icon: Type, color: "#6b7280" },
      { id: "image", name: "Gambar", icon: ImageIcon, color: "#6b7280" },
      { id: "price", name: "Harga", icon: FileText, color: "#6b7280" },
      { id: "youtube", name: "Video", icon: Youtube, color: "#6b7280" },
      { id: "button", name: "Tombol", icon: MousePointerClick, color: "#6b7280" },
    ]
  },
  formPemesanan: {
    label: "Form Pemesanan Online",
    components: [
      { id: "form", name: "Form Pemesanan", icon: FileText, color: "#6b7280" },
      { id: "list", name: "Daftar", icon: List, color: "#6b7280" },
      { id: "testimoni", name: "Testimoni", icon: MessageSquare, color: "#6b7280" },
      { id: "faq", name: "FAQ", icon: HelpCircle, color: "#6b7280" },
    ]
  }
};

export default function SectionComponent({ 
  data = {}, 
  block = null, // ✅ FIX: Terima block lengkap, bukan hanya data
  onUpdate, 
  onMoveUp, 
  onMoveDown, 
  onDelete, 
  index,
  allBlocks = [], // All blocks from parent
  onAddChildBlock = null, // Function to add child block
  onUpdateChildBlock = null, // Function to update child block
  onDeleteChildBlock = null, // Function to delete child block
  onMoveChildBlock = null, // Function to move child block
  isExpanded,
  onToggleExpand,
}) {
  const [showAdvance, setShowAdvance] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [collapsedChildIds, setCollapsedChildIds] = useState(new Set());
  
  // Advance settings
  const marginRight = data.marginRight || 0;
  const marginLeft = data.marginLeft || 0;
  const marginBetween = data.marginBetween !== undefined ? data.marginBetween : 0;
  const border = data.border || 0;
  const borderColor = data.borderColor || "#000000";
  const backgroundColor = data.backgroundColor || "#ffffff";
  const borderRadius = data.borderRadius || "none";
  const boxShadow = data.boxShadow || "none";
  const responsiveType = data.responsiveType || "vertical";
  
  // ✅ ARSITEKTUR BENAR: config.componentId adalah SATU-SATUNYA sumber kebenaran
  // ✅ FALLBACK: Untuk kompatibilitas data lama, generate componentId jika tidak ada
  let sectionComponentId = block?.config?.componentId;
  
  if (!sectionComponentId) {
    // ✅ FALLBACK: Generate componentId untuk data lama yang tidak punya config.componentId
    sectionComponentId = data.componentId || `section-${block?.id || Date.now()}`;
    
    // ✅ Auto-fix: Update block dengan config.componentId untuk data lama
    if (block && !block.config) {
      block.config = {};
    }
    if (block?.config) {
      block.config.componentId = sectionComponentId;
    }
    
    console.warn(`[SECTION FALLBACK] Section block tidak memiliki config.componentId, menggunakan fallback: "${sectionComponentId}"`);
  }
  
  // ✅ ARSITEKTUR BENAR: Resolve child blocks berdasarkan parentId saja
  // TIDAK ADA data.children, hanya parentId
  const childBlocks = allBlocks.filter(b => b.parentId === sectionComponentId);
  
  // ✅ DEBUG: Log untuk tracking identifier
  console.log(`[SECTION EDITOR] Section ID: "${sectionComponentId}"`, {
    sectionBlockId: block?.id,
    sectionConfigComponentId: block?.config?.componentId,
    childCount: childBlocks.length,
    allBlocksWithParentId: allBlocks
      .filter(b => b.parentId)
      .map(b => ({
        id: b.id,
        type: b.type,
        parentId: b.parentId,
        match: b.parentId === sectionComponentId ? "✅ MATCH" : "❌ NO MATCH"
      }))
  });
  
  const handleChange = (field, value) => {
    // ✅ ARSITEKTUR BENAR: Tidak ada data.children, hanya update field biasa
    onUpdate?.({ ...data, [field]: value });
  };

  // Get default data for child component
  const getDefaultData = (componentId) => {
    const defaults = {
      text: { content: "<p></p>" },
      image: { src: "", alt: "", caption: "" },
      video: { items: [] },
      testimoni: { items: [] },
      list: { items: [] },
      form: { kategori: null },
      price: {},
      faq: { items: [] },
      slider: { images: [] },
      button: { text: "Klik Disini", link: "#", style: "primary" },
      embed: { code: "" },
      section: { children: [] },
      html: { code: "" },
      divider: { style: "solid", color: "#e5e7eb" },
      "scroll-target": { target: "" },
      animation: { type: "fade" },
    };
    return defaults[componentId] || {};
  };

  // Handler untuk menambah child component
  const handleAddChildComponent = (componentId) => {
    if (!onAddChildBlock) return;
    
    // ✅ ARSITEKTUR BENAR: Child hanya perlu parentId, TIDAK perlu data.children
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: componentId,
      data: getDefaultData(componentId),
      config: {
        componentId: `${componentId}-${Date.now()}`
      },
      order: childBlocks.length + 1,
      parentId: sectionComponentId, // ✅ ARSITEKTUR BENAR: parentId mengacu ke sectionComponentId
    };
    
    // ✅ ARSITEKTUR BENAR: Tidak perlu update data.children, cukup tambahkan block dengan parentId
    // Call parent handler to add block
    onAddChildBlock(newBlock);
    
    setShowComponentModal(false);
  };

  // Handler untuk update child block
  const handleUpdateChildBlock = (childId, newData) => {
    if (!onUpdateChildBlock) return;
    onUpdateChildBlock(childId, newData);
  };

  // Handler untuk delete child block
  const handleDeleteChildBlock = (childId) => {
    if (!onDeleteChildBlock) return;
    // ✅ ARSITEKTUR BENAR: Tidak perlu update data.children, cukup hapus block
    onDeleteChildBlock(childId);
  };

  // Handler untuk move child block
  const handleMoveChildBlock = (childId, direction) => {
    if (!onMoveChildBlock) return;
    const currentIndex = children.indexOf(childId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= children.length) return;
    
    const newChildren = [...children];
    [newChildren[currentIndex], newChildren[newIndex]] = [newChildren[newIndex], newChildren[currentIndex]];
    handleChange("children", newChildren);
    onMoveChildBlock(childId, direction);
  };

  // Toggle child expand/collapse
  const handleToggleChildExpand = (childId) => {
    const newCollapsed = new Set(collapsedChildIds);
    if (newCollapsed.has(childId)) {
      newCollapsed.delete(childId);
    } else {
      newCollapsed.add(childId);
    }
    setCollapsedChildIds(newCollapsed);
  };

  // Render child component
  const renderChildComponent = (childBlock, childIndex) => {
    const isExpanded = !collapsedChildIds.has(childBlock.id);
    
    const commonProps = {
      data: childBlock.data,
      onUpdate: (newData) => handleUpdateChildBlock(childBlock.id, newData),
      onMoveUp: () => handleMoveChildBlock(childBlock.id, "up"),
      onMoveDown: () => handleMoveChildBlock(childBlock.id, "down"),
      onDelete: () => handleDeleteChildBlock(childBlock.id),
      index: childIndex,
      isExpanded,
      onToggleExpand: () => handleToggleChildExpand(childBlock.id),
    };

    switch (childBlock.type) {
      case "text":
        return <TextComponent {...commonProps} />;
      case "image":
        return <ImageComponent {...commonProps} />;
      case "youtube":
      case "video":
        return <VideoComponent {...commonProps} />;
      case "price":
        return <PriceComponent {...commonProps} />;
      case "testimoni":
        return <TestimoniComponent {...commonProps} />;
      case "list":
        return <ListComponent {...commonProps} />;
      case "form":
        return <FormComponent {...commonProps} productKategori={null} />;
      case "faq":
        return <FAQComponent {...commonProps} productKategori={null} />;
      case "slider":
        return <SliderComponent {...commonProps} />;
      case "button":
        return <ButtonComponent {...commonProps} />;
      case "embed":
        return <EmbedComponent {...commonProps} />;
      case "section":
        return <SectionComponent {...commonProps} allBlocks={allBlocks} onAddChildBlock={onAddChildBlock} onUpdateChildBlock={onUpdateChildBlock} onDeleteChildBlock={onDeleteChildBlock} onMoveChildBlock={onMoveChildBlock} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />;
      case "html":
        return <HTMLComponent {...commonProps} />;
      case "divider":
        return <DividerComponent {...commonProps} />;
      case "scroll-target":
        return <ScrollTargetComponent {...commonProps} />;
      case "animation":
        return <AnimationComponent {...commonProps} />;
      default:
        return <div>Unknown component: {childBlock.type}</div>;
    }
  };

  // Render component grid for modal
  const renderComponentGrid = () => {
    return (
      <div className="component-modal-grid">
        {Object.entries(COMPONENT_CATEGORIES).map(([key, category]) => (
          <div key={key} className="component-category">
            <h3 className="component-category-title">{category.label}</h3>
            <div className="component-grid">
              {category.components.map((component) => {
                const IconComponent = component.icon;
                return (
                  <div
                    key={component.id}
                    className="component-item"
                    onClick={() => handleAddChildComponent(component.id)}
                    title={component.name}
                  >
                    <div 
                      className="component-icon"
                      style={{ backgroundColor: "#f3f4f6" }}
                    >
                      <IconComponent 
                        size={24} 
                        style={{ color: "#6b7280" }}
                      />
                    </div>
                    <span className="component-name">{component.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Border radius options
  const borderRadiusOptions = [
    { label: "None", value: "none" },
    { label: "Small (4px)", value: "4px" },
    { label: "Medium (8px)", value: "8px" },
    { label: "Large (12px)", value: "12px" },
    { label: "XLarge (16px)", value: "16px" },
    { label: "Full (999px)", value: "999px" },
  ];

  // Box shadow options
  const boxShadowOptions = [
    { label: "None", value: "none" },
    { label: "Small", value: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)" },
    { label: "Medium", value: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)" },
    { label: "Large", value: "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)" },
    { label: "XLarge", value: "0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)" },
  ];

  // Responsive type options
  const responsiveTypeOptions = [
    { label: "Vertical", value: "vertical" },
    { label: "Horizontal", value: "horizontal" },
  ];

  // Preset border colors
  const presetBorderColors = [
    "#FF9900", // Primary
    "#000000",
    "#F1A124",
    "#10b981",
    "#ef4444",
    "linear-gradient(90deg, #F1A124 0%, #ef4444 100%)",
  ];

  return (
    <ComponentWrapper
      title="Section"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      {/* Section Content Area */}
      <div className="section-content-area">
        <div className="section-content-header">
          <h4 className="section-content-title">Komponen dalam Section</h4>
          <button
            className="section-add-component-btn"
            onClick={() => setShowComponentModal(true)}
          >
            <span className="section-add-icon">+</span>
            <span>Tambah Komponen</span>
          </button>
        </div>

        {/* Children Components */}
        <div className="section-children-container">
          {childBlocks.length === 0 ? (
            <div className="section-empty-state">
              <p>Belum ada komponen. Klik "Tambah Komponen" untuk menambahkan.</p>
            </div>
          ) : (
            childBlocks.map((childBlock, childIndex) => (
              <div key={childBlock.id} className="section-child-wrapper">
                {renderChildComponent(childBlock, childIndex)}
              </div>
            ))
          )}
        </div>
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
            {/* Margin Settings */}
            <div className="advance-section-group">
              <div className="advance-section-label">Margin</div>
              <div className="advance-margin-grid">
                <div className="advance-margin-item">
                  <label className="advance-margin-label">Margin Kanan</label>
                  <div className="advance-margin-input-wrapper">
                    <InputNumber
                      value={marginRight}
                      onValueChange={(e) => handleChange("marginRight", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-margin-input"
                    />
                    <span className="advance-margin-unit">px</span>
                  </div>
                </div>
                <div className="advance-margin-item">
                  <label className="advance-margin-label">Margin Kiri</label>
                  <div className="advance-margin-input-wrapper">
                    <InputNumber
                      value={marginLeft}
                      onValueChange={(e) => handleChange("marginLeft", e.value || 0)}
                      min={-9999}
                      max={200}
                      className="advance-margin-input"
                    />
                    <span className="advance-margin-unit">px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Margin Antar-komponen */}
            <div className="advance-section-group">
              <div className="advance-section-label">Margin Antar-komponen</div>
              <div className="advance-margin-input-wrapper">
                <InputNumber
                  value={marginBetween}
                  onValueChange={(e) => handleChange("marginBetween", e.value !== null ? e.value : 0)}
                  min={-9999}
                  max={200}
                  className="advance-margin-input"
                />
                <span className="advance-margin-unit">px</span>
              </div>
            </div>

            {/* Border */}
            <div className="advance-section-group">
              <div className="advance-section-label">Border</div>
              <div className="advance-margin-input-wrapper">
                <InputNumber
                  value={border}
                  onValueChange={(e) => handleChange("border", e.value || 0)}
                  min={-9999}
                  max={20}
                  className="advance-margin-input"
                />
                <span className="advance-margin-unit">px</span>
              </div>
            </div>

            {/* Warna Border */}
            <div className="advance-section-group">
              <div className="advance-section-label">Warna Border</div>
              <div className="advance-border-color-grid">
                {presetBorderColors.map((color, idx) => (
                  <button
                    key={idx}
                    className={`advance-border-color-item ${
                      borderColor === color ? "selected" : ""
                    }`}
                    style={{ 
                      background: color,
                      border: color === "#000000" ? "1px solid #ccc" : "none"
                    }}
                    onClick={() => handleChange("borderColor", color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div className="advance-section-group">
              <div className="advance-section-label">Background Section</div>
              <div className="form-field-group">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => handleChange("backgroundColor", e.target.value)}
                  className="advance-color-input"
                />
                <InputText
                  value={backgroundColor}
                  onChange={(e) => handleChange("backgroundColor", e.target.value)}
                  placeholder="#ffffff"
                  className="w-full form-input"
                  style={{ marginTop: "8px" }}
                />
              </div>
            </div>

            {/* Border Radius */}
            <div className="advance-section-group">
              <div className="advance-section-label">Border Radius</div>
              <Dropdown
                value={borderRadius}
                options={borderRadiusOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => handleChange("borderRadius", e.value)}
                className="w-full form-input"
                placeholder="None"
              />
            </div>

            {/* Box Shadow */}
            <div className="advance-section-group">
              <div className="advance-section-label">Box Shadow</div>
              <Dropdown
                value={boxShadow}
                options={boxShadowOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => handleChange("boxShadow", e.value)}
                className="w-full form-input"
                placeholder="None"
              />
            </div>

            {/* Pengaturan Responsive */}
            <div className="advance-section-group">
              <div className="advance-section-label">Pengaturan Responsive</div>
              <div className="advance-section-sublabel">Tipe</div>
              <Dropdown
                value={responsiveType}
                options={responsiveTypeOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => handleChange("responsiveType", e.value)}
                className="w-full form-input"
                placeholder="Vertical"
              />
            </div>

            {/* Pengaturan Lainnya */}
            <div className="advance-section-group">
              <div className="advance-section-label">Pengaturan Lainnya</div>
              <div className="form-field-group">
                <label className="form-label-small">
                  Component ID <span className="required">*</span>
                </label>
                <InputText
                  value={sectionComponentId || ""}
                  onChange={(e) => handleChange("componentId", e.target.value)}
                  placeholder="section-2Kb7LxmXaF"
                  className="w-full form-input"
                />
              </div>
              <div className="form-field-group" style={{ marginTop: "12px" }}>
                <label className="form-label-small">Title</label>
                <InputText
                  value={data.title || ""}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Section"
                  className="w-full form-input"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Component Selection Modal */}
      {showComponentModal && (
        <div 
          className="simple-modal-overlay"
          onClick={() => setShowComponentModal(false)}
        >
          <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
            <div className="simple-modal-header">
              <h2 className="simple-modal-title">Pilih Komponen</h2>
              <button 
                className="simple-modal-close"
                onClick={() => setShowComponentModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="simple-modal-content">
              {renderComponentGrid()}
            </div>
            <div className="simple-modal-footer">
              <button 
                className="simple-modal-cancel"
                onClick={() => setShowComponentModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ComponentWrapper>
  );
}
