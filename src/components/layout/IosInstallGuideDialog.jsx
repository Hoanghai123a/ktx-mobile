import React from "react";
import { CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal";
import {
  BRAND,
  IOS_INSTALL_STEPS,
  brandFromSettings,
} from "./pwaInstallConstants";
import { BrandLogo } from "./pwaInstallUi.jsx";

export default function IosInstallGuideDialog({
  open,
  onClose,
  settings,
  platform = "ios",
}) {
  const brand = brandFromSettings(settings);
  const isAndroidGuide = platform === "android" || platform === "manual";
  const androidSteps = [
    "Nhấn menu của trình duyệt đang dùng.",
    'Chọn "Thêm vào màn hình chính", "Cài ứng dụng" hoặc mục tương tự.',
    'Xác nhận "Cài đặt" hoặc "Thêm".',
    "Mở lại app từ biểu tượng vừa tạo trên màn hình chính.",
  ];

  return (
    <Modal
      open={open}
      title={`Cài ${brand.siteName} ra màn hình chính`}
      onClose={onClose}
      zIndex="z-[90]"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
          <BrandLogo settings={settings} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {brand.siteName}
            </div>
            <div className="text-xs text-slate-600">
              Biểu tượng sẽ hiển thị trên màn hình chính.
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {isAndroidGuide
            ? "Trình duyệt hiện tại chưa mở được hộp cài đặt chuẩn, bạn vẫn có thể thêm app ra màn hình chính theo các bước dưới đây."
            : "Làm theo 5 bước trên iPhone/iPad để thêm app vào màn hình chính."}
        </div>
        {isAndroidGuide ? (
          <div className="space-y-3">
            {androidSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 text-sm font-semibold leading-6 text-slate-900">
                    {step}
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              Tên nút có thể khác nhau giữa Chrome, Samsung Internet, Edge, Opera
              hoặc các trình duyệt/webview khác, nhưng thường đều nằm trong menu
              của trình duyệt.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {IOS_INSTALL_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {step.title.replace("Bước ", "")}
                  </div>
                  <div className="min-w-0 text-sm font-semibold text-slate-900">
                    {step.title}: {step.text}
                  </div>
                </div>
                <img
                  src={step.image}
                  alt={`${step.title}: ${step.text}`}
                  className="w-full rounded-xl border border-slate-100 bg-slate-100 object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
        <div
          className="rounded-2xl px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: BRAND }}
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Hoàn thành: mở app từ biểu tượng trên màn hình chính.
          </span>
        </div>
      </div>
    </Modal>
  );
}
