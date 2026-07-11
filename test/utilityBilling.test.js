import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUtilitySegments,
  calculateRoomRentForStay,
  calculateRoomUtility,
  calculateUtilityBilling,
  getUtilityCheckoutBounds,
  mergeMonthlyReadings,
} from "../src/services/utilityBilling.js";

test("checkout bounds use room readings outside stay-specific billing window", () => {
  const room = {
    id: "r1",
    electricity: [{ month: "2026-06", start_reading: 100, end_reading: 200 }],
  };

  const longStay = {
    workerId: "w1",
    dateIn: "2026-05-20",
    dateOut: "2026-06-30",
    electricityStartReading: 80,
    electricityEndReading: 230,
  };

  assert.deepEqual(
    getUtilityCheckoutBounds({
      room,
      stay: longStay,
      type: "electricity",
      billingMonth: "2026-06",
      billingCloseDay: 25,
      dateOut: "2026-06-30",
    }),
    {
      period: { month: "2026-06", start: "2026-05-25", end: "2026-06-25", closeDay: 25 },
      effectiveStartDate: "2026-05-25",
      effectiveEndDate: "2026-06-25",
      startReading: 100,
      endReading: 200,
      startSource: "room",
      endSource: "room",
    },
  );

  const shortStay = {
    workerId: "w2",
    dateIn: "2026-06-01",
    dateOut: "2026-06-20",
    electricityStartReading: 120,
    electricityEndReading: 170,
  };

  const bounds = getUtilityCheckoutBounds({
    room,
    stay: shortStay,
    type: "electricity",
    billingMonth: "2026-06",
    billingCloseDay: 25,
    dateOut: "2026-06-20",
  });

  assert.equal(bounds.effectiveStartDate, "2026-06-01");
  assert.equal(bounds.effectiveEndDate, "2026-06-20");
  assert.equal(bounds.startReading, 120);
  assert.equal(bounds.endReading, 170);
  assert.equal(bounds.startSource, "stay");
  assert.equal(bounds.endSource, "stay");
});

test("checkout start reading uses stay reading for workers entering on period start", () => {
  const room = {
    id: "r1",
    electricity: [{ month: "2026-06", start_reading: 100, end_reading: 200 }],
  };

  const bounds = getUtilityCheckoutBounds({
    room,
    stay: {
      workerId: "w1",
      dateIn: "2026-05-25",
      dateOut: "2026-06-20",
      electricityStartReading: 123,
      electricityEndReading: 170,
    },
    type: "electricity",
    billingMonth: "2026-06",
    billingCloseDay: 25,
    dateOut: "2026-06-20",
  });

  assert.equal(bounds.period.start, "2026-05-25");
  assert.equal(bounds.effectiveStartDate, "2026-05-25");
  assert.equal(bounds.startReading, 123);
  assert.equal(bounds.startSource, "stay");
});

test("checkout start reading uses room reading for workers entering before period start", () => {
  const room = {
    id: "r1",
    electricity: [{ month: "2026-06", start_reading: 100, end_reading: 200 }],
  };

  const bounds = getUtilityCheckoutBounds({
    room,
    stay: {
      workerId: "w1",
      dateIn: "2026-05-24",
      dateOut: "2026-06-20",
      electricityStartReading: 123,
      electricityEndReading: 170,
    },
    type: "electricity",
    billingMonth: "2026-06",
    billingCloseDay: 25,
    dateOut: "2026-06-20",
  });

  assert.equal(bounds.period.start, "2026-05-25");
  assert.equal(bounds.effectiveStartDate, "2026-05-25");
  assert.equal(bounds.startReading, 100);
  assert.equal(bounds.startSource, "room");
});

test("checkout start reading can use period-start reading from previous utility record", () => {
  const room = {
    id: "6393nq4ry6d1otb",
    electricity: [
      {
        month: "2026-05",
        start_reading: 346,
        end_reading: 387,
        readings: [
          { date: "2026-04-10", reading: 346 },
          { date: "2026-05-10", reading: 387 },
        ],
      },
    ],
  };

  const bounds = getUtilityCheckoutBounds({
    room,
    stay: {
      workerId: "wa0rqt7rbxg0ek9",
      dateIn: "2026-03-29",
      electricityStartReading: 20,
      electricityEndReading: 0,
    },
    type: "electricity",
    billingMonth: "2026-06",
    billingCloseDay: 10,
    dateOut: "2026-06-06",
  });

  assert.equal(bounds.period.start, "2026-05-10");
  assert.equal(bounds.effectiveStartDate, "2026-05-10");
  assert.equal(bounds.startReading, 387);
  assert.equal(bounds.startSource, "room");
});

