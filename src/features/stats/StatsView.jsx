import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Droplets,
  FileDown,
  Home,
  History,
  RefreshCw,
  Search,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

import Pill from "../../components/ui/Pill";
import Modal from "../../components/ui/Modal";
import { filterWorkerPaymentRows } from "../../services/paymentSearch";

function Money({ value }) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatLogTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addMonths(dateText, months) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1 + months, day, 23, 59, 59, 999);
}

function defaultLogDateFrom() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return dateInputValue(date);
}

function workerLabel(lookup, id) {
  return lookup?.workers?.get?.(id)?.label || "";
}

function roomLabel(lookup, id) {
  return lookup?.rooms?.get?.(id)?.label || "";
}

function stayLabel(lookup, id) {
  return lookup?.stays?.get?.(id)?.label || "";
}

function logDetail(row, lookup) {
  const changes = row?.changes || {};
  const entity = row?.entity || "";

  if (entity === "NLĐ") {
    const label = workerLabel(lookup, row.entityId || changes.worker_id) || changes.full_name || changes.fullName;
    return label ? `NLĐ · ${label}` : "NLĐ";
  }

  if (entity === "Phòng") {
    const label = roomLabel(lookup, row.entityId || changes.room_id) || changes.code;
    return label || "Phòng";
  }

  if (entity === "Tầng") {
    const label = lookup?.floors?.get?.(row.entityId)?.label || changes.name;
    return label ? `Tầng · ${label}` : "Tầng";
  }

  if (entity === "Lượt ở") {
    const fromStay = stayLabel(lookup, row.entityId);
    const fromChanges = [
      workerLabel(lookup, changes.worker_id),
      roomLabel(lookup, changes.room_id),
    ].filter(Boolean).join(" · ");
    return fromStay || fromChanges || "Lượt ở";
  }

  if (entity === "Điện" || entity === "Nước") {
    const label = roomLabel(lookup, changes.room_id);
    const month = changes.month ? String(changes.month).slice(0, 7) : "";
    return [entity, label, month].filter(Boolean).join(" · ") || entity;
  }

  return entity || "Log";
}

const LOG_FIELD_LABELS = {
  source: "Nguồn",
  uid: "UID",
  worker_id: "Mã NLĐ",
  room_id: "Mã phòng",
  stay_id: "Mã lượt ở",
  full_name: "Họ và tên",
  fullName: "Họ và tên",
  employee_code: "Mã nhân viên",
  employeeCode: "Mã nhân viên",
  worker_name_snapshot: "Tên NLĐ",
  worker_employee_code_snapshot: "Mã nhân viên NLĐ",
  worker_cccd_snapshot: "Số CCCD",
  worker_gender_snapshot: "Giới tính",
  worker_date_of_birth_snapshot: "Ngày sinh",
  worker_address_snapshot: "Địa chỉ",
  hometown_snapshot: "Quê quán",
  worker_tax_code_snapshot: "Mã số thuế",
  cccd_issue_date: "Ngày cấp CCCD",
  cccd_version: "Phiên bản CCCD",
  recruiter_staff: "Nhân viên tuyển dụng",
  recruiter_partner: "Đối tác tuyển dụng",
  main_house: "Nhà chính",
  join_date: "Ngày vào làm",
  leave_date: "Ngày nghỉ",
  date_in: "Ngày vào",
  date_out: "Ngày rời",
  month: "Tháng",
  paid: "Đã thanh toán",
  status: "Trạng thái",
  tags: "Nhãn",
  note: "Ghi chú",
};

function logActionLabel(row) {
  return [row?.action || "Cập nhật", row?.entity || "dữ liệu"]
    .filter(Boolean)
    .join(" ");
}

