import { CheckCircle2, Download, Share2, X } from "lucide-react";
import Modal from "../../components/ui/Modal";

const BRAND = "rgb(44 120 159)";
const BRAND_DARK = "rgb(36 99 132)";

const IOS_STEPS = [
  { image: "/install-ios/B1.jpg", title: "Bước 1", text: "Nhấp vào dấu 3 chấm" },
  { image: "/install-ios/B2.jpg", title: "Bước 2", text: "Chọn Chia sẻ" },
  { image: "/install-ios/B3.jpg", title: "Bước 3", text: "Chọn Xem thêm" },
  { image: "/install-ios/B4.jpg", title: "Bước 4", text: "Chọn Thêm vào Màn hình chính" },
  { image: "/install-ios/B5.jpg", title: "Bước 5", text: "Chọn Thêm" },
];

const ANDROID_STEPS = [
  { title: "Bước 1", text: "Mở trang web này bằng trình duyệt bất kỳ trên Android." },
  { title: "Bước 2", text: "Nhấn menu của trình duyệt như dấu 3 chấm, nút chia sẻ hoặc thanh công cụ." },
  { title: "Bước 3", text: "Chọn Cài ứng dụng, Thêm vào màn hình chính hoặc mục tương tự." },
  { title: "Bước 4", text: "Xác nhận Cài đặt hoặc Thêm để tạo biểu tượng ngoài màn hình chính." },
];

function brandFromSettings(settings) {
  return {
    siteName: String(settings?.siteName || "KTX").trim() || "KTX",
    logoUrl: String(settings?.logoUrl || settings?.about?.brandLogoUrl || "/logo.png").trim() || "/logo.png",
  };
}

function BrandLogo({ settings, className = "h-10 w-10 rounded-2xl" }) {
  const brand = brandFromSettings(settings);
  return (
    <div className={`${className} shrink-0 overflow-hidden bg-white ring-1 ring-slate-200`}>
      <img src={brand.logoUrl} alt={brand.siteName} className="h-full w-full object-cover" />
    </div>
  );
}

export function InstallGuideModal({ open, onClose, settings, installApp }) {
  const brand = brandFromSettings(settings);
  const isAndroidGuide = installApp?.guidePlatform === "android";
  const steps = isAndroidGuide ? ANDROID_STEPS : IOS_STEPS;
  return (
    <Modal open={open} title={`Cài ${brand.siteName} ra màn hình chính`} onClose={onClose} zIndex="z-[90]">
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
          <BrandLogo settings={settings} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{brand.siteName}</div>
            <div className="text-xs text-slate-600">Biểu tượng sẽ hiển thị trên màn hình chính.</div>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {isAndroidGuide
            ? "Tên nút có thể khác nhau theo từng trình duyệt Android, nhưng đều có thể cài trực tiếp từ trang web này."
            : "Làm theo 5 bước trên iPhone/iPad để thêm app vào màn hình chính."}
        </div>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                  {step.title.replace("Bước ", "")}
                </div>
                <div className="min-w-0 text-sm font-semibold text-slate-900">
                  {step.title}: {step.text}
                </div>
              </div>
              {"image" in step ? (
                <img src={step.image} alt={`${step.title}: ${step.text}`} className="w-full rounded-xl border border-slate-100 bg-slate-100 object-contain" loading="lazy" />
              ) : null}
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

export function InstallAppBanner({ installApp, settings }) {
  const brand = brandFromSettings(settings);
  if (!installApp?.shouldShowBanner) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-[45] mx-auto w-full max-w-md px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
        <div className="flex items-start gap-3">
          <BrandLogo settings={settings} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">Cài {brand.siteName} ra màn hình chính</div>
            <div className="mt-0.5 text-xs leading-5 text-slate-600">
              {installApp.canPromptInstall
                ? "Truy cập nhanh hơn như một ứng dụng trên điện thoại."
                : "Xem cách thêm app từ trình duyệt Android hoặc iPhone/iPad."}
            </div>
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

export function InstallAppSettingsCard({ installApp, settings }) {
  const brand = brandFromSettings(settings);
  if (!installApp) return null;
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <BrandLogo settings={settings} className="h-11 w-11 rounded-2xl" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Cài {brand.siteName} ra màn hình chính</div>
            <div className="mt-1 text-xs leading-5 text-slate-600">
              {installApp.installed
                ? "Ứng dụng đã được cài trên màn hình chính."
                : installApp.isIos
                  ? "Xem hướng dẫn 5 bước cho iPhone/iPad."
                  : installApp.canPromptInstall
                    ? "Cài nhanh bằng hộp cài đặt của trình duyệt."
                    : "Xem hướng dẫn cài từ các trình duyệt Android khác nhau."}
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