test("checkout start reading does not fall back to stay reading before period start", () => {
  const room = {
    id: "r1",
    electricity: [],
  };

  const bounds = getUtilityCheckoutBounds({
    room,
    stay: {
      workerId: "w1",
      dateIn: "2026-05-01",
      dateOut: "2026-06-20",
      electricityStartReading: 0,
      electricityEndReading: 170,
    },
    type: "electricity",
    billingMonth: "2026-06",
    billingCloseDay: 25,
    dateOut: "2026-06-20",
  });

  assert.equal(bounds.startReading, "");
  assert.equal(bounds.startSource, "room");
});

test("room utility is split by occupants in each reading interval", () => {
  const room = {
    id: "r1",
    electricity: [{ month: "2026-06", start_reading: 100, end_reading: 200 }],
    stays: [
      { workerId: "w1", dateIn: "2026-05-01" },
      {
        workerId: "w2",
        dateIn: "2026-06-10",
        dateOut: "2026-06-20",
        electricityStartReading: 150,
        electricityEndReading: 180,
      },
    ],
  };

  const result = calculateRoomUtility({
    room,
    type: "electricity",
    settings: { billingMonth: "2026-06", billingCloseDay: 25, electricityPrice: 1000 },
  });

  assert.equal(result.unitsByWorkerId.get("w1"), 85);
  assert.equal(result.unitsByWorkerId.get("w2"), 15);
  assert.equal(result.amountByWorkerId.get("w1"), 85000);
  assert.equal(result.amountByWorkerId.get("w2"), 15000);
});

test("utility segments expose readings and occupants for each billing stage", () => {
  const period = { month: "2026-06", start: "2026-05-25", end: "2026-06-25", closeDay: 25 };
  const room = {
    id: "r1",
    electricity: [{ month: "2026-06", start_reading: 100, end_reading: 200 }],
    stays: [
      { id: "s1", workerId: "w1", dateIn: "2026-05-01" },
      {
        id: "s2",
        workerId: "w2",
        dateIn: "2026-06-10",
        dateOut: "2026-06-20",
        electricityStartReading: 150,
        electricityEndReading: 180,
      },
    ],
  };

  const { rows, segments } = buildUtilitySegments({
    room,
    period,
    record: room.electricity[0],
    type: "electricity",
    pricePerUnit: 1000,
  });

  assert.deepEqual(rows.map((row) => row.date), [
    "2026-05-25",
    "2026-06-10",
    "2026-06-20",
    "2026-06-25",
  ]);
  assert.deepEqual(segments.map((segment) => segment.used), [50, 30, 20]);
  assert.deepEqual(segments.map((segment) => segment.occupantCount), [1, 2, 1]);
  assert.equal(segments[1].unitsPerOccupant, 15);
  assert.equal(segments[1].endRow.departures[0].id, "s2");
});

test("utility segments keep missing and negative readings visible", () => {
  const period = { month: "2026-06", start: "2026-05-25", end: "2026-06-25", closeDay: 25 };
  const missingRoom = {
    id: "r1",
    electricity: [{ month: "2026-06", start_reading: 100, readings: [{ date: "2026-05-25", reading: 100 }] }],
    stays: [{ id: "s1", workerId: "w1", dateIn: "2026-05-01" }],
  };
  const negativeRoom = {
    id: "r2",
    electricity: [{ month: "2026-06", start_reading: 100, end_reading: 90 }],
    stays: [{ id: "s1", workerId: "w1", dateIn: "2026-05-01" }],
  };

  const missing = buildUtilitySegments({
    room: missingRoom,
    period,
    record: missingRoom.electricity[0],
    type: "electricity",
  });
  const negative = buildUtilitySegments({
    room: negativeRoom,
    period,
    record: negativeRoom.electricity[0],
    type: "electricity",
  });

  assert.equal(missing.segments[0].hasReadings, false);
  assert.equal(missing.segments[0].used, null);
  assert.equal(negative.segments[0].hasReadings, true);
  assert.equal(negative.segments[0].used, -10);
});

