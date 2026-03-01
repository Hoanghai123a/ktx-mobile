import React from "react";

export default function SelectField({
  label,
  value,
  onChange,
  options = [], // [{value, label}]
  disabled = false,
}) {
  return (
    <label className="block w-full">
      {label ? (
        <div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>
      ) : null}

      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
