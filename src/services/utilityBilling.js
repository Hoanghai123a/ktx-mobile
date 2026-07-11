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

function parseDateParts(value) {
  const text = normalizeDate(value);
  if (!text) return null;
  const [year, month, day] = text.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function addMonthsToMonth(monthValue, offset = 0) {
  const month = normalizeBillingMonth(monthValue);
  const [yearText, monthText] = month.split("-");
  const zeroBased = Number(monthText) - 1 + Number(offset || 0);
  const date = new Date(Number(yearText), zeroBased, 1);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function diffDays(startDate, endDate) {
  const start = parseDateParts(startDate);
  const end = parseDateParts(endDate);
  if (!start || !end) return 0;
  const startTime = Date.UTC(start.year, start.month - 1, start.day);
  const endTime = Date.UTC(end.year, end.month - 1, end.day);
  return Math.max(0, Math.round((endTime - startTime) / 86400000));
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

function roomMonthlyAmount(settings = {}) {
  return Math.max(
    0,
    Number(
      settings.roomMonthlyPrice ??
        settings.roomPrice ??
        settings.roomFeeMonthly ??
        0,
    ) || 0,
  );
}

function freeRoomDays(worker, stay) {
  return Math.max(
    0,
    Math.floor(
      Number(
        worker?.freeRoomDays ??
          worker?.free_room_days ??
          stay?.freeRoomDays ??
          stay?.free_room_days ??
          0,
      ) || 0,
    ),
  );
}

export function getRoomRentPeriod(settings = {}) {
  const billingMonth = normalizeBillingMonth(settings.billingMonth);
  const billingMode = settings.roomBillingMode === "prepaid" ? "prepaid" : "postpaid";
  const periodMonth = billingMode === "prepaid"
    ? addMonthsToMonth(billingMonth, 1)
    : billingMonth;

  return {
    ...getBillingPeriod(periodMonth, settings.billingCloseDay || 1),
    billingMonth,
    billingMode,
  };
}

export function calculateRoomRentForStay({ stay, worker, settings = {} }) {
  const monthlyAmount = roomMonthlyAmount(settings);
  const period = getRoomRentPeriod(settings);
  const dateIn = normalizeDate(stay?.dateIn ?? stay?.date_in);
  const dateOut = normalizeDate(stay?.dateOut ?? stay?.date_out);
  const endParts = parseDateParts(period.end);
  const rateMonthDays = endParts ? daysInMonth(endParts.year, endParts.month) : 30;
  const dailyAmount = rateMonthDays > 0 ? monthlyAmount / rateMonthDays : 0;
  const freeDays = freeRoomDays(worker, stay);

  if (!monthlyAmount || !dateIn) {
    return {
      period,
      startDate: "",
      endDate: "",
      days: 0,
      freeDays,
      chargedDays: 0,
      monthlyAmount,
      dailyAmount,
      rawAmount: 0,
      amount: 0,
      rateMonthDays,
    };
  }

  const periodStart = normalizeDate(period.start);
  const periodEnd = normalizeDate(period.end);
  let startDate = dateIn > periodStart ? dateIn : periodStart;

  const stayEnd = dateOut || periodEnd;
  const endDate = stayEnd < periodEnd ? stayEnd : periodEnd;
  const days = startDate < endDate ? diffDays(startDate, endDate) : 0;
  const chargedDays = Math.max(0, days - freeDays);
  const rawAmount = Math.min(monthlyAmount, Math.max(0, chargedDays * dailyAmount));
  const amount = Math.min(monthlyAmount, roundUpToThousand(rawAmount));

  return {
    period,
    startDate,
    endDate,
    days,
    freeDays,
    chargedDays,
    monthlyAmount,
    dailyAmount,
    rawAmount,
    amount,
    rateMonthDays,
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

export function mergeMonthlyReadings({ readings, period, startReading, endReading }) {
  const map = new Map();
  for (const row of parseReadings(readings)) {
    const date = normalizeDate(row?.date);
    const reading = numberOrBlank(row?.reading);
    if (date && reading !== "") map.set(date, Number(reading));
  }
  const start = numberOrBlank(startReading);
  const end = numberOrBlank(endReading);
  if (period?.start && start !== "") map.set(period.start, Number(start));
  if (period?.end) {
    if (end !== "") map.set(period.end, Number(end));
    else map.delete(period.end);
  }
  const lo = period?.start || "";
  const hi = period?.end || "";
  return [...map.entries()]
    .filter(([date]) => (!lo || date >= lo) && (!hi || date <= hi))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, reading]) => ({ date, reading }));
}

export function readingsToMap(record, period, room, type = "electricity") {
  const map = new Map();
  const parsedReadings = parseReadings(record?.readings);
  for (const row of parsedReadings) {
    const date = normalizeDate(row?.date);
    const reading = numberOrBlank(row?.reading);
    if (date && reading !== "") map.set(date, reading);
  }

  const start = numberOrBlank(record?.start_reading ?? record?.startReading);
  const end = numberOrBlank(record?.end_reading ?? record?.endReading);
  if (period?.start && start !== "" && !map.has(period.start)) {
    map.set(period.start, start);
  }
  if (period?.start && !map.has(period.start)) {
    const carried = findRoomReadingAtDate(room, type, period.start);
    if (carried !== "") map.set(period.start, carried);
  }
  const hasExplicitEndReading = !parsedReadings.length || parsedReadings.some((row) => normalizeDate(row?.date) === period?.end);
  if (period?.end && end !== "" && !map.has(period.end) && hasExplicitEndReading) {
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
  const arrivals = new Map();
  const departures = new Map();
  addEvent(events, period.start, "Đầu kỳ");
  addEvent(events, period.end, "Cuối kỳ");

  for (const stay of room?.stays || []) {
    const name = workerById?.get?.(stay.workerId)?.fullName || "NLĐ";
    const dateIn = normalizeDate(stay.dateIn);
    const dateOut = normalizeDate(stay.dateOut);
    if (dateIn && dateIn > period.start && dateIn < period.end) {
      const rows = arrivals.get(dateIn) || [];
      rows.push(stay);
      arrivals.set(dateIn, rows);
    }
    if (dateOut && dateOut > period.start && dateOut < period.end) {
      const rows = departures.get(dateOut) || [];
      rows.push(stay);
      departures.set(dateOut, rows);
    }
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
      arrivals: arrivals.get(date) || [],
      departures: departures.get(date) || [],
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

export function buildUtilitySegments({ room, period, record, workerById, type = "electricity", pricePerUnit = 0, noSplit = false }) {
  const rows = buildUtilityReadingRows({ room, period, record, workerById, type });
  const segments = [];

  for (let i = 0; i < rows.length - 1; i += 1) {
    const startRow = rows[i];
    const endRow = rows[i + 1];
    const startReading = numberOrBlank(startRow.reading);
    const endReading = numberOrBlank(endRow.reading);
    const hasReadings = startReading !== "" && endReading !== "";
    const used = hasReadings ? Number(endReading) - Number(startReading) : null;
    const occupantsMap = new Map();

    for (const stay of room?.stays || []) {
      if (stayOverlapsInterval(stay, startRow.date, endRow.date, period)) {
        occupantsMap.set(stay.workerId, stay);
      }
    }

    const occupants = [...occupantsMap.entries()]
      .filter(([workerId]) => !!workerId)
      .map(([workerId, stay]) => ({
        workerId,
        stayId: stay?.id || "",
        stay,
        worker: workerById?.get?.(workerId) || null,
      }));
    const unitsPerOccupant = hasReadings && used > 0 && occupants.length
      ? (noSplit ? used : used / occupants.length)
      : 0;

    segments.push({
      startDate: startRow.date,
      endDate: endRow.date,
      startLabel: startRow.label,
      endLabel: endRow.label,
      startReading,
      endReading,
      hasReadings,
      used,
      occupants,
      occupantCount: occupants.length,
      unitsPerOccupant,
      amountPerOccupant: unitsPerOccupant * Number(pricePerUnit || 0),
      startRow,
      endRow,
    });
  }

  return { rows, segments };
}

export function findUtilityRecord(room, type, billingMonth) {
  const config = UTILITY_CONFIG[type] || UTILITY_CONFIG.electricity;
  const month = normalizeBillingMonth(billingMonth);
  const list = Array.isArray(room?.[config.roomKey]) ? room[config.roomKey] : [];
  return list.find((row) => String(row?.month || "").slice(0, 7) === month) || null;
}

function findRoomReadingAtDate(room, type, date) {
  const config = UTILITY_CONFIG[type] || UTILITY_CONFIG.electricity;
  const targetDate = normalizeDate(date);
  if (!targetDate) return "";
  const list = Array.isArray(room?.[config.roomKey]) ? room[config.roomKey] : [];
  for (const record of list) {
    for (const row of parseReadings(record?.readings)) {
      if (normalizeDate(row?.date) === targetDate) {
        const reading = numberOrBlank(row?.reading);
        if (reading !== "") return reading;
      }
    }
  }
  return "";
}

export function getUtilityCheckoutBounds({ room, stay, type = "electricity", billingMonth, billingCloseDay = 1, dateOut }) {
  const period = getBillingPeriod(billingMonth || dateOut, billingCloseDay || 1);
  const record = findUtilityRecord(room, type, period.month);
  const dateIn = normalizeDate(stay?.dateIn ?? stay?.date_in);
  const leaveDate = normalizeDate(dateOut ?? stay?.dateOut ?? stay?.date_out) || period.end;
  const stayStart = stayReading(stay, type, "start");
  const stayEnd = stayReading(stay, type, "end");
  const currentRoomStart = numberOrBlank(record?.start_reading ?? record?.startReading);
  const roomStart = currentRoomStart !== "" ? currentRoomStart : findRoomReadingAtDate(room, type, period.start);
  const roomEnd = numberOrBlank(record?.end_reading ?? record?.endReading);
  const enteredInPeriod = !!dateIn && dateIn >= period.start;
  const leftBeforePeriodEnd = !!leaveDate && leaveDate < period.end;

  return {
    period,
    effectiveStartDate: enteredInPeriod ? dateIn : period.start,
    effectiveEndDate: leftBeforePeriodEnd ? leaveDate : period.end,
    startReading: enteredInPeriod ? stayStart : roomStart,
    endReading: leftBeforePeriodEnd ? stayEnd : roomEnd,
    startSource: enteredInPeriod ? "stay" : "room",
    endSource: leftBeforePeriodEnd ? "stay" : "room",
  };
}

export function calculateRoomUtility({ room, type = "electricity", settings = {}, workerById }) {
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
  const { rows, segments } = buildUtilitySegments({
    room,
    period,
    record,
    workerById,
    type,
    pricePerUnit,
    noSplit,
  });
  const readingMap = new Map(rows.map((row) => [row.date, numberOrBlank(row.reading)]));
  const warnings = [];
  const unitsByWorkerId = new Map();
  const rawAmountByWorkerId = new Map();

  for (const row of rows) {
    if (readingMap.get(row.date) === "") warnings.push(`Thiếu chỉ số ngày ${row.date}.`);
  }

  for (const segment of segments) {
    const startDate = segment.startDate;
    const endDate = segment.endDate;
    if (!segment.hasReadings) continue;

    const used = Number(segment.used || 0);
    if (used < 0) {
      warnings.push(`Chỉ số ngày ${endDate} nhỏ hơn ngày ${startDate}.`);
      continue;
    }
    if (used === 0) continue;

    const occupants = segment.occupants.map((occupant) => occupant.workerId).filter(Boolean);
    if (!occupants.length) {
      warnings.push(`Không có NLĐ trong đoạn ${startDate} - ${endDate}.`);
      continue;
    }

    const sharedUnits = segment.unitsPerOccupant;
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
    segments,
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
    roomAmount: 0,
    totalAmount: 0,
    electricityUnits: 0,
    waterUnits: 0,
    roomDays: 0,
  };
  const next = { ...current, ...patch };
  next.totalAmount =
    Number(next.electricityAmount || 0) +
    Number(next.waterAmount || 0) +
    Number(next.roomAmount || 0);
  target.set(workerId, next);
}

export function calculateUtilityBilling({ floors = [], workers = [], settings = {} }) {
  const byRoom = new Map();
  const byWorker = new Map();
  const byStay = new Map();
  const workerById = new Map((workers || []).map((worker) => [worker.id, worker]));
  const totals = {
    electricity: { amount: 0, pendingAmount: 0, paidAmount: 0, pendingCount: 0, paidCount: 0 },
    water: { amount: 0, pendingAmount: 0, paidAmount: 0, pendingCount: 0, paidCount: 0 },
    room: { amount: 0 },
  };

  for (const floor of floors || []) {
    for (const room of floor.rooms || []) {
      const electricity = calculateRoomUtility({ room, type: "electricity", settings, workerById });
      const water = calculateRoomUtility({ room, type: "water", settings, workerById });
      const roomWorkers = new Map();
      const roomRent = {
        period: getRoomRentPeriod(settings),
        monthlyAmount: roomMonthlyAmount(settings),
        amountByStayId: new Map(),
        amountByWorkerId: new Map(),
        daysByStayId: new Map(),
        totalAmount: 0,
      };

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

      for (const stay of room?.stays || []) {
        const rent = calculateRoomRentForStay({
          stay,
          worker: workerById.get(stay?.workerId),
          settings,
        });
        if (stay?.id) byStay.set(stay.id, rent);
        const workerId = stay?.workerId;
        if (!workerId || rent.amount <= 0) continue;
        roomRent.totalAmount += rent.amount;
        if (stay?.id) {
          roomRent.amountByStayId.set(stay.id, rent.amount);
          roomRent.daysByStayId.set(stay.id, rent.days);
        }
        roomRent.amountByWorkerId.set(
          workerId,
          (roomRent.amountByWorkerId.get(workerId) || 0) + rent.amount,
        );
        addWorkerCharge(roomWorkers, workerId, {
          roomAmount: (roomWorkers.get(workerId)?.roomAmount || 0) + rent.amount,
          roomDays: (roomWorkers.get(workerId)?.roomDays || 0) + rent.chargedDays,
        });
        addWorkerCharge(byWorker, workerId, {
          roomAmount: (byWorker.get(workerId)?.roomAmount || 0) + rent.amount,
          roomDays: (byWorker.get(workerId)?.roomDays || 0) + rent.chargedDays,
        });
      }

      totals.room.amount += roomRent.totalAmount;

      byRoom.set(room.id, { electricity, water, room: roomRent, byWorker: roomWorkers });

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

  return { byRoom, byWorker, byStay, totals };
}

export function formatPeriodLabel(period) {
  return `${period?.start || ""} - ${period?.end || ""}`;
}
