const UTILITY_CONFIG = {
  electricity: {
    roomKey: "electricity",
    priceKey: "electricityPrice",
  },
  water: {
    roomKey: "water",
    priceKey: "waterPrice",
  },
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function clampDay(year, month, day) {
  return Math.min(Math.max(Number(day || 1), 1), daysInMonth(year, month));
}

export function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function normalizeBillingMonth(value) {
  const text = String(value || "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(text) ? text : currentMonthValue();
}

export function getBillingPeriod(billingMonth, closeDay = 1) {
  const month = normalizeBillingMonth(billingMonth);
  const [yearText, monthText] = month.split("-");
  const endYear = Number(yearText);
  const endMonth = Number(monthText);
  const startMonth = endMonth === 1 ? 12 : endMonth - 1;
  const startYear = endMonth === 1 ? endYear - 1 : endYear;
  const endDay = clampDay(endYear, endMonth, closeDay);
  const startDay = clampDay(startYear, startMonth, closeDay);

  return {
    month,
    start: `${startYear}-${pad2(startMonth)}-${pad2(startDay)}`,
    end: `${endYear}-${pad2(endMonth)}-${pad2(endDay)}`,
    closeDay: Number(closeDay || 1),
  };
}

export function roundUpToThousand(value) {
  const amount = Number(value || 0);
  if (amount <= 0) return 0;
  return Math.ceil(amount / 1000) * 1000;
}

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function numberOrBlank(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function stayReading(stay, type, point) {
  const prefix = type === "water" ? "water" : "electricity";
  const pascalPoint = point === "start" ? "Start" : "End";
  return numberOrBlank(
    stay?.[`${prefix}${pascalPoint}Reading`] ??
      stay?.[`${prefix}_${point}_reading`],
  );
}

export function parseReadings(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function readingsToMap(record, period, room, type = "electricity") {
  const map = new Map();
  for (const row of parseReadings(record?.readings)) {
    const date = normalizeDate(row?.date);
    const reading = numberOrBlank(row?.reading);
    if (date && reading !== "") map.set(date, reading);
  }

  const start = numberOrBlank(record?.start_reading ?? record?.startReading);
  const end = numberOrBlank(record?.end_reading ?? record?.endReading);
  if (period?.start && start !== "" && !map.has(period.start)) {
    map.set(period.start, start);
  }
  if (period?.end && end !== "" && !map.has(period.end)) {
    map.set(period.end, end);
  }

  for (const stay of room?.stays || []) {
    const startDate = normalizeDate(stay.dateIn ?? stay.date_in);
    const endDate = normalizeDate(stay.dateOut ?? stay.date_out);
    const startReading = stayReading(stay, type, "start");
    const endReading = stayReading(stay, type, "end");
    if (startDate && startReading !== "" && !map.has(startDate)) {
      map.set(startDate, startReading);
    }
    if (endDate && endReading !== "" && !map.has(endDate)) {
      map.set(endDate, endReading);
    }
  }
  return map;
}

function addEvent(events, date, label) {
  if (!date) return;
  const row = events.get(date) || new Set();
  row.add(label);
  events.set(date, row);
}

export function buildUtilityReadingRows({ room, period, record, workerById, type = "electricity" }) {
  const readings = readingsToMap(record, period, room, type);
  const events = new Map();
  addEvent(events, period.start, "Đầu kỳ");
  addEvent(events, period.end, "Cuối kỳ");

  for (const stay of room?.stays || []) {
    const name = workerById?.get?.(stay.workerId)?.fullName || "NLĐ";
    const dateIn = normalizeDate(stay.dateIn);
    const dateOut = normalizeDate(stay.dateOut);
    if (dateIn && dateIn > period.start && dateIn < period.end) {
      addEvent(events, dateIn, `Vào: ${name}`);
    }
    if (dateOut && dateOut > period.start && dateOut < period.end) {
      addEvent(events, dateOut, `Rời: ${name}`);
    }
  }

  return [...events.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, labels]) => ({
      date,
      label: [...labels].join("; "),
      reading: readings.get(date) ?? "",
    }));
}

function stayOverlapsInterval(stay, intervalStart, intervalEnd, period) {
  const stayStart = normalizeDate(stay?.dateIn);
  if (!stayStart) return false;
  const stayEnd = normalizeDate(stay?.dateOut) || period.end;
  const effectiveStart = stayStart > period.start ? stayStart : period.start;
  const effectiveEnd = stayEnd < period.end ? stayEnd : period.end;
  return effectiveStart < intervalEnd && effectiveEnd > intervalStart;
}

export function findUtilityRecord(room, type, billingMonth) {
  const config = UTILITY_CONFIG[type] || UTILITY_CONFIG.electricity;
  const month = normalizeBillingMonth(billingMonth);
  const list = Array.isArray(room?.[config.roomKey]) ? room[config.roomKey] : [];
  return list.find((row) => String(row?.month || "").slice(0, 7) === month) || null;
}

export function getUtilityCheckoutBounds({ room, stay, type = "electricity", billingMonth, billingCloseDay = 1, dateOut }) {
  const period = getBillingPeriod(billingMonth || dateOut, billingCloseDay || 1);
  const record = findUtilityRecord(room, type, period.month);
  const dateIn = normalizeDate(stay?.dateIn ?? stay?.date_in);
  const leaveDate = normalizeDate(dateOut ?? stay?.dateOut ?? stay?.date_out) || period.end;
  const stayStart = stayReading(stay, type, "start");
  const stayEnd = stayReading(stay, type, "end");
  const roomStart = numberOrBlank(record?.start_reading ?? record?.startReading);
  const roomEnd = numberOrBlank(record?.end_reading ?? record?.endReading);
  const enteredAfterPeriodStart = !!dateIn && dateIn > period.start;
  const leftBeforePeriodEnd = !!leaveDate && leaveDate < period.end;

  return {
    period,
    effectiveStartDate: enteredAfterPeriodStart ? dateIn : period.start,
    effectiveEndDate: leftBeforePeriodEnd ? leaveDate : period.end,
    startReading: enteredAfterPeriodStart ? stayStart : roomStart || stayStart,
    endReading: leftBeforePeriodEnd ? stayEnd : roomEnd || stayEnd,
    startSource: enteredAfterPeriodStart ? "stay" : "room",
    endSource: leftBeforePeriodEnd ? "stay" : "room",
  };
}

export function calculateRoomUtility({ room, type = "electricity", settings = {} }) {
  const config = UTILITY_CONFIG[type] || UTILITY_CONFIG.electricity;
  const period = settings.periodStart && settings.periodEnd
    ? {
        month: normalizeBillingMonth(settings.billingMonth),
        start: normalizeDate(settings.periodStart),
        end: normalizeDate(settings.periodEnd),
        closeDay: Number(settings.billingCloseDay || 1),
      }
    : getBillingPeriod(settings.billingMonth, settings.billingCloseDay || 1);
  const pricePerUnit = Number(settings[config.priceKey] || 0);
  const noSplit = type === "water" && settings.waterBillingMode === "no_split";
  const record = settings.periodStart && settings.periodEnd
    ? null
    : findUtilityRecord(room, type, period.month);
  const rows = buildUtilityReadingRows({ room, period, record, type });
  const readingMap = new Map(rows.map((row) => [row.date, numberOrBlank(row.reading)]));
  const warnings = [];
  const unitsByWorkerId = new Map();
  const rawAmountByWorkerId = new Map();

  for (const row of rows) {
    if (readingMap.get(row.date) === "") warnings.push(`Thiếu chỉ số ngày ${row.date}.`);
  }

  for (let i = 0; i < rows.length - 1; i += 1) {
    const startDate = rows[i].date;
    const endDate = rows[i + 1].date;
    const startReading = readingMap.get(startDate);
    const endReading = readingMap.get(endDate);
    if (startReading === "" || endReading === "") continue;

    const used = Number(endReading) - Number(startReading);
    if (used < 0) {
      warnings.push(`Chỉ số ngày ${endDate} nhỏ hơn ngày ${startDate}.`);
      continue;
    }
    if (used === 0) continue;

    const occupantsMap = new Map();
    for (const stay of room?.stays || []) {
      if (stayOverlapsInterval(stay, startDate, endDate, period)) {
        occupantsMap.set(stay.workerId, stay);
      }
    }
    const occupants = [...occupantsMap.keys()].filter(Boolean);
    if (!occupants.length) {
      warnings.push(`Không có NLĐ trong đoạn ${startDate} - ${endDate}.`);
      continue;
    }

    const sharedUnits = noSplit ? used : used / occupants.length;
    for (const workerId of occupants) {
      unitsByWorkerId.set(workerId, (unitsByWorkerId.get(workerId) || 0) + sharedUnits);
      rawAmountByWorkerId.set(
        workerId,
        (rawAmountByWorkerId.get(workerId) || 0) + sharedUnits * pricePerUnit,
      );
    }
  }

  const amountByWorkerId = new Map();
  for (const [workerId, amount] of rawAmountByWorkerId.entries()) {
    amountByWorkerId.set(workerId, roundUpToThousand(amount));
  }

  const totalAmount = [...amountByWorkerId.values()].reduce((sum, value) => sum + value, 0);
  const totalRawAmount = [...rawAmountByWorkerId.values()].reduce((sum, value) => sum + value, 0);

  return {
    type,
    period,
    record,
    rows,
    warnings,
    pricePerUnit,
    unitsByWorkerId,
    rawAmountByWorkerId,
    amountByWorkerId,
    totalAmount,
    totalRawAmount,
    paid: !!record?.paid,
  };
}

function addWorkerCharge(target, workerId, patch) {
  const current = target.get(workerId) || {
    electricityAmount: 0,
    waterAmount: 0,
    totalAmount: 0,
    electricityUnits: 0,
    waterUnits: 0,
  };
  const next = { ...current, ...patch };
  next.totalAmount = Number(next.electricityAmount || 0) + Number(next.waterAmount || 0);
  target.set(workerId, next);
}

export function calculateUtilityBilling({ floors = [], settings = {} }) {
  const byRoom = new Map();
  const byWorker = new Map();
  const totals = {
    electricity: { amount: 0, pendingAmount: 0, paidAmount: 0, pendingCount: 0, paidCount: 0 },
    water: { amount: 0, pendingAmount: 0, paidAmount: 0, pendingCount: 0, paidCount: 0 },
  };

  for (const floor of floors || []) {
    for (const room of floor.rooms || []) {
      const electricity = calculateRoomUtility({ room, type: "electricity", settings });
      const water = calculateRoomUtility({ room, type: "water", settings });
      const roomWorkers = new Map();

      for (const [workerId, amount] of electricity.amountByWorkerId.entries()) {
        const units = electricity.unitsByWorkerId.get(workerId) || 0;
        addWorkerCharge(roomWorkers, workerId, { electricityAmount: amount, electricityUnits: units });
        addWorkerCharge(byWorker, workerId, { electricityAmount: (byWorker.get(workerId)?.electricityAmount || 0) + amount, electricityUnits: (byWorker.get(workerId)?.electricityUnits || 0) + units });
      }
      for (const [workerId, amount] of water.amountByWorkerId.entries()) {
        const units = water.unitsByWorkerId.get(workerId) || 0;
        addWorkerCharge(roomWorkers, workerId, { waterAmount: amount, waterUnits: units });
        addWorkerCharge(byWorker, workerId, { waterAmount: (byWorker.get(workerId)?.waterAmount || 0) + amount, waterUnits: (byWorker.get(workerId)?.waterUnits || 0) + units });
      }

      byRoom.set(room.id, { electricity, water, byWorker: roomWorkers });

      for (const utility of [electricity, water]) {
        const bucket = totals[utility.type];
        bucket.amount += utility.totalAmount;
        if (utility.record) {
          if (utility.paid) {
            bucket.paidCount += 1;
            bucket.paidAmount += utility.totalAmount;
          } else {
            bucket.pendingCount += 1;
            bucket.pendingAmount += utility.totalAmount;
          }
        }
      }
    }
  }

  return { byRoom, byWorker, totals };
}

export function formatPeriodLabel(period) {
  return `${period?.start || ""} - ${period?.end || ""}`;
}
