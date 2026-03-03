import React from "react";
import Modal from "./Modal";

export default function Confirm({
  open,
  title = "Xác nhận",
  message,
  confirmText = "Xóa",
  onCancel,
  onConfirm,
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
