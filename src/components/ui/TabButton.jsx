import React from "react";
import clsx from "./clsx";

export default function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2",
        active ? "text-slate-900" : "text-slate-500",
      )}
    >
      <Icon className={clsx("h-5 w-5", active ? "" : "opacity-80")} />
      <span
        className={clsx("text-[11px] font-medium", active ? "" : "opacity-90")}
      >
        {label}
      </span>
    </button>
  );
}
