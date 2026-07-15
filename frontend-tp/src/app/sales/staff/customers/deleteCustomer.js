"use client";

import "@/styles/sales/customer.css";

export default function DeleteCustomerModal({ customer, onClose, onConfirm }) {
if (!customer) return null;

return ( <div className="modal-overlay"> <div className="modal-card modal-delete">
{/* HEADER */} <div className="modal-header"> <h2>Hapus Customer</h2> <button className="modal-close" onClick={onClose}> <i className="pi pi-times"></i> </button> </div>
    {/* BODY */}
    <div className="modal-body">
      <p>
        Apakah kamu yakin ingin menghapus customer{" "}
        <strong>{customer.nama}</strong>?
      </p>
      <p className="text-muted">
        Tindakan ini tidak dapat dibatalkan dan data akan dihapus permanen.
      </p>
    </div>

    {/* FOOTER */}
    <div className="modal-footer">
      <button className="btn-cancel" onClick={onClose}>
        Batal
      </button>
      <button className="btn-delete" onClick={onConfirm}>
        Hapus
      </button>
    </div>
  </div>
</div>
);
}
