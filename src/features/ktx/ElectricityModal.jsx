import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Droplets, Pencil, Save, Users, Wallet, Zap } from "lucide-react";
import Modal from "../../components/ui/Modal";
import clsx from "../../components/ui/clsx";
import {
  calculateRoomUtility,
  formatPeriodLabel,
  getBillingPeriod,
  mergeMonthlyReadings,
  normalizeBillingMonth,
} from "../../services/utilityBilling";

const META = {
  electricity: {
    title: "Tiền điện",
    icon: Zap,
    roomKey: "electricity",
    priceKey: "electricityPrice",
    unitLabel: "số điện",
  },
  water: {
    title: "Tiền nước",
    icon: Droplets,
    roomKey: "water",
    priceKey: "waterPrice",
    unitLabel: "số nước",
  },
};

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function shortDay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value || "--");
  return `${Number(match[3])}/${Number(match[2])}`;
}

function readingText(value) {
  return value === "" || value == null ? "--" : String(value);
}

function numberValue(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function previousRecord(records, month) {
  return (Array.isArray(records) ? records : [])
    .filter((row) => String(row?.month || "").slice(0, 7) < month)
    .sort((a, b) => String(b?.month || "").localeCompare(String(a?.month || "")))[0] || null;
}

function makeRecord({ record, room, period, startReading, endReading, paid, readings }) {
  const start = numberValue(startReading);
  const end = numberValue(endReading);
  const fallbackEnd = end === "" ? start : end;
  return {
    ...(record || {}),
    id: record?.id,
    room_id: room?.id,
    month: period.month,
    start_reading: start === "" ? 0 : start,
    end_reading: fallbackEnd === "" ? 0 : fallbackEnd,
    readings: mergeMonthlyReadings({
      readings: readings ?? record?.readings,
      period,
      startReading: start,
      endReading: end,
    }),
    paid: !!paid,
  };
}

function hasReadingAt(record, date) {
  const readings = Array.isArray(record?.readings) ? record.readings : [];
  return readings.some((row) => String(row?.date || "").slice(0, 10) === date);
}

function recordReadings(record) {
  if (Array.isArray(record?.readings)) return record.readings;
  if (typeof record?.readings === "string") {
    try {
      const parsed = JSON.parse(record.readings);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function chainedStartReading({ record, prevRecord, period, billingCloseDay }) {
  const ownStart = record?.start_reading ?? record?.startReading;
  const prevEnd = prevRecord?.end_reading ?? prevRecord?.endReading;
  // Cuối kỳ tháng trước = đầu kỳ tháng sau, nhưng chỉ khi hai kỳ thật sự nối ngày với nhau.
  if (prevRecord && prevEnd != null && prevEnd !== "") {
    const prevPeriod = getBillingPeriod(prevRecord.month, billingCloseDay || 1);
    if (prevPeriod.end === period.start) return prevEnd;
  }
  return ownStart ?? (prevEnd ?? "");
}

function BoundaryReadingControl({ title, row, value, auth, workerById, onChange, onEditDeparture }) {
  const departures = Array.isArray(row?.departures) ? row.departures : [];
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">{title}</div>
          <div className="truncate text-sm font-semibold text-slate-900">{row?.date || "--"}</div>
          {row?.label ? <div className="mt-0.5 truncate text-xs text-slate-500">{row.label}</div> : null}
        </div>
        {departures.length ? (
          <div className="shrink-0 rounded-xl bg-white px-2 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            {value === "" ? "--" : value}
          </div>
        ) : (
          <input
            type="number"
            value={value}
            disabled={!auth?.isAdmin}
            onChange={(e) => onChange(row.date, e.target.value)}
            className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-slate-400 disabled:opacity-60"
            placeholder="0"
          />
        )}
      </div>
      {departures.length ? (
        <div className="mt-2 space-y-1">
          {departures.map((stay) => {
            const worker = workerById?.get?.(stay.workerId);
            return (
              <button
                key={stay.id || stay.workerId}
                disabled={!auth?.isAdmin}
                onClick={() => onEditDeparture(stay)}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold",
                  auth?.isAdmin ? "bg-white text-slate-700 ring-1 ring-slate-200" : "bg-white/60 text-slate-400",
                )}
              >
                <span className="truncate">{worker?.fullName || worker?.name || stay.workerId || "NLĐ rời phòng"}</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  Sửa
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function ElectricityModal({
  open,
  onClose,
  room,
  workerById,
  utilityType = "electricity",
  records,
  pricePerUnit = 0,
  waterBillingMode = "shared",
  billingMonth,
  billingCloseDay = 1,
  auth,
  requireAdmin,
  actions,
}) {
  const meta = META[utilityType] || META.electricity;
  const Icon = meta.icon;
  const period = useMemo(
    () => getBillingPeriod(billingMonth, billingCloseDay || 1),
    [billingMonth, billingCloseDay],
  );
  const month = normalizeBillingMonth(billingMonth);
  const record = useMemo(() => {
    const list = Array.isArray(records) ? records : [];
    return list.find((row) => String(row?.month || "").slice(0, 7) === month) || null;
  }, [records, month]);
  const prevRecord = useMemo(() => previousRecord(records, month), [records, month]);

  const [startReading, setStartReading] = useState("");
  const [endReading, setEndReading] = useState("");
  const [readingRows, setReadingRows] = useState([]);
  const [openSegment, setOpenSegment] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStartReading(
      chainedStartReading({
        record,
        prevRecord,
        period,
        billingCloseDay,
      }),
    );
    const readings = Array.isArray(record?.readings) ? record.readings : [];
    const hasExplicitEnd = !readings.length || hasReadingAt(record, period.end);
    setEndReading(hasExplicitEnd ? (record?.end_reading ?? record?.endReading ?? "") : "");
    setReadingRows(recordReadings(record));
  }, [open, period, billingCloseDay, record, prevRecord]);

  const preview = useMemo(() => {
    const nextRecord = makeRecord({
      record,
      room,
      period,
      startReading,
      endReading,
      paid: record?.paid,
      readings: readingRows,
    });
    const list = [
      ...((Array.isArray(records) ? records : []).filter(
        (row) => String(row?.month || "").slice(0, 7) !== period.month,
      )),
      nextRecord,
    ];
    return calculateRoomUtility({
      room: { ...(room || {}), [meta.roomKey]: list },
      type: utilityType,
      workerById,
      settings: {
        billingMonth: period.month,
        billingCloseDay: period.closeDay,
        [meta.priceKey]: Number(pricePerUnit || 0),
        waterBillingMode,
      },
    });
  }, [meta.priceKey, meta.roomKey, period, pricePerUnit, readingRows, record, records, room, startReading, endReading, utilityType, waterBillingMode, workerById]);

  const hasMissing = (preview.rows || []).some((row) => readingAt(row) === "");
  const hasNegative = (preview.segments || []).some(
    (segment) => segment.hasReadings && Number(segment.used || 0) < 0,
  );
  const canPay = !hasMissing && !hasNegative && !record?.paid;

  async function save(paid = false) {
    if (!actions?.upsertUtility) return;
    await requireAdmin(async () => {
      const payload = makeRecord({
        record,
        room,
        period,
        startReading,
        endReading,
        paid: paid || record?.paid,
        readings: readingRows,
      });
      await actions.upsertUtility({ type: utilityType, ...payload });
      onClose?.();
    });
  }

  function setReadingAt(date, value) {
    if (date === period.start) {
      setStartReading(value);
      return;
    }
    if (date === period.end) {
      setEndReading(value);
      return;
    }
    setReadingRows((rows) => {
      const next = recordReadings({ readings: rows }).filter(
        (row) => String(row?.date || "").slice(0, 10) !== date,
      );
      if (value !== "") next.push({ date, reading: Number(value || 0) });
      return next.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    });
  }

  function readingAt(row) {
    if (row?.date === period.start) return startReading;
    if (row?.date === period.end) return endReading;
    return row?.reading ?? "";
  }

  function editDeparture(stay) {
    if (!stay || !actions?.editDeparture) return;
    actions.editDeparture(stay);
  }

  const workerRows = [...preview.amountByWorkerId.entries()].map(([workerId, amount]) => ({
    workerId,
    amount,
    units: preview.unitsByWorkerId.get(workerId) || 0,
    worker: workerById?.get?.(workerId),
  }));

  return (
    <Modal open={open} title={meta.title} onClose={onClose} zIndex="z-[70]">
      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Phòng {room?.code}</div>
              <div className="mt-1 text-xs text-slate-600">Kỳ {formatPeriodLabel(period)}</div>
              <div className="mt-1 text-xs text-slate-600">
                Đơn giá: {money(pricePerUnit)} / {meta.unitLabel}
              </div>
            </div>
            <div
              className={clsx(
                "grid h-10 w-10 place-items-center rounded-2xl ring-1",
                utilityType === "water"
                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                  : "bg-amber-50 text-amber-700 ring-amber-100",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {record?.paid ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              Đã thu
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Sơ đồ giai đoạn</div>
              <div className="mt-1 text-xs text-slate-600">Chia theo từng khoảng có thay đổi người ở hoặc chỉ số.</div>
            </div>
            <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {preview.segments?.length || 0} đoạn
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {preview.segments?.length ? (
              preview.segments.map((segment, idx) => {
                const hasNegativeSegment = segment.hasReadings && Number(segment.used || 0) < 0;
                const isOpen = openSegment === idx;
                return (
                  <div
                    key={`${segment.startDate}-${segment.endDate}`}
                    className={clsx(
                      "rounded-3xl p-3 ring-1",
                      hasNegativeSegment ? "bg-rose-50 ring-rose-100" : "bg-white ring-slate-100",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {shortDay(segment.startDate)} - {shortDay(segment.endDate)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenSegment(isOpen ? null : idx)}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[rgb(44_120_159)] underline underline-offset-2"
                      >
                        Xem chi tiết
                        <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <Icon className={clsx("h-4 w-4", utilityType === "water" ? "text-sky-600" : "text-amber-600")} />
                      <span>
                        {readingText(segment.startReading)} đến {readingText(segment.endReading)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span>
                        {segment.occupantCount} NLĐ · Dùng {segment.used == null ? "--" : Number(segment.used || 0)} {meta.unitLabel}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <span>
                        {money(segment.amountPerOccupant)} / người
                        {segment.noSplit ? " (không chia)" : ""}
                      </span>
                    </div>

                    {isOpen ? (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <div className="text-xs font-semibold text-slate-500">Người ở trong giai đoạn</div>
                        {segment.occupants.length ? (
                          segment.occupants.map((person) => (
                            <div
                              key={`${segment.startDate}-${segment.endDate}-${person.workerId}`}
                              className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs"
                            >
                              <span className="min-w-0 truncate font-semibold text-slate-700">
                                {person.worker?.fullName || person.worker?.name || person.workerId}
                              </span>
                              <span className="shrink-0 text-slate-600">
                                {segment.unitsPerOccupant.toFixed(2)} {meta.unitLabel}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Không có NLĐ trong giai đoạn này.
                          </div>
                        )}
                        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <BoundaryReadingControl
                            title="Đầu đoạn"
                            row={segment.startRow}
                            value={readingAt(segment.startRow)}
                            auth={auth}
                            workerById={workerById}
                            onChange={setReadingAt}
                            onEditDeparture={editDeparture}
                          />
                          <BoundaryReadingControl
                            title="Cuối đoạn"
                            row={segment.endRow}
                            value={readingAt(segment.endRow)}
                            auth={auth}
                            workerById={workerById}
                            onChange={setReadingAt}
                            onEditDeparture={editDeparture}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                Chưa có đủ mốc để dựng sơ đồ.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold text-slate-900">Chỉ số phòng</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <div className="text-xs font-medium text-slate-600">Số đầu kỳ</div>
              <input
                type="number"
                value={startReading}
                disabled={!auth?.isAdmin}
                onChange={(e) => setStartReading(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
                placeholder="0"
              />
            </label>
            <label className="block space-y-1">
              <div className="text-xs font-medium text-slate-600">Số cuối kỳ</div>
              <input
                type="number"
                value={endReading}
                disabled={!auth?.isAdmin}
                onChange={(e) => setEndReading(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
                placeholder="0"
              />
            </label>
          </div>
          <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Khi đánh dấu đã thu, số cuối kỳ sẽ làm số đầu kỳ gợi ý cho kỳ sau.
          </div>
          {hasNegative ? (
            <div className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Số cuối kỳ không được nhỏ hơn số đầu kỳ.
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Tạm tính theo NLĐ</div>
            <div className="text-sm font-semibold text-slate-900">{money(preview.totalAmount)}</div>
          </div>
          <div className="mt-3 space-y-2">
            {workerRows.length ? (
              workerRows.map((row) => (
                <div
                  key={row.workerId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {row.worker?.fullName || row.workerId}
                    </div>
                    <div className="text-xs text-slate-500">{row.units.toFixed(2)} số</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-slate-900">{money(row.amount)}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                Chưa đủ chỉ số để tính.
              </div>
            )}
          </div>

          {preview.warnings.length ? (
            <div className="mt-3 space-y-1 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
              {preview.warnings.slice(0, 4).map((text) => (
                <div key={text}>{text}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className={clsx(
              "rounded-2xl px-4 py-3 text-sm font-semibold",
              auth?.isAdmin ? "bg-[rgb(44_120_159)] text-white" : "bg-slate-100 text-slate-500",
            )}
            onClick={() => save(false)}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
              Lưu chỉ số
            </span>
          </button>
          <button
            disabled={!canPay || !auth?.isAdmin}
            className={clsx(
              "rounded-2xl px-4 py-3 text-sm font-semibold",
              canPay && auth?.isAdmin ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400",
            )}
            onClick={() => save(true)}
          >
            Đã thu
          </button>
        </div>
      </div>
    </Modal>
  );
}
