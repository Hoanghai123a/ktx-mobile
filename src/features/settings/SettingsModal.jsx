import React, { useEffect, useMemo, useState } from "react";
import { Shield, Save, LogIn, LogOut, FileUp } from "lucide-react";
import { supabase } from "../../services/supabaseClient";

import clsx from "../../components/ui/clsx";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Pill from "../../components/ui/Pill";

export default function SettingsModal({
  open,
  onClose,

  state,
  setState,

  auth,
  setLoginModal,

  // excel import support
  setImportModal,
  importFileRef,

  DEFAULT_SETTINGS,
  saveSettingsToDb,
  requireAdmin,
}) {
  const settings = state.settings;

  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const mergedDraft = useMemo(() => {
    const base = DEFAULT_SETTINGS ?? {};
    const baseAbout = base.about ?? {};
    const d = draft ?? {};
    const dAbout = d.about ?? {};

    return {
      ...base,
      ...d,
      about: {
        ...baseAbout,
        ...dAbout,
      },
    };
  }, [DEFAULT_SETTINGS, draft]);

  return (
    <Modal open={open} title="Cài đặt" onClose={onClose}>
      <div className="space-y-4">
        {/* AUTH */}
        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Quyền Admin</div>
              <div className="mt-1 text-xs text-slate-600">
                {auth.isAdmin
                  ? "Bạn đang đăng nhập."
                  : "Bạn đang ở chế độ xem."}
              </div>
            </div>
            <Pill
              icon={Shield}
              text={auth.isAdmin ? "Admin" : "Viewer"}
              tone={auth.isAdmin ? "green" : "slate"}
            />

            {!auth.isAdmin ? (
              <button
                className="mt-3 rounded-2xl bg-slate-900 px-2 py-2 text-sm font-semibold text-white"
                onClick={() => setLoginModal?.(true)}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Đăng nhập Admin
                </span>
              </button>
            ) : (
              <button
                className="mt-3 rounded-2xl bg-slate-900 px-2 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  await supabase.auth.signOut();
                  onClose?.();
                }}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ABOUT SETTINGS */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Về chúng tôi</div>

          <div className="mt-3 space-y-3">
            <TextField
              label="Tên đơn vị"
              value={mergedDraft.about.companyName || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), companyName: v },
                }))
              }
            />
            <TextField
              label="Địa chỉ"
              value={mergedDraft.about.address || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), address: v },
                }))
              }
            />
            <TextField
              label="Hotline"
              value={mergedDraft.about.hotline || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), hotline: v },
                }))
              }
            />
            <TextField
              label="Email"
              value={mergedDraft.about.email || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), email: v },
                }))
              }
            />
            <TextField
              label="Website"
              value={mergedDraft.about.website || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), website: v },
                }))
              }
            />
            <TextField
              label="Giờ làm việc"
              value={mergedDraft.about.workingHours || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), workingHours: v },
                }))
              }
            />
            <TextField
              label="Link bản đồ (mapUrl)"
              value={mergedDraft.about.mapUrl || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), mapUrl: v },
                }))
              }
            />
            <TextField
              label="Mô tả"
              value={mergedDraft.about.description || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), description: v },
                }))
              }
            />
            <TextField
              label="Tiện ích (ngăn cách bằng dấu phẩy)"
              value={(mergedDraft.about.services || []).join(", ")}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: {
                    ...(s.about || {}),
                    services: v
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  },
                }))
              }
              placeholder="WiFi, Giặt sấy, Căn tin..."
            />
            <TextField
              label="Nội quy"
              value={mergedDraft.about.rules || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), rules: v },
                }))
              }
            />
            <TextField
              label="Thông tin chuyển khoản"
              value={mergedDraft.about.bankInfo || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), bankInfo: v },
                }))
              }
            />
            <TextField
              label="Thông báo Admin"
              value={mergedDraft.about.adminNotice || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  about: { ...(s.about || {}), adminNotice: v },
                }))
              }
            />
          </div>
        </div>

        {/* MAIN SETTINGS */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Thiết lập hiển thị</div>

          <div className="mt-3 space-y-3">
            <TextField
              label="Số cột hiển thị phòng (2-4)"
              type="number"
              value={String(mergedDraft.roomGridCols ?? 3)}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  roomGridCols: Number(v),
                }))
              }
            />
            <TextField
              label="Tiền điện / số"
              type="number"
              value={String(mergedDraft.electricityPrice || 0)}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  electricityPrice: Number(v),
                }))
              }
            />
            <TextField
              label="Tháng đang thu"
              type="month"
              value={mergedDraft.billingMonth || ""}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  billingMonth: v,
                }))
              }
            />

            <div className="mt-2 text-xs text-slate-600">
              <strong>Nếu gặp lỗi 400 khi lưu số điện:</strong>
              <div className="mt-1 space-y-1">
                <div>
                  1️⃣ Bảng cần có unique constraint trên (room_id, month):
                </div>
                <pre className="rounded bg-slate-100 p-2 text-xs">
                  {`alter table electricities add unique (room_id, month);`}
                </pre>
                <div>2️⃣ Hoặc nếu chưa tạo bảng, dùng SQL này:</div>
                <pre className="rounded bg-slate-100 p-2 text-xs">
                  {`create table electricities (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id),
  month text,
  start_reading numeric,
  end_reading numeric,
  paid boolean default false,
  paid_at timestamp,
  unique(room_id, month)
);`}
                </pre>
                <div>
                  3️⃣ Kiểm tra RLS policy - cho phép INSERT/UPDATE trên role của
                  bạn.
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-900">
                Bảo vệ xóa
              </div>
              <div className="mt-2 space-y-2">
                <ToggleRow
                  label="Cho phép xóa cấu trúc (tầng/phòng)"
                  value={!!mergedDraft.canDeleteStructure}
                  onChange={(val) =>
                    setDraft((s) => ({
                      ...s,
                      canDeleteStructure: val,
                    }))
                  }
                />
                <ToggleRow
                  label="Yêu cầu mật khẩu khi xóa"
                  value={!!mergedDraft.requirePasswordOnDelete}
                  onChange={(val) =>
                    setDraft((s) => ({
                      ...s,
                      requirePasswordOnDelete: val,
                    }))
                  }
                />
                <TextField
                  label="Mật khẩu Admin (dùng cho xóa)"
                  type="password"
                  value={mergedDraft.adminPassword || ""}
                  onChange={(v) =>
                    setDraft((s) => ({
                      ...s,
                      adminPassword: v,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* DATA IMPORT */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Dữ liệu</div>
              <div className="mt-1 text-xs text-slate-600">
                (Admin) Nhập dữ liệu NLĐ từ Excel.
              </div>
            </div>
            <Pill icon={FileUp} text="Excel" tone="sky" />
          </div>

          <div className="mt-3">
            <button
              className={clsx(
                "w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                auth.isAdmin
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500",
              )}
              onClick={() =>
                requireAdmin(() => {
                  setImportModal?.((m) => ({ ...m, open: true }));
                  importFileRef?.current?.click();
                })
              }
            >
              <span className="inline-flex items-center justify-center gap-2">
                <FileUp className="h-4 w-4" />
                Nhập Excel
              </span>
            </button>
          </div>
        </div>

        {/* SAVE */}
        <button
          className={clsx(
            "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
            auth.isAdmin
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-500",
          )}
          onClick={() =>
            requireAdmin(async () => {
              const nextSettings = mergedDraft;

              // update local state
              setState((s) => ({ ...s, settings: nextSettings }));

              // save db
              await saveSettingsToDb?.(nextSettings);

              onClose?.();
            })
          }
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Save className="h-4 w-4" />
            Lưu cài đặt
          </span>
        </button>
      </div>
    </Modal>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left"
      onClick={() => onChange?.(!value)}
    >
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-600">{value ? "Bật" : "Tắt"}</div>
      </div>
      <div
        className={clsx(
          "h-6 w-11 rounded-full p-1 transition",
          value ? "bg-emerald-500" : "bg-slate-200",
        )}
      >
        <div
          className={clsx(
            "h-4 w-4 rounded-full bg-white transition",
            value ? "translate-x-5" : "translate-x-0",
          )}
        />
      </div>
    </button>
  );
}