function logFieldLabel(field) {
  if (LOG_FIELD_LABELS[field]) return LOG_FIELD_LABELS[field];
  return String(field || "Trường dữ liệu")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatLogValue(value) {
  if (value === null || value === undefined || value === "") return "Không có";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
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
  exportWorkerInvoice,
  openElectricityHistory,
  activityLogs = [],
  activityLogLoading = false,
  loadActivityLogs,
  activityLogLookup,
  exportActivityLogs,
}) {
  const [section, setSection] = useState("workers");
  const [logExportOpen, setLogExportOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logDateFrom, setLogDateFrom] = useState(defaultLogDateFrom);
  const [logDateTo, setLogDateTo] = useState(() => dateInputValue());
  const [paymentQuery, setPaymentQuery] = useState("");
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
  const filteredPaymentRows = useMemo(
    () => filterWorkerPaymentRows(workerPaymentRows, paymentQuery),
    [paymentQuery, workerPaymentRows],
  );
  const visiblePaymentRows = filteredPaymentRows.slice(0, 80);

  useEffect(() => {
    if (section === "logs") loadActivityLogs?.();
  }, [loadActivityLogs, section]);

  const visibleActivityLogs = useMemo(() => activityLogs.slice(0, 50), [activityLogs]);

  function handleExportLogs() {
    if (!logDateFrom || !logDateTo) {
      alert("Chọn khoảng ngày cần xuất log.");
      return;
    }
    const start = new Date(`${logDateFrom}T00:00:00`);
    const end = new Date(`${logDateTo}T23:59:59`);
    const maxEnd = addMonths(logDateFrom, 3);
    if (end < start) {
      alert("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    if (maxEnd && end > maxEnd) {
      alert("Khoảng ngày xuất log tối đa 3 tháng.");
      return;
    }
    exportActivityLogs?.({
      dateFrom: logDateFrom,
      dateTo: logDateTo,
      resolveDetail: (row) => logDetail(row, activityLogLookup),
    });
    setLogExportOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
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
        <button
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${section === "logs" ? "bg-[rgb(44_120_159)] text-white" : "text-slate-600"}`}
          onClick={() => setSection("logs")}
        >
          Log
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
      ) : section === "payments" ? (
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
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={paymentQuery}
                onChange={(event) => setPaymentQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc mã nhân viên"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {paymentQuery ? (
                <button
                  type="button"
                  className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={() => setPaymentQuery("")}
                >
                  Xóa
                </button>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {!workerPaymentRows.length ? (
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Chưa có NLĐ cần thu tiền.</div>
              ) : visiblePaymentRows.length ? (
                visiblePaymentRows.map((row) => (
                  <div key={row.stayId} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{row.employeeCode ? `${row.employeeCode} - ` : ""}{row.workerName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">Phòng {row.roomCode} · {row.active ? "Đang ở" : `Rời ${row.dateOut}`}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {exportWorkerInvoice ? (
                          <button
                            className="grid h-8 w-8 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            onClick={() => exportWorkerInvoice(row)}
                            title="Xuất phiếu thanh toán"
                            aria-label="Xuất phiếu thanh toán"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                        ) : null}
                        {row.paid ? (
                          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Đã thu</div>
                        ) : (
                          <button className="rounded-2xl bg-[rgb(44_120_159)] px-3 py-2 text-xs font-semibold text-white" onClick={() => markWorkerUtilityPaid?.(row)}>Đã thu</button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Phòng <Money value={row.roomAmount} /> · Điện <Money value={row.electricityAmount} /> · Nước <Money value={row.waterAmount} /></span>
                      <span className="font-semibold text-slate-900"><Money value={row.totalAmount} /></span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Không tìm thấy NLĐ phù hợp.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
              <History className="h-4 w-4 shrink-0" />
              <span className="truncate">Log chỉnh sửa</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                onClick={() => loadActivityLogs?.()}
                title="Tải lại"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                onClick={() => setLogExportOpen(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Excel
                </span>
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {activityLogLoading ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Đang tải log...</div>
            ) : visibleActivityLogs.length ? (
              visibleActivityLogs.map((row) => {
                const detail = logDetail(row, activityLogLookup);
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                    onClick={() => setSelectedLog(row)}
                    aria-label={`Xem chi tiết ${logActionLabel(row)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {logActionLabel(row)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {row.userName || "Không rõ người thực hiện"} · {formatLogTime(row.created) || "Không rõ thời gian"}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-600">
                        {detail || row.summary || "Không có thông tin đối tượng"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Chưa có log chỉnh sửa.</div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!selectedLog}
        title="Chi tiết chỉnh sửa"
        onClose={() => setSelectedLog(null)}
        zIndex="z-[70]"
      >
        {selectedLog ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-900">
                {logActionLabel(selectedLog)}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                {selectedLog.userName || "Không rõ người thực hiện"} · {formatLogTime(selectedLog.created) || "Không rõ thời gian"}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-slate-500">Loại dữ liệu</div>
                <div className="mt-1 break-words text-slate-900">{selectedLog.entity || "Không xác định"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Đối tượng</div>
                <div className="mt-1 break-words text-slate-900">
                  {logDetail(selectedLog, activityLogLookup) || "Không có thông tin"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Nội dung</div>
                <div className="mt-1 break-words text-slate-900">{selectedLog.summary || "Không có nội dung"}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">Các trường thay đổi</div>
              {Object.entries(selectedLog.changes || {}).length ? (
                <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {Object.entries(selectedLog.changes || {}).map(([field, value]) => (
                    <div key={field} className="px-3 py-2.5">
                      <div className="text-xs font-medium text-slate-500">{logFieldLabel(field)}</div>
                      <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-900">
                        {formatLogValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Không có dữ liệu thay đổi.
                </div>
              )}
            </div>

            {selectedLog.method || selectedLog.path ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông tin kỹ thuật</div>
                {selectedLog.method ? (
                  <div className="mt-2 text-xs text-slate-600">
                    Phương thức: <span className="font-medium text-slate-900">{selectedLog.method}</span>
                  </div>
                ) : null}
                {selectedLog.path ? (
                  <div className="mt-1 break-all text-xs text-slate-600">
                    Đường dẫn: <span className="font-medium text-slate-900">{selectedLog.path}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={logExportOpen}
        title="Xuất Excel log"
        onClose={() => setLogExportOpen(false)}
        zIndex="z-[70]"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <div className="text-xs font-medium text-slate-600">Từ ngày</div>
              <input
                type="date"
                value={logDateFrom}
                onChange={(e) => setLogDateFrom(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </label>
            <label className="block space-y-1">
              <div className="text-xs font-medium text-slate-600">Đến ngày</div>
              <input
                type="date"
                value={logDateTo}
                onChange={(e) => setLogDateTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>
          <button
            className="w-full rounded-2xl bg-[rgb(44_120_159)] px-3 py-3 text-sm font-semibold text-white"
            onClick={handleExportLogs}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <FileDown className="h-4 w-4" />
              Tải Excel log
            </span>
          </button>
          <div className="text-[11px] leading-4 text-slate-500">Khoảng ngày xuất tối đa 3 tháng.</div>
        </div>
      </Modal>
    </div>
  );
}
