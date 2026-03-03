import React from "react";
import { LogIn, LogOut } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import { supabase } from "../../services/supabaseClient";

export default function LoginModal({
  open,
  onClose,
  authIsAdmin,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
}) {
  const emailRef = React.useRef(null);
  const passRef = React.useRef(null);
  const lastFieldRef = React.useRef("email");

  return (
    <Modal open={open} title="Đăng nhập" onClose={onClose} zIndex="z-[60]">
      <div className="space-y-3">
        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Quyền Admin</div>
          <div className="mt-1 text-xs text-slate-600">
            Đăng nhập để thêm / xóa / chỉnh sửa. Nếu không, bạn chỉ xem được dữ
            liệu.
          </div>
        </div>

        <TextField
          label="Email"
          value={loginEmail}
          onChange={(v) => setLoginEmail(v)}
          placeholder="admin@..."
          type="email"
          inputRef={emailRef}
          onFocus={() => (lastFieldRef.current = "email")}
        />

        <TextField
          label="Mật khẩu"
          value={loginPassword}
          onChange={(v) => setLoginPassword(v)}
          placeholder="Nhập mật khẩu"
          type="password"
          inputRef={passRef}
          onFocus={() => (lastFieldRef.current = "password")}
        />

        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          onClick={async () => {
            const email = (loginEmail || "").trim();
            const password = loginPassword || "";
            if (!email || !password) {
              alert("Vui lòng nhập email và mật khẩu.");
              return;
            }
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) {
              alert("Đăng nhập thất bại: " + error.message);
              return;
            }
            onClose();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </span>
        </button>

        {authIsAdmin ? (
          <button
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) {
                alert("Đăng xuất lỗi: " + error.message);
                return;
              }
              onClose();
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </span>
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
