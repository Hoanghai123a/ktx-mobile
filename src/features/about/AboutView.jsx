import React from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

export default React.memo(function AboutView({
  state,
  DEFAULT_SETTINGS,
  auth,
  onOpenSettings,
}) {
  const about = state?.settings?.about || DEFAULT_SETTINGS.about;

  const items = [
    about.address?.trim()
      ? {
          label: "Địa chỉ",
          value: about.address,
          icon: MapPin,
          href: about.mapUrl?.trim() || null,
        }
      : null,
    about.hotline?.trim()
      ? {
          label: "Hotline",
          value: about.hotline,
          icon: Phone,
          href: `tel:${about.hotline.replace(/\s/g, "")}`,
        }
      : null,
    about.email?.trim()
      ? {
          label: "Email",
          value: about.email,
          icon: Mail,
          href: `mailto:${about.email}`,
        }
      : null,
    about.website?.trim()
      ? {
          label: "Website",
          value: about.website,
          icon: Globe,
          href: about.website.startsWith("http")
            ? about.website
            : `https://${about.website}`,
        }
      : null,
    about.workingHours?.trim()
      ? {
          label: "Giờ làm việc",
          value: about.workingHours,
          icon: Clock,
          href: null,
        }
      : null,
  ].filter(Boolean);

  const services = Array.isArray(about.services)
    ? about.services.filter((x) => String(x).trim())
    : [];
  const hasRules = !!about.rules?.trim();
  const hasBank = !!about.bankInfo?.trim();

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      {about.adminNotice?.trim() ? (
        <div className="mb-3 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
          <div className="text-xs font-semibold text-amber-900">Thông báo</div>
          <div className="mt-1 whitespace-pre-line text-sm text-amber-900">
            {about.adminNotice}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {about.companyName || "Về chúng tôi"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Thông tin liên hệ & nội quy ký túc xá
            </div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100">
            <Building2 className="h-5 w-5 text-slate-700" />
          </div>
        </div>

        {about.description?.trim() ? (
          <div className="mt-3 whitespace-pre-line text-sm text-slate-700">
            {about.description}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            Chưa có nội dung. Admin có thể vào Cài đặt để cập nhật.
          </div>
        )}

        {items.length ? (
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-100">
            {items.map((it, idx) => {
              const Icon = it.icon;
              const Row = (
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-slate-100">
                    <Icon className="h-4.5 w-4.5 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-500">
                      {it.label}
                    </div>
                    <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                      {it.value}
                    </div>
                  </div>
                  {it.href ? (
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Mở
                    </div>
                  ) : null}
                </div>
              );

              return it.href ? (
                <a
                  key={idx}
                  href={it.href}
                  target={it.href?.startsWith("http") ? "_blank" : undefined}
                  rel={it.href?.startsWith("http") ? "noreferrer" : undefined}
                  className="block active:opacity-70"
                >
                  {Row}
                </a>
              ) : (
                <div key={idx}>{Row}</div>
              );
            })}
          </div>
        ) : null}

        {services.length ? (
          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-900">Tiện ích</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {hasRules ? (
          <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-semibold text-slate-900">
                Nội quy
              </div>
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {about.rules}
            </div>
          </div>
        ) : null}

        {hasBank ? (
          <div className="mt-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-semibold text-slate-900">
                Thanh toán
              </div>
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {about.bankInfo}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <button
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
            onClick={onOpenSettings}
          >
            {auth.isAdmin
              ? "Chỉnh sửa trong Cài đặt"
              : "Xem thông tin trong Cài đặt"}
          </button>
        </div>
      </div>
    </div>
  );
});
