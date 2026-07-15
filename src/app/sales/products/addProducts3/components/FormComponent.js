"use client";

import ComponentWrapper from "./ComponentWrapper";

export default function FormComponent({
  data = {},
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
  index,
  productKategori,
  isExpanded,
  onToggleExpand,
  isRequired = false,
}) {
  return (
    <ComponentWrapper
      title="Form Pemesanan"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isRequired={isRequired}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="form-component-content">
        <div className="form-section-divider">
          <h4 className="form-section-title">Informasi Dasar Form Pemesanan</h4>
          <p className="form-section-desc">Form ini muncul di preview selama blok ini ada di halaman</p>
        </div>

        <div className="form-info-box">
          <p className="text-sm text-gray-600">
            Form pemesanan akan menampilkan field berikut:
          </p>
          <ul className="form-info-list">
            <li>Nama Lengkap (wajib)</li>
            <li>No. WhatsApp (wajib)</li>
            <li>Email (wajib)</li>
            <li>Alamat (wajib)</li>
          </ul>
        </div>
      </div>
    </ComponentWrapper>
  );
}
