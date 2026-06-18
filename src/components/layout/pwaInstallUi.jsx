import React from "react";
import { brandFromSettings } from "./pwaInstallConstants";

export function BrandLogo({ settings, className = "h-10 w-10 rounded-2xl" }) {
  const brand = brandFromSettings(settings);
  return (
    <div
      className={`${className} shrink-0 overflow-hidden bg-white ring-1 ring-slate-200`}
    >
      <img
        src={brand.logoUrl}
        alt={brand.siteName}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
