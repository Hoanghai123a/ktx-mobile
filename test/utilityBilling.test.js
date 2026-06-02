import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRoomRentForStay,
  calculateRoomUtility,
  calculateUtilityBilling,
  getUtilityCheckoutBounds,
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
