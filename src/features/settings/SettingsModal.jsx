import React, { useEffect, useMemo, useState } from "react";
import { Save, FileUp, Download } from "lucide-react";
import { downloadExcelSample } from "../../services/excelSampleService";

import clsx from "../../components/ui/clsx";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Pill from "../../components/ui/Pill";
import { InstallAppSettingsCard } from "../pwa/InstallApp";

export default function SettingsModal({
  open,
  onClose,

  state,
  setState,

  auth,
  // excel import support
  importFileRef,

  DEFAULT_SETTINGS,
  saveSettingsToDb,
  requireAdmin,
  onImportExcel,
  installApp,
}) {
  const settings = state.settings;

  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const mergedDraft = useMemo(() => {
    const base = DEFAULT_SETTINGS ?? {};
    const baseAbout = base.about ?? {};
    const baseAdminContact = base.adminContact ?? {};
    const d = draft ?? {};
    const dAbout = d.about ?? {};
    const dAdminContact = d.adminContact ?? {};

    return {
      ...base,
      ...d,
      about: {
        ...baseAbout,
        ...dAbout,
      },
      adminContact: {
        ...baseAdminContact,
        ...dAdminContact,
      },
    };
  }, [DEFAULT_SETTINGS, draft]);

  const parseMoney = (value) =>
    Math.max(0, Number(String(value || "").replace(/,/g, "")) || 0);

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-US");

  return (
    <Modal open={open} title="Cài đặt" onClose={onClose}>
      <div className="space-y-4">
        <InstallAppSettingsCard installApp={installApp} settings={mergedDraft} />

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
              type="text"
              inputMode="numeric"
              value={formatMoney(mergedDraft.electricityPrice)}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  electricityPrice: parseMoney(v),
                }))
              }
            />
            <TextField
              label="Tiền nước / số"
              type="text"
              inputMode="numeric"
              value={formatMoney(mergedDraft.waterPrice)}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  waterPrice: parseMoney(v),
                }))
              }
            />
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Cách tính tiền nước</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={clsx(
                    "rounded-2xl px-3 py-2 text-sm font-semibold ring-1",
                    mergedDraft.waterBillingMode !== "no_split"
                      ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                      : "bg-white text-slate-700 ring-slate-200",
                  )}
                  onClick={() => setDraft((s) => ({ ...s, waterBillingMode: "shared" }))}
                >
                  Chia theo người
                </button>
                <button
                  type="button"
                  className={clsx(
                    "rounded-2xl px-3 py-2 text-sm font-semibold ring-1",
                    mergedDraft.waterBillingMode === "no_split"
                      ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                      : "bg-white text-slate-700 ring-slate-200",
                  )}
                  onClick={() => setDraft((s) => ({ ...s, waterBillingMode: "no_split" }))}
                >
                  Không chia
                </button>
              </div>
            </div>
            <TextField
              label="Ngày chốt thanh toán"
              type="number"
              value={String(mergedDraft.billingCloseDay || 10)}
              onChange={(v) =>
                setDraft((s) => ({
                  ...s,
                  billingCloseDay: Math.min(31, Math.max(1, Number(v || 1))),
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
          </div>
        </div>

        {/* DELETE GUARD */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Bảo vệ xóa</div>
          <div className="mt-3 space-y-2">
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
              Khi xóa tầng/phòng, hệ thống sẽ yêu cầu nhập lại mật khẩu đăng
              nhập hiện tại.
            </div>
          </div>
        </div>

        {/* DATA */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Dữ liệu</div>
              <div className="mt-1 text-xs text-slate-600">
                Nhập dữ liệu NLĐ từ Excel cho tòa nhà đang chọn.
              </div>
            </div>
            <Pill icon={FileUp} text="Excel" tone="sky" />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                auth.isAdmin
                  ? "bg-[rgb(44_120_159)] text-white"
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

        {/* SAVE */}
        <button
          className={clsx(
            "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
            auth.isAdmin
              ? "bg-[rgb(44_120_159)] text-white"
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
