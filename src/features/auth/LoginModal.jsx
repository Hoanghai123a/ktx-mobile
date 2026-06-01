import React from "react";
import { Eye, EyeOff, LogIn, LogOut } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import { authService } from "../../services/api-services";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginModal({
  open,
  onClose,
  authIsAdmin,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
}) {
  const { login, logout } = useAuth();
  const usernameRef = React.useRef(null);
  const passRef = React.useRef(null);
  const lastFieldRef = React.useRef("username");
  const [showPassword, setShowPassword] = React.useState(false);
  const PasswordIcon = showPassword ? EyeOff : Eye;

  const handleLogin = async () => {
    const username = (loginUsername || "").trim().toLowerCase();
    const password = loginPassword || "";
    if (!username || !password) {
      alert("Vui lòng nhập username và mật khẩu.");
      return;
    }

    try {
      const res = await authService.login(username, password);
      login(res);
      onClose();
    } catch (apiErr) {
      console.error("API Login failed:", apiErr);
      alert(
        "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc Backend.",
      );
    }
  };

  const handleLogout = async () => {
    try {
      authService.logout();
      logout();
      onClose();
    } catch (err) {
      alert("Đăng xuất lỗi: " + err.message);
    }
  };

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
          label="Username"
          value={loginUsername}
          onChange={(v) => setLoginUsername(v)}
          placeholder="vd: admin01"
          type="text"
          inputRef={usernameRef}
          onFocus={() => (lastFieldRef.current = "username")}
        />

        <label className="block space-y-1">
          <div className="text-xs font-medium text-slate-600">Mật khẩu</div>
          <div className="relative">
            <input
              autocomplete="current-password"
              type={showPassword ? "text" : "password"}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              ref={passRef}
              onFocus={() => (lastFieldRef.current = "password")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              <PasswordIcon className="h-4 w-4" />
            </button>
          </div>
        </label>

        <button
          className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white"
          onClick={handleLogin}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </span>
        </button>

        {authIsAdmin ? (
          <button
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
            onClick={handleLogout}
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
