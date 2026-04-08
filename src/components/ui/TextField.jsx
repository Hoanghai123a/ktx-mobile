import React from "react";

export default function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputRef,
  onFocus,
  onBlur,
  onKeyDown,
  disabled = false,
  error,
}) {
  return (
    <label className="block space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        ref={inputRef}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none ${
          error
            ? "border-rose-400 focus:border-rose-500"
            : "border-slate-200 focus:border-slate-400"
        }`}
      />
      {error ? (
        <div className="text-xs font-medium text-rose-600">
          {typeof error === "string" ? error : "Trường này là bắt buộc"}
        </div>
      ) : null}
    </label>
  );
}
