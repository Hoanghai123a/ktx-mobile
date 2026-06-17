import React from "react";
import { Download, Share2 } from "lucide-react";
import {
  BRAND_DARK,
  BrandLogo,
  brandFromSettings,
} from "./pwaInstallUi.jsx";

export default function PwaInstallSettingsCard({ installApp, settings }) {
  const brand = brandFromSettings(settings);
  if (!installApp) return null;

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <BrandLogo settings={settings} className="h-11 w-11 rounded-2xl" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              Cài {brand.siteName} ra màn hình chính
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-600">
              {installApp.installed
                ? "Ứng dụng đã được cài trên màn hình chính."
                : installApp.isIos
                  ? "Xem hướng dẫn 5 bước cho iPhone/iPad."
                  : installApp.canPromptInstall
                    ? "Cài nhanh bằng hộp cài đặt của trình duyệt."
                    : "Nếu trình duyệt Android không hỗ trợ prompt, app sẽ hướng dẫn thêm ra màn hình chính."}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={installApp.installed}
          onClick={installApp.requestInstall}
          className="shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          style={{
            backgroundColor: installApp.installed
              ? "rgb(148 163 184)"
              : BRAND_DARK,
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            {installApp.isIos ? (
              <Share2 className="h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {installApp.actionLabel}
          </span>
        </button>
      </div>
    </div>
  );
}
