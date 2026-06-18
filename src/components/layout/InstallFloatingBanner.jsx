import React from "react";
import { Download, Share2, X } from "lucide-react";
import { BRAND, brandFromSettings } from "./pwaInstallConstants";
import { BrandLogo } from "./pwaInstallUi.jsx";

export default function InstallFloatingBanner({ installApp, settings }) {
  const brand = brandFromSettings(settings);
  if (!installApp?.shouldShowBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[45] mx-auto w-full max-w-md px-4 app-safe-bottom">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
        <div className="flex items-start gap-3">
          <BrandLogo settings={settings} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">
              Cài {brand.siteName} ra màn hình chính
            </div>
            <div className="mt-0.5 text-xs leading-5 text-slate-600">
              {installApp.isIos
                ? "Xem hướng dẫn thêm app trên iPhone/iPad."
                : installApp.canPromptInstall
                  ? "Nhấn Cài đặt để mở hộp cài ứng dụng ngay trên Android."
                  : "Nếu trình duyệt Android không mở hộp cài trực tiếp, app sẽ hướng dẫn thêm ra màn hình chính."}
            </div>
            <button
              type="button"
              onClick={installApp.requestInstall}
              className="mt-2 rounded-2xl px-4 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: BRAND }}
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
          <button
            type="button"
            onClick={installApp.dismissBanner}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Đóng nhắc cài app"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
