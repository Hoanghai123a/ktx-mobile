import React, { useState } from "react";
import { Building2, Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import Pill from "../../components/ui/Pill";
import TextField from "../../components/ui/TextField";
import { authService } from "../../services/api-services";
import { useAuth } from "../../contexts/AuthContext";

function PasswordField({ label, value, onChange, placeholder, visible, onToggle }) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <label className="block space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}

function brandFromSettings(settings) {
  const siteName = String(settings?.siteName || "KTX").trim() || "KTX";
  const logoUrl = String(settings?.logoUrl || settings?.about?.brandLogoUrl || "/logo.png").trim() || "/logo.png";
  return { siteName, logoUrl };
}

export default function AuthScreen({ settings }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isRegister = mode === "register";
  const brand = brandFromSettings(settings);

  async function submit(e) {
    e?.preventDefault?.();
    const nextUsername = username.trim().toLowerCase();
    if (!nextUsername || !password) return alert("Nhập username và mật khẩu.");
    if (isRegister && password.length < 8) return alert("Mật khẩu đăng ký phải có ít nhất 8 ký tự.");
    if (isRegister && password !== confirm) return alert("Mật khẩu xác nhận không khớp.");
    setBusy(true);
    try {
      const res = isRegister
        ? await authService.register({ username: nextUsername, password, name })
        : await authService.login(nextUsername, password);
      if (res?.pending_approval) {
        alert(res.message || "Tài khoản đã được tạo và đang chờ admin phê duyệt.");
        setMode("login");
        return;
      }
      login(res);
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgb(44_120_159)] text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-sky-600">{brand.siteName}</div>
              <div className="text-lg font-semibold text-slate-900">Quản lý tòa nhà</div>
            </div>
          </div>
          <Pill icon={ShieldCheck} text="Bảo mật" tone="sky" />
        </div>

        <div className="flex flex-1 items-center py-6">
          <div className="w-full">
            <div className="mb-5 flex justify-center">
              <img
                src={brand.logoUrl}
                alt={brand.siteName}
                className="h-28 w-28 rounded-3xl object-contain shadow-sm ring-1 ring-sky-100 sm:h-32 sm:w-32"
              />
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
            <div className="mb-4 grid grid-cols-2 rounded-2xl bg-sky-50 p-1 ring-1 ring-sky-100">
              <button
                type="button"
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${!isRegister ? "bg-[rgb(44_120_159)] text-white shadow-sm" : "text-slate-500"}`}
                onClick={() => setMode("login")}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isRegister ? "bg-[rgb(44_120_159)] text-white shadow-sm" : "text-slate-500"}`}
                onClick={() => setMode("register")}
              >
                Đăng ký
              </button>
            </div>

            <form className="space-y-3" onSubmit={submit}>
              {isRegister ? (
                <TextField label="Tên hiển thị" value={name} onChange={setName} placeholder="Nguyễn Văn A" />
              ) : null}
              <TextField label="Username" value={username} onChange={setUsername} placeholder="vd: admin01" type="text" />
              <PasswordField label="Mật khẩu" value={password} onChange={setPassword} placeholder="Nhập mật khẩu" visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              {isRegister ? (
                <PasswordField label="Nhập lại mật khẩu" value={confirm} onChange={setConfirm} placeholder="Nhập lại mật khẩu" visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[rgb(36_99_132)] disabled:opacity-60"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {busy ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
                </span>
              </button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
