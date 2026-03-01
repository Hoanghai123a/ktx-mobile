import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../components/ui/Modal.jsx";

export default function LoginModal({
  open,
  onClose,
  onLogin, // async ({ email, password }) => void
  title = "Đăng nhập Admin",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !busy;
  }, [email, password, busy]);

  useEffect(() => {
    if (!open) return;
    // reset nhẹ khi mở modal
    setError("");
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;

    try {
      setBusy(true);
      setError("");
      await onLogin?.({ email: email.trim(), password });
      onClose?.(); // login thành công -> đóng modal
    } catch (err) {
      console.error(err);
      setError(err?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@email.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            autoComplete="email"
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">
            Mật khẩu
          </div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            autoComplete="current-password"
          />
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
            canSubmit
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Hủy
        </button>
      </form>
    </Modal>
  );
}