test("water no_split charges each occupant full interval usage", () => {
  const room = {
    id: "r1",
    water: [{ month: "2026-06", start_reading: 100, end_reading: 200 }],
    stays: [
      { workerId: "w1", dateIn: "2026-05-01" },
      { workerId: "w2", dateIn: "2026-05-01" },
    ],
  };

  const shared = calculateRoomUtility({
    room,
    type: "water",
    settings: { billingMonth: "2026-06", billingCloseDay: 25, waterPrice: 1000 },
  });
  const noSplit = calculateRoomUtility({
    room,
    type: "water",
    settings: {
      billingMonth: "2026-06",
      billingCloseDay: 25,
      waterPrice: 1000,
      waterBillingMode: "no_split",
    },
  });

  assert.equal(shared.unitsByWorkerId.get("w1"), 50);
  assert.equal(shared.unitsByWorkerId.get("w2"), 50);
  assert.equal(noSplit.unitsByWorkerId.get("w1"), 100);
  assert.equal(noSplit.unitsByWorkerId.get("w2"), 100);
  assert.equal(noSplit.amountByWorkerId.get("w1"), 100000);
  assert.equal(noSplit.amountByWorkerId.get("w2"), 100000);
});

test("room utility treats missing period end reading as temporary save", () => {
  const room = {
    id: "r1",
    electricity: [
      {
        month: "2026-06",
        start_reading: 100,
        end_reading: 100,
        readings: [{ date: "2026-05-25", reading: 100 }],
      },
    ],
    stays: [{ workerId: "w1", dateIn: "2026-05-01" }],
  };

  const result = calculateRoomUtility({
    room,
    type: "electricity",
    settings: { billingMonth: "2026-06", billingCloseDay: 25, electricityPrice: 1000 },
  });

  assert.equal(result.totalAmount, 0);
  assert.equal(result.amountByWorkerId.has("w1"), false);
  assert.equal(result.warnings.includes("Thiếu chỉ số ngày 2026-06-25."), true);
});

test("room utility carries previous month end reading into next month start", () => {
  const room = {
    id: "r1",
    electricity: [
      {
        month: "2026-05",
        start_reading: 100,
        end_reading: 150,
        readings: [
          { date: "2026-04-10", reading: 100 },
          { date: "2026-05-10", reading: 150 },
        ],
      },
      {
        month: "2026-06",
        end_reading: 210,
        readings: [{ date: "2026-06-10", reading: 210 }],
      },
    ],
    stays: [{ workerId: "w1", dateIn: "2026-01-01" }],
  };

  const result = calculateRoomUtility({
    room,
    type: "electricity",
    settings: { billingMonth: "2026-06", billingCloseDay: 10, electricityPrice: 1000 },
  });

  assert.equal(result.unitsByWorkerId.get("w1"), 60);
  assert.equal(result.amountByWorkerId.get("w1"), 60000);
  assert.equal(result.warnings.length, 0);
});

test("room rent uses postpaid and prepaid close-day periods", () => {
  const postpaid = calculateRoomRentForStay({
    stay: { workerId: "w1", dateIn: "2026-06-01" },
    settings: {
      billingMonth: "2026-06",
      billingCloseDay: 10,
      roomMonthlyPrice: 3000000,
      roomBillingMode: "postpaid",
    },
  });

  assert.equal(postpaid.period.start, "2026-05-10");
  assert.equal(postpaid.period.end, "2026-06-10");
  assert.equal(postpaid.days, 9);
  assert.equal(postpaid.amount, 900000);

  const prepaid = calculateRoomRentForStay({
    stay: { workerId: "w1", dateIn: "2026-06-20" },
    settings: {
      billingMonth: "2026-06",
      billingCloseDay: 10,
      roomMonthlyPrice: 3100000,
      roomBillingMode: "prepaid",
    },
  });

  assert.equal(prepaid.period.start, "2026-06-10");
  assert.equal(prepaid.period.end, "2026-07-10");
  assert.equal(prepaid.days, 20);
  assert.equal(prepaid.amount, 2000000);
});

test("room rent honors free days and monthly cap", () => {
  const capped = calculateRoomRentForStay({
    stay: { workerId: "w1", dateIn: "2026-05-01" },
    settings: {
      billingMonth: "2026-06",
      billingCloseDay: 10,
      roomMonthlyPrice: 3000000,
      roomBillingMode: "postpaid",
    },
  });

  assert.equal(capped.days, 31);
  assert.equal(capped.amount, 3000000);

  const afterFreeDays = calculateRoomRentForStay({
    stay: { workerId: "w2", dateIn: "2026-05-20" },
    worker: { id: "w2", freeRoomDays: 26 },
    settings: {
      billingMonth: "2026-06",
      billingCloseDay: 25,
      roomMonthlyPrice: 3000000,
      roomBillingMode: "postpaid",
    },
  });

  assert.equal(afterFreeDays.startDate, "2026-05-25");
  assert.equal(afterFreeDays.endDate, "2026-06-25");
  assert.equal(afterFreeDays.days, 31);
  assert.equal(afterFreeDays.freeDays, 26);
  assert.equal(afterFreeDays.chargedDays, 5);
  assert.equal(afterFreeDays.amount, 500000);
});

