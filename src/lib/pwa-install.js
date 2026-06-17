import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DISMISS_KEY = "ktx_install_banner_dismissed_at";
const DAY_MS = 24 * 60 * 60 * 1000;
const DISMISS_WINDOW_MS = 7 * DAY_MS;

let listenersInstalled = false;
let deferredPrompt = null;
let installed = false;
let isStandalone = false;
const subscribers = new Set();

function getPlatform() {
  if (typeof window === "undefined") return { isIos: false, isAndroid: false };
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const touchMac =
    platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return {
    isIos: /iphone|ipad|ipod/i.test(ua) || touchMac,
    isAndroid: /android/i.test(ua),
  };
}

export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export function isIosDevice() {
  return getPlatform().isIos;
}

export function isAndroidDevice() {
  return getPlatform().isAndroid;
}

function dismissedRecently() {
  if (typeof window === "undefined") return false;
  try {
    const value = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return value > 0 && Date.now() - value < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

function notifySubscribers() {
  const snapshot = getPwaInstallSnapshot();
  for (const subscriber of subscribers) subscriber(snapshot);
}

export function getPwaInstallSnapshot() {
  return {
    deferredPrompt,
    installed,
    isStandalone,
    dismissed: dismissedRecently(),
  };
}

export function subscribePwaInstall(listener) {
  subscribers.add(listener);
  listener(getPwaInstallSnapshot());
  return () => subscribers.delete(listener);
}

export function installPwaPromptListeners() {
  if (typeof window === "undefined" || listenersInstalled) return;
  listenersInstalled = true;

  const syncStandalone = () => {
    isStandalone = isStandaloneMode();
    if (isStandalone) installed = true;
    notifySubscribers();
  };

  const onBeforeInstallPrompt = (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notifySubscribers();
  };

  const onInstalled = () => {
    installed = true;
    isStandalone = isStandaloneMode();
    deferredPrompt = null;
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // Ignore localStorage errors in private mode / restricted contexts.
    }
    notifySubscribers();
  };

  installed = isStandaloneMode();
  isStandalone = installed;

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onInstalled);
  window.addEventListener("visibilitychange", syncStandalone);
  window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.(
    "change",
    syncStandalone,
  );

  syncStandalone();
}

export function dismissInstallBanner() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignore localStorage errors in private mode / restricted contexts.
  }
  notifySubscribers();
}

export function usePwaInstall() {
  const platformRef = useRef(getPlatform());
  const [snapshot, setSnapshot] = useState(() => {
    installed = isStandaloneMode();
    isStandalone = installed;
    return getPwaInstallSnapshot();
  });
  const [guideMode, setGuideMode] = useState(null);

  useEffect(() => {
    installPwaPromptListeners();
    return subscribePwaInstall(setSnapshot);
  }, []);

  useEffect(() => {
    if (!snapshot.dismissed) return undefined;
    if (typeof window === "undefined") return undefined;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {
      dismissedAt = 0;
    }

    const remaining = DISMISS_WINDOW_MS - (Date.now() - dismissedAt);
    if (remaining <= 0) {
      notifySubscribers();
      return undefined;
    }

    const timer = window.setTimeout(() => notifySubscribers(), remaining);
    return () => window.clearTimeout(timer);
  }, [snapshot.dismissed]);

  const requestInstall = useCallback(async () => {
    if (snapshot.installed) return "installed";
    if (platformRef.current.isIos) {
      setGuideMode("ios");
      return "ios-guide";
    }

    const promptEvent = deferredPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        deferredPrompt = null;
        notifySubscribers();
        if (choice?.outcome === "accepted") {
          try {
            localStorage.removeItem(DISMISS_KEY);
          } catch {
            // Ignore localStorage errors in private mode / restricted contexts.
          }
          notifySubscribers();
        }
        return choice?.outcome || "dismissed";
      } catch {
        deferredPrompt = null;
        notifySubscribers();
        setGuideMode("android");
        return "android-guide";
      }
    }

    setGuideMode("android");
    return platformRef.current.isAndroid ? "android-guide" : "manual-guide";
  }, [snapshot.installed]);

  return useMemo(
    () => ({
      ...platformRef.current,
      installed: snapshot.installed,
      isStandalone: snapshot.isStandalone,
      canPromptInstall: Boolean(snapshot.deferredPrompt),
      guideOpen: Boolean(guideMode),
      guideMode,
      setGuideOpen: (open) => {
        if (!open) {
          setGuideMode(null);
          return;
        }
        setGuideMode((current) => {
          if (current) return current;
          return platformRef.current.isIos ? "ios" : "android";
        });
      },
      requestInstall,
      dismissBanner: dismissInstallBanner,
      shouldShowBanner:
        !snapshot.installed &&
        !snapshot.dismissed &&
        (platformRef.current.isIos ||
          platformRef.current.isAndroid ||
          !!snapshot.deferredPrompt),
      actionLabel: snapshot.installed
        ? "Đã cài"
        : platformRef.current.isIos
          ? "Hướng dẫn"
          : "Cài đặt",
    }),
    [guideMode, requestInstall, snapshot.deferredPrompt, snapshot.dismissed, snapshot.installed, snapshot.isStandalone],
  );
}
