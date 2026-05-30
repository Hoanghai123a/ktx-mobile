import React, { useEffect, useMemo, useState } from "react";
import { Shield, Save, LogIn, LogOut, FileUp, Download } from "lucide-react";
import { downloadExcelSample } from "../../services/excelSampleService";

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
  onLogout,

  // excel import support
  importFileRef,

  DEFAULT_SETTINGS,
  saveSettingsToDb,
  requireAdmin,
  wipeDatabase,
  onImportExcel,
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
                onClick={() => {
                  onLogout?.();
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
                <div className="rounded-2xl bg-sky-50 px-3 py-2 text-xs text-sky-700">
                  Khi xóa tầng/phòng, hệ thống sẽ yêu cầu nhập lại mật khẩu đăng nhập hiện tại.
                </div>
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

          <div className="mt-3 flex gap-2">
            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                auth.isAdmin
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500",
              )}
              onClick={() =>
                requireAdmin(() => {
                  importFileRef?.current?.click(); // Kích hoạt input file
                })
              }
            >
              <span className="inline-flex items-center justify-center gap-2">
                <FileUp className="h-4 w-4" />
                Nhập Excel
              </span>
            </button>

            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={downloadExcelSample}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Tải file mẫu
              </span>
            </button>
          </div>
          <input
            type="file"
            ref={importFileRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await onImportExcel(file);
              }
              e.target.value = null; // Reset input file để có thể chọn lại cùng file
            }}
          />
        </div>

        {/* DATABASE TOOLS */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 border-red-100 border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-red-600">Hệ thống</div>
              <div className="mt-1 text-xs text-slate-600">
                Xóa toàn bộ dữ liệu để khởi tạo lại từ đầu.
              </div>
            </div>
            <button
              className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
              onClick={() =>
                requireAdmin(() => {
                  if (
                    confirm(
                      "BẠN CÓ CHẮC CHẮN MUỐN XÓA SẠCH DATABASE? Hành động này không thể hoàn tác.",
                    )
                  ) {
                    wipeDatabase?.();
                  }
                })
              }
            >
              RESET DATABASE
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
