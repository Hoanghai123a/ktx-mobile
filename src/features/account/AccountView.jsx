import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { authService } from "../../services/api-services";

const T = {
  account: "T\u00e0i kho\u1ea3n",
  contactAdmin: "Li\u00ean h\u1ec7 admin",
  hidePassword: "\u1ea8n m\u1eadt kh\u1ea9u",
  showPassword: "Hi\u1ec7n m\u1eadt kh\u1ea9u",
  systemAdmin: "Qu\u1ea3n tr\u1ecb h\u1ec7 th\u1ed1ng",
  pendingApproval: "Ch\u1edd ph\u00ea duy\u1ec7t",
  user: "Ng\u01b0\u1eddi d\u00f9ng",
  accountMissing:
    "Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin t\u00e0i kho\u1ea3n.",
  passwordRequired:
    "Nh\u1eadp \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin \u0111\u1ed5i m\u1eadt kh\u1ea9u.",
  passwordMin:
    "M\u1eadt kh\u1ea9u m\u1edbi c\u1ea7n t\u1ed1i thi\u1ec3u 8 k\u00fd t\u1ef1.",
  passwordMismatch:
    "M\u1eadt kh\u1ea9u x\u00e1c nh\u1eadn kh\u00f4ng kh\u1edbp.",
  passwordChanged: "\u0110\u00e3 \u0111\u1ed5i m\u1eadt kh\u1ea9u.",
  passwordChangeFailed:
    "Kh\u00f4ng \u0111\u1ed5i \u0111\u01b0\u1ee3c m\u1eadt kh\u1ea9u.",
  logout: "\u0110\u0103ng xu\u1ea5t",
  displayName: "T\u00ean hi\u1ec3n th\u1ecb",
  changePassword: "\u0110\u1ed5i m\u1eadt kh\u1ea9u",
  currentPassword: "M\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i",
  currentPasswordPlaceholder: "Nh\u1eadp m\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i",
  newPassword: "M\u1eadt kh\u1ea9u m\u1edbi",
  newPasswordPlaceholder: "T\u1ed1i thi\u1ec3u 8 k\u00fd t\u1ef1",
  confirmNewPassword: "Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u m\u1edbi",
  confirmNewPasswordPlaceholder:
    "Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u m\u1edbi",
  changing: "\u0110ang \u0111\u1ed5i...",
  saveNewPassword: "L\u01b0u m\u1eadt kh\u1ea9u m\u1edbi",
  contactHint:
    "Th\u00f4ng tin h\u1ed7 tr\u1ee3 t\u00e0i kho\u1ea3n v\u00e0 quy\u1ec1n truy c\u1eadp.",
  adminOwner: "Admin ph\u1ee5 tr\u00e1ch",
  phone: "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i",
  noContact:
    "Admin ch\u01b0a c\u1eadp nh\u1eadt th\u00f4ng tin li\u00ean h\u1ec7.",
};

function FieldRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
}) {
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
          title={visible ? T.hidePassword : T.showPassword}
          aria-label={visible ? T.hidePassword : T.showPassword}
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}

function ContactRow({ icon: Icon, label, value, href }) {
  if (!String(value || "").trim()) return null;
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sky-700 ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
  return href ? (
    <a
      className="block active:opacity-70"
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      {body}
    </a>
  ) : (
    body
  );
}

function tabClass(active) {
  return (
    "rounded-xl px-3 py-2.5 text-sm font-semibold transition " +
    (active ? "bg-[rgb(44_120_159)] text-white shadow-sm" : "text-sky-800")
  );
}

export default function AccountView({ user, settings }) {
  const [page, setPage] = useState("account");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const contact = settings?.adminContact || {};
  const hasContact = [
    contact.name,
    contact.phone,
    contact.email,
    contact.zalo,
    contact.note,
  ].some((x) => String(x || "").trim());
  const displayName = user?.name || user?.username || T.account;
  const roleText = useMemo(() => {
    if (user?.role === "admin" || user?.isAdmin === true) return T.systemAdmin;
    if (user?.approved === false) return T.pendingApproval;
    return T.user;
  }, [user]);

  async function submitPassword(e) {
    e?.preventDefault?.();
    if (!user?.id) return alert(T.accountMissing);
    if (!currentPassword || !newPassword || !confirmPassword)
      return alert(T.passwordRequired);
    if (newPassword.length < 8) return alert(T.passwordMin);
    if (newPassword !== confirmPassword) return alert(T.passwordMismatch);

    setBusy(true);
    try {
      await authService.changePassword(user.id, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert(T.passwordChanged);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          T.passwordChangeFailed,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-24">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sky-100 p-1 shadow-sm ring-1 ring-sky-200">
        <button
          type="button"
          className={tabClass(page === "account")}
          onClick={() => setPage("account")}
        >
          {T.account}
        </button>
        <button
          type="button"
          className={tabClass(page === "contact")}
          onClick={() => setPage("contact")}
        >
          {T.contactAdmin}
        </button>
      </div>

      {page === "account" ? (
        <>
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
                  <UserCircle className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {displayName}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleText}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <FieldRow label={T.displayName} value={user?.name} />
              <FieldRow label="Username" value={user?.username} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-sky-700" />
              {T.changePassword}
            </div>
            <form className="mt-3 space-y-3" onSubmit={submitPassword}>
              <PasswordInput
                label={T.currentPassword}
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder={T.currentPasswordPlaceholder}
                visible={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
              />
              <PasswordInput
                label={T.newPassword}
                value={newPassword}
                onChange={setNewPassword}
                placeholder={T.newPasswordPlaceholder}
                visible={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
              <PasswordInput
                label={T.confirmNewPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={T.confirmNewPasswordPlaceholder}
                visible={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[rgb(36_99_132)] disabled:opacity-60"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {busy ? T.changing : T.saveNewPassword}
                </span>
              </button>
            </form>
          </section>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-sky-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                {T.contactAdmin}
              </div>
              <div className="mt-1 text-xs text-slate-500">{T.contactHint}</div>
            </div>
          </div>
          {hasContact ? (
            <div className="mt-4 space-y-2">
              <FieldRow label={T.adminOwner} value={contact.name} />
              <ContactRow
                icon={Phone}
                label={T.phone}
                value={contact.phone}
                href={
                  contact.phone
                    ? "tel:" + String(contact.phone).replace(/\s/g, "")
                    : null
                }
              />
              <ContactRow
                icon={Mail}
                label="Email"
                value={contact.email}
                href={contact.email ? "mailto:" + contact.email : null}
              />
              <ContactRow
                icon={MessageCircle}
                label="Zalo"
                value={contact.zalo}
                href={
                  String(contact.zalo || "").startsWith("http")
                    ? contact.zalo
                    : null
                }
              />
              {contact.note ? (
                <div className="whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {contact.note}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {T.noContact}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
