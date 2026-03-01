import React from "react";

export default function Empty({ title = "Trống", hint, action }) {
  return (
    <div className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      {hint ? <div className="mt-1 text-sm text-slate-600">{hint}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
