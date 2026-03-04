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
          /* Khối bao ngoài: Tạo khung, bo góc và đường kẻ giữa các hàng */
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-100 overflow-hidden">
            {items.map((it, idx) => {
              const Icon = it.icon;

              // Nội dung hàng (Row)
              const Row = (
                <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 transition-colors">
                  {/* Khối Icon bên trái */}
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100">
                    <Icon className="h-4.5 w-4.5 text-slate-700" />
                  </div>

                  {/* Nội dung ở giữa - Cần min-w-0 để không vỡ layout */}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-500">
                      {it.label}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {it.value}
                    </div>
                  </div>

                  {/* Chữ "Mở" ở góc phải (Chỉ hiện nếu có href) */}
                  {it.href && (
                    <div className="flex items-center gap-1 text-xs font-bold text-[#68b8ff]">
                      Mở
                      {/* Optional: Thêm một icon mũi tên nhỏ nếu muốn giống UI hiện đại */}
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );

              // Render dạng link hoặc div dựa trên sự tồn tại của href
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
