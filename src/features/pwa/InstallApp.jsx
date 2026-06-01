import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Share2, Smartphone, X } from "lucide-react";
import Modal from "../../components/ui/Modal";

const DISMISS_KEY = "ktx_install_banner_dismissed_at";
const DAY_MS = 24 * 60 * 60 * 1000;
const BRAND = "rgb(44 120 159)";
const BRAND_DARK = "rgb(36 99 132)";

const IOS_STEPS = [
  { image: "/install-ios/B1.jpg", title: "Bước 1", text: "Nhấp vào dấu 3 chấm" },
  { image: "/install-ios/B2.jpg", title: "Bước 2", text: "Chọn Chia sẻ" },
  { image: "/install-ios/B3.jpg", title: "Bước 3", text: "Chọn Xem thêm" },
  { image: "/install-ios/B4.jpg", title: "Bước 4", text: "Chọn Thêm vào Màn hình chính" },
  { image: "/install-ios/B5.jpg", title: "Bước 5", text: "Chọn Thêm" },
];

function getPlatform() {
  if (typeof window === "undefined") return { isIos: false, isAndroid: false };
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const touchMac = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return {
    isIos: /iphone|ipad|ipod/i.test(ua) || touchMac,
    isAndroid: /android/i.test(ua),
  };
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function dismissedRecently() {
  const value = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return value > 0 && Date.now() - value < DAY_MS;
}

export function useInstallApp() {
  const [{ isIos, isAndroid }] = useState(() => getPlatform());
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const [guideOpen, setGuideOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => dismissedRecently());

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!dismissed) return undefined;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const remaining = DAY_MS - (Date.now() - dismissedAt);
    if (remaining <= 0) {
      setDismissed(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setDismissed(false), remaining);
    return () => window.clearTimeout(timer);
  }, [dismissed]);

  const requestInstall = useCallback(async () => {
    if (installed) return "installed";
    if (isIos) {
      setGuideOpen(true);
      return "ios-guide";
    }
    if (!deferredPrompt) {
      window.alert("Vui lòng mở bằng Chrome trên Android, tải lại trang rồi bấm Cài đặt.");
      return "unavailable";
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice?.outcome === "accepted") {
      localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    }
    return choice?.outcome || "dismissed";
  }, [deferredPrompt, installed, isIos]);

  return useMemo(
    () => ({
      isIos,
      isAndroid,
      installed,
      guideOpen,
      setGuideOpen,
      requestInstall,
      dismissBanner,
      shouldShowBanner: !installed && !dismissed && (isIos || isAndroid || !!deferredPrompt),
      actionLabel: installed ? "Đã cài" : isIos ? "Hướng dẫn" : "Cài đặt",
    }),
    [deferredPrompt, dismissBanner, dismissed, guideOpen, installed, isAndroid, isIos, requestInstall],
  );
}

export function InstallGuideModal({ open, onClose }) {
  return (
    <Modal open={open} title="Cài app ra màn hình chính" onClose={onClose} zIndex="z-[90]">
      <div className="space-y-3">
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          Làm theo 5 bước trên iPhone/iPad để thêm app vào màn hình chính.
        </div>
        <div className="space-y-3">
          {IOS_STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                  {step.title.replace("Bước ", "")}
                </div>
                <div className="min-w-0 text-sm font-semibold text-slate-900">
                  {step.title}: {step.text}
                </div>
              </div>
              <img src={step.image} alt={`${step.title}: ${step.text}`} className="w-full rounded-xl border border-slate-100 bg-slate-100 object-contain" loading="lazy" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: BRAND }}>
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Hoàn thành: mở app từ biểu tượng trên màn hình chính.</span>
        </div>
      </div>
    </Modal>
  );
}

export function InstallAppBanner({ installApp }) {
  if (!installApp?.shouldShowBanner) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-[45] mx-auto w-full max-w-md px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white" style={{ backgroundColor: BRAND }}>
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">Cài app ra màn hình chính</div>
            <div className="mt-0.5 text-xs leading-5 text-slate-600">Truy cập nhanh hơn như một ứng dụng trên điện thoại.</div>
            <button type="button" onClick={installApp.requestInstall} className="mt-2 rounded-2xl px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
              <span className="inline-flex items-center gap-1.5">
                {installApp.isIos ? <Share2 className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {installApp.actionLabel}
              </span>
            </button>
          </div>
          <button type="button" onClick={installApp.dismissBanner} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Đóng nhắc cài app">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function InstallAppSettingsCard({ installApp }) {
  if (!installApp) return null;
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" style={{ backgroundColor: BRAND }}>
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Cài app ra màn hình chính</div>
            <div className="mt-1 text-xs leading-5 text-slate-600">
              {installApp.installed ? "Ứng dụng đã được cài trên màn hình chính." : installApp.isIos ? "Xem hướng dẫn 5 bước cho iPhone/iPad." : "Cài nhanh bằng hộp cài đặt của trình duyệt."}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={installApp.installed}
          onClick={installApp.requestInstall}
          className="shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: installApp.installed ? "rgb(148 163 184)" : BRAND_DARK }}
        >
          <span className="inline-flex items-center gap-1.5">
            {installApp.isIos ? <Share2 className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {installApp.actionLabel}
          </span>
        </button>
      </div>
    </div>
  );
}
