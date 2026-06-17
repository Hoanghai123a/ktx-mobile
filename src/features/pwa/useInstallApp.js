import { useCallback, useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "ktx_install_banner_dismissed_at";
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneMode());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => setIsStandalone(isStandaloneMode());
    syncStandalone();
    media.addEventListener?.("change", syncStandalone);
    window.addEventListener("visibilitychange", syncStandalone);
    return () => {
      media.removeEventListener?.("change", syncStandalone);
      window.removeEventListener("visibilitychange", syncStandalone);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setIsStandalone(isStandaloneMode());
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice?.outcome === "accepted") {
        localStorage.removeItem(DISMISS_KEY);
        setDismissed(false);
      }
      return choice?.outcome || "dismissed";
    }
    if (isAndroid) {
      window.alert(
        "Trình duyệt này chưa cho phép cài trực tiếp. Hãy thử mở bằng Chrome, Edge hoặc trình duyệt hỗ trợ cài ứng dụng rồi bấm Cài đặt lại.",
      );
      return "unavailable";
    }
    window.alert("Trình duyệt hiện tại chưa hỗ trợ cài ứng dụng từ trang này.");
    return "unavailable";
  }, [deferredPrompt, installed, isAndroid, isIos]);

  return useMemo(
    () => ({
      isIos,
      isAndroid,
      installed,
      isStandalone,
      canPromptInstall: Boolean(deferredPrompt),
      guideOpen,
      setGuideOpen,
      requestInstall,
      dismissBanner,
      shouldShowBanner: !installed && !dismissed && (isIos || isAndroid || !!deferredPrompt),
      actionLabel: installed ? "Đã cài" : isIos ? "Hướng dẫn" : "Cài đặt",
    }),
    [deferredPrompt, dismissBanner, dismissed, guideOpen, installed, isAndroid, isIos, isStandalone, requestInstall],
  );
}
