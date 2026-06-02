import React, { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Droplets,
  FileDown,
  Home,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

import Pill from "../../components/ui/Pill";

function Money({ value }) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
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
  pendingWaterCount = 0,
  pendingWaterAmount = 0,
  paidWaterAmount = 0,
  pendingRoomAmount = 0,
  paidRoomAmount = 0,
  workerPaymentRows = [],
  markWorkerUtilityPaid,
  openElectricityHistory,
}) {
  const [section, setSection] = useState("workers");
  const electricityTotal = (pendingElectricityAmount || 0) + (paidElectricityAmount || 0);
  const waterTotal = (pendingWaterAmount || 0) + (paidWaterAmount || 0);
  const roomTotal = (pendingRoomAmount || 0) + (paidRoomAmount || 0);
  const paymentTotal = electricityTotal + waterTotal + roomTotal;
  const paymentParts = useMemo(
    () => [
      { key: "room", label: "Tiền phòng", value: roomTotal, icon: Home },
      { key: "electricity", label: "Tiền điện", value: electricityTotal, icon: Zap },
      { key: "water", label: "Tiền nước", value: waterTotal, icon: Droplets },
    ],
    [electricityTotal, roomTotal, waterTotal],
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
        <button
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${section === "workers" ? "bg-[rgb(44_120_159)] text-white" : "text-slate-600"}`}
          onClick={() => setSection("workers")}
        >
          NLĐ
        </button>
        <button
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${section === "payments" ? "bg-[rgb(44_120_159)] text-white" : "text-slate-600"}`}
          onClick={() => setSection("payments")}
        >
          Thanh toán
        </button>
      </div>

      {section === "workers" ? (
        <>
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between">
              <div className="text-sm font-semibold">Thống kê theo số người/phòng</div>
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
                <div key={s.occupancy} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2.5 text-center">
                  <div className="truncate text-[11px] leading-4 text-slate-600">
                    {s.occupancy === 0 ? "Phòng trống" : `${s.occupancy} người`}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{s.rooms}</div>
                  <div className="text-[11px] leading-4 text-slate-500">phòng</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Thống kê NLĐ theo người tuyển</div>
              <Pill icon={Users} text={`${recruiterStats.reduce((a, b) => a + b.workers, 0)} NLĐ`} tone="green" />
            </div>

            {recruiterStats.length ? (
              <div className="mt-3 space-y-2">
                {recruiterStats.map((x) => (
                  <button
                    key={x.recruiter}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => setRecruiterModal?.({ open: true, recruiter: x.recruiter })}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{x.recruiter}</div>
                      <div className="text-xs text-slate-600">Bấm để xem danh sách NLĐ</div>
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
                <div className="text-sm font-semibold">Thanh toán kỳ hiện tại</div>
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
                <div className="mt-1 text-lg font-semibold text-slate-900">{totalCurrentWorkers || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600">Tổng khoản thu</div>
                <div className="mt-1 text-lg font-semibold text-slate-900"><Money value={paymentTotal} /></div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Khoản thu</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {paymentParts.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600"><Icon className="h-4 w-4" />{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900"><Money value={item.value} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4" />Khoản thu kỳ hiện tại</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50" onClick={() => openElectricityHistory?.("pending")}>
                <div className="text-xs text-slate-600">NLĐ chờ thu</div>
                <div className="mt-1 text-lg font-semibold text-slate-900"><Money value={pendingElectricityAmount + pendingWaterAmount + pendingRoomAmount} /></div>
                <div className="mt-0.5 text-xs text-slate-500">{pendingElectricityCount || 0} NLĐ</div>
              </button>
              <button className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50" onClick={() => openElectricityHistory?.("paid")}>
                <div className="text-xs text-slate-600">NLĐ đã thu</div>
                <div className="mt-1 text-lg font-semibold text-slate-900"><Money value={paidElectricityAmount + paidWaterAmount + paidRoomAmount} /></div>
                <div className="mt-0.5 text-xs text-slate-500">{paidElectricityCount || 0} NLĐ</div>
              </button>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600">Phòng</div>
                <div className="mt-1 text-lg font-semibold text-slate-900"><Money value={roomTotal} /></div>
                <div className="mt-0.5 text-xs text-slate-500">Chờ <Money value={pendingRoomAmount} /></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600">Điện</div>
                <div className="mt-1 text-lg font-semibold text-slate-900"><Money value={electricityTotal} /></div>
                <div className="mt-0.5 text-xs text-slate-500">Chờ {pendingElectricityCount || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600">Nước</div>
                <div className="mt-1 text-lg font-semibold text-slate-900"><Money value={waterTotal} /></div>
                <div className="mt-0.5 text-xs text-slate-500">Chờ {pendingWaterCount || 0}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Thu tiền theo từng NLĐ</div>
            <div className="mt-3 space-y-2">
              {workerPaymentRows.length ? (
                workerPaymentRows.slice(0, 80).map((row) => (
                  <div key={row.stayId} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{row.employeeCode ? `${row.employeeCode} - ` : ""}{row.workerName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">Phòng {row.roomCode} · {row.active ? "Đang ở" : `Rời ${row.dateOut}`}</div>
                      </div>
                      {row.paid ? (
                        <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Đã thu</div>
                      ) : (
                        <button className="shrink-0 rounded-2xl bg-[rgb(44_120_159)] px-3 py-2 text-xs font-semibold text-white" onClick={() => markWorkerUtilityPaid?.(row)}>Đã thu</button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Phòng <Money value={row.roomAmount} /> · Điện <Money value={row.electricityAmount} /> · Nước <Money value={row.waterAmount} /></span>
                      <span className="font-semibold text-slate-900"><Money value={row.totalAmount} /></span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Chưa có NLĐ cần thu tiền.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
