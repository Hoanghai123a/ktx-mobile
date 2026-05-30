import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Droplets,
  FileDown,
  Home,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

import Pill from "../../components/ui/Pill";

function Money({ value }) {
  return `${Number(value || 0).toLocaleString()}đ`;
}

export default function StatsView({
  stats,
  recruiterStats,
  setRecruiterModal,
  exportExcel,
  exportPaymentExcel,
  openStaysHistory,
  billingMonth,
  totalCurrentWorkers,
  pendingElectricityCount,
  pendingElectricityAmount,
  paidElectricityCount,
  paidElectricityAmount,
  openElectricityHistory,
}) {
  const [section, setSection] = useState("workers");
  const electricityTotal = (pendingElectricityAmount || 0) + (paidElectricityAmount || 0);
  const paymentParts = useMemo(
    () => [
      { key: "electricity", label: "Tiền điện", value: electricityTotal, icon: Zap },
      { key: "water", label: "Tiền nước", value: 0, icon: Droplets },
      { key: "resident", label: "Tiền tạm trú", value: 0, icon: Home },
      { key: "other", label: "Tiền khác", value: 0, icon: CreditCard },
    ],
    [electricityTotal],
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
        <button
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${section === "workers" ? "bg-slate-900 text-white" : "text-slate-600"}`}
          onClick={() => setSection("workers")}
        >
          NLĐ
        </button>
        <button
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${section === "payments" ? "bg-slate-900 text-white" : "text-slate-600"}`}
          onClick={() => setSection("payments")}
        >
          Thanh toán
        </button>
      </div>

      {section === "workers" ? (
        <>
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between">
              <div className="text-sm font-semibold">
                Thống kê theo số người/phòng
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                  onClick={() => openStaysHistory?.()}
                >
                  Lịch sử
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                  onClick={() => exportExcel?.()}
                >
                  <span className="inline-flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Excel
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <div
                  key={s.occupancy}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2.5 text-center"
                >
                  <div className="truncate text-[11px] leading-4 text-slate-600">
                    {s.occupancy === 0 ? "Phòng trống" : `${s.occupancy} người`}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">
                    {s.rooms}
                  </div>
                  <div className="text-[11px] leading-4 text-slate-500">phòng</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                Thống kê NLĐ theo người tuyển
              </div>
              <Pill
                icon={Users}
                text={`${recruiterStats.reduce((a, b) => a + b.workers, 0)} NLĐ`}
                tone="green"
              />
            </div>

            {recruiterStats.length ? (
              <div className="mt-3 space-y-2">
                {recruiterStats.map((x) => (
                  <button
                    key={x.recruiter}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() =>
                      setRecruiterModal?.({ open: true, recruiter: x.recruiter })
                    }
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {x.recruiter}
                      </div>
                      <div className="text-xs text-slate-600">
                        Bấm để xem danh sách NLĐ
                      </div>
                    </div>
                    <Pill icon={UserRound} text={`${x.workers}`} tone="sky" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">Chưa có NLĐ đang ở.</div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Thanh toán tiền phòng</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <CalendarDays className="h-4 w-4" />
                  {billingMonth || "Chưa chọn tháng"}
                </div>
              </div>
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                onClick={() => (exportPaymentExcel || exportExcel)?.()}
              >
                <span className="inline-flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Excel
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600">NLĐ đang ở</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {totalCurrentWorkers || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600">Tổng tiền phòng</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  <Money value={electricityTotal} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Khoản thu</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {paymentParts.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      <Money value={item.value} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Tiền điện tháng hiện tại</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                onClick={() => openElectricityHistory?.("pending")}
              >
                <div className="text-xs text-slate-600">Chờ thu</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  <Money value={pendingElectricityAmount} />
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {pendingElectricityCount || 0} phòng
                </div>
              </button>
              <button
                className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                onClick={() => openElectricityHistory?.("paid")}
              >
                <div className="text-xs text-slate-600">Đã thu</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  <Money value={paidElectricityAmount} />
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {paidElectricityCount || 0} phòng
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
