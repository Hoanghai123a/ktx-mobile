import React from "react";
import Modal from "./Modal.jsx";

export default function Confirm({
  open,
  title = "Xác nhận",
  message,
  confirmText = "Xóa",
  cancelText = "Hủy",
  danger = true,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="space-y-4">
        <div className="text-sm text-slate-700 whitespace-pre-line">
          {message}
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            className={[
              "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white",
              danger ? "bg-rose-600" : "bg-slate-900",
            ].join(" ")}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
