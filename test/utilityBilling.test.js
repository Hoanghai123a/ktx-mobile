import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRoomUtility,
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
