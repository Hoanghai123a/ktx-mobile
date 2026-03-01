import React from "react";

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2",
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700",
      )}
    >
      {Icon ? (
        <Icon
          className={clsx("h-5 w-5", active ? "text-white" : "text-slate-700")}
        />
      ) : null}
      <div
        className={clsx(
          "text-[11px] font-semibold",
          active ? "text-white" : "text-slate-700",
        )}
      >
        {label}
      </div>
    </button>
  );
}