test("utility billing includes room rent in worker totals", () => {
  const result = calculateUtilityBilling({
    floors: [
      {
        id: "f1",
        rooms: [
          {
            id: "r1",
            electricity: [{ month: "2026-06", start_reading: 0, end_reading: 10 }],
            water: [{ month: "2026-06", start_reading: 0, end_reading: 5 }],
            stays: [
              {
                id: "s1",
                workerId: "w1",
                dateIn: "2026-06-01",
                electricityStartReading: 0,
                waterStartReading: 0,
              },
            ],
          },
        ],
      },
    ],
    workers: [{ id: "w1", freeRoomDays: 2 }],
    settings: {
      billingMonth: "2026-06",
      billingCloseDay: 10,
      electricityPrice: 1000,
      waterPrice: 2000,
      roomMonthlyPrice: 3000000,
    },
  });

  const charge = result.byWorker.get("w1");
  assert.equal(charge.electricityAmount, 10000);
  assert.equal(charge.waterAmount, 10000);
  assert.equal(charge.roomAmount, 700000);
  assert.equal(charge.totalAmount, 720000);
  assert.equal(result.byStay.get("s1").amount, 700000);
  assert.equal(result.byStay.get("s1").chargedDays, 7);
});


test("mergeMonthlyReadings keeps mid-period readings instead of overwriting", () => {
  const period = { month: "2026-06", start: "2026-05-10", end: "2026-06-10", closeDay: 10 };
  const merged = mergeMonthlyReadings({
    readings: [
      { date: "2026-05-10", reading: 100 },
      { date: "2026-05-22", reading: 140 },
    ],
    period,
    startReading: 100,
    endReading: 210,
  });

  assert.deepEqual(merged, [
    { date: "2026-05-10", reading: 100 },
    { date: "2026-05-22", reading: 140 },
    { date: "2026-06-10", reading: 210 },
  ]);
});

test("mergeMonthlyReadings drops period end when end reading is cleared", () => {
  const period = { month: "2026-06", start: "2026-05-10", end: "2026-06-10", closeDay: 10 };
  const merged = mergeMonthlyReadings({
    readings: [
      { date: "2026-05-10", reading: 100 },
      { date: "2026-06-10", reading: 210 },
    ],
    period,
    startReading: 100,
    endReading: "",
  });

  assert.deepEqual(merged, [{ date: "2026-05-10", reading: 100 }]);
});

test("mergeMonthlyReadings stays within the billing window", () => {
  const period = { month: "2026-06", start: "2026-05-10", end: "2026-06-10", closeDay: 10 };
  const merged = mergeMonthlyReadings({
    readings: [
      { date: "2026-04-10", reading: 50 },
      { date: "2026-05-10", reading: 100 },
      { date: "2026-07-01", reading: 999 },
    ],
    period,
    startReading: 100,
    endReading: 210,
  });

  assert.deepEqual(merged, [
    { date: "2026-05-10", reading: 100 },
    { date: "2026-06-10", reading: 210 },
  ]);
});

test("billing chains readings across many months long-term", () => {
  const electricity = [];
  // 12 thang lien tiep, moi thang +30 so dien, dong nhat boundary date.
  for (let i = 0; i < 12; i += 1) {
    const month = `2026-${String(i + 1).padStart(2, "0")}`;
    const startVal = 100 + i * 30;
    const endVal = startVal + 30;
    const prevMonth = i === 0 ? "2025-12" : `2026-${String(i).padStart(2, "0")}`;
    const startDate = `${prevMonth}-10`;
    const endDate = `${month}-10`;
    electricity.push({
      month,
      start_reading: startVal,
      end_reading: endVal,
      readings: [
        { date: startDate, reading: startVal },
        { date: endDate, reading: endVal },
      ],
    });
  }

  const room = {
    id: "r1",
    electricity,
    stays: [{ workerId: "w1", dateIn: "2025-01-01" }],
  };

  const december = calculateRoomUtility({
    room,
    type: "electricity",
    settings: { billingMonth: "2026-12", billingCloseDay: 10, electricityPrice: 1000 },
  });

  assert.equal(december.unitsByWorkerId.get("w1"), 30);
  assert.equal(december.amountByWorkerId.get("w1"), 30000);
  assert.equal(december.warnings.length, 0);
  assert.equal(room.electricity.length, 12);
});
