import React from "react";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

export default function AboutView({ about }) {
  // about: state.settings.about (đẩy từ App vào)
  const safe = about || {};

  const items = [
    safe.address?.trim()
      ? {
          label: "Địa chỉ",
          value: safe.address,
          icon: MapPin,
          href: safe.mapUrl?.trim() || null,
        }
      : null,
    safe.hotline?.trim()
      ? {
          label: "Hotline",
          value: safe.hotline,
          icon: Phone,
          href: `tel:${safe.hotline.replace(/\s/g, "")}`,
        }
      : null,
    safe.email?.trim()
      ? {
          label: "Email",
          value: safe.email,
          icon: Mail,
          href: `mailto:${safe.email}`,
        }
      : null,
    safe.website?.trim()
      ? {
          label: "Website",
          value: safe.website,
          icon: Globe,
          href: safe.website.startsWith("http")
            ? safe.website
            : `https://${safe.website}`,
        }
      : null,
    safe.workingHours?.trim()
      ? {
          label: "Giờ làm việc",
          value: safe.workingHours,
          icon: Clock,
          href: null,
        }
      : null,
  ].filter(Boolean);

  const services = Array.isArray(safe.services)
    ? safe.services.filter((x) => String(x).trim())
    : [];

  const hasRules = !!safe.rules?.trim();
  const hasBank = !!safe.bankInfo?.trim();

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      {safe.adminNotice?.trim() ? (
        <div className="mb-3 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
          <div className="text-xs font-semibold text-amber-900">Thông báo</div>
          <div className="mt-1 whitespace-pre-line text-sm text-amber-900">
            {safe.adminNotice}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="text-lg font-semibold text-slate-900">
          {safe.companyName || "Về chúng tôi"}
        </div>

        {safe.description?.trim() ? (
          <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
            {safe.description}
          </div>
        ) : null}

        {items.length ? (
          <div className="mt-4 space-y-2">
            {items.map((it) => {
              const Icon = it.icon;
              const inner = (
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-xl bg-white ring-1 ring-slate-100">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {it.label}
                    </div>
                    <div className="text-sm text-slate-700">{it.value}</div>
                  </div>
                </div>
              );
              return it.href ? (
                <a
                  key={it.label}
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {inner}
                </a>
              ) : (
                <div key={it.label}>{inner}</div>
              );
            })}
          </div>
        ) : null}

        {services.length ? (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-900">Dịch vụ</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {services.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasRules ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4" />
              Nội quy
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {safe.rules}
            </div>
          </div>
        ) : null}

        {hasBank ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900">
              <CreditCard className="h-4 w-4" />
              Thông tin chuyển khoản
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {safe.bankInfo}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
