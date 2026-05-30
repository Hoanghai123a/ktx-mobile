import React from "react";
import Modal from "../../components/ui/Modal";

export default function DeleteGuardModal({
  open,
  title,
  message,
  password,
  setPassword,
  onClose,
  onConfirm,
}) {
  return (
    <Modal open={open} title={title || "Xác nhận xóa"} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm text-slate-700">{message}</div>

        <label className="block text-sm font-medium text-slate-700">
          Nhập mật khẩu Đăng nhập ?? x?c nh?n
        </label>
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu Đăng nhập"
        />

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            Xóa
          </button>
        </div>
      </div>
    </Modal>
  );
}
