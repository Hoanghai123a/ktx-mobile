import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaymentExportRows,
  stayOverlapsPaymentPeriod,
} from "../src/services/excelExportService.js";
import { getBillingPeriod } from "../src/services/utilityBilling.js";

const field = {
  employeeCode: "M\u00e3 nh\u00e2n vi\u00ean",
  total: "T\u1ed5ng ti\u1ec1n",
  status: "Tr\u1ea1ng th\u00e1i",
  leaveDate: "Ng\u00e0y ngh\u1ec9",
};

function exportFixture(stays) {
  const workerById = new Map(
    stays.map((stay, index) => [stay.workerId, {
      id: stay.workerId,
      employeeCode: `NV${index + 1}`,
      fullName: `Ng\u01b0\u1eddi ${index + 1}`,
      freeRoomDays: 0,
    }]),
  );
  return buildPaymentExportRows({
    floors: [{
      name: "T\u1ea7ng 1",
      rooms: [{ id: "r1", code: "101", stays }],
    }],
    workerById,
    billingMonth: "2026-08",
    billingCloseDay: 25,
    utilityBilling: { byRoom: new Map(), byStay: new Map() },
  });
}

test("payment export includes every stay overlapping the billing period", () => {
  const period = getBillingPeriod("2026-08", 25);
  assert.deepEqual(period, {
    month: "2026-08",
    start: "2026-07-25",
    end: "2026-08-25",
    closeDay: 25,
  });

  const rows = exportFixture([
    { id: "s1", workerId: "w1", dateIn: "2026-07-01" },
    { id: "s2", workerId: "w2", dateIn: "2026-08-10", dateOut: "2026-08-20" },
    { id: "s3", workerId: "w3", dateIn: "2026-07-01", dateOut: "2026-07-25" },
    { id: "s4", workerId: "w4", dateIn: "2026-08-25" },
    { id: "s5", workerId: "w5", dateIn: "2026-09-01" },
  ]);

  assert.deepEqual(rows.map((row) => row[field.employeeCode]), ["NV1", "NV2"]);
  assert.equal(rows[0][field.leaveDate], "");
  assert.equal(rows[1][field.leaveDate], "20/08/2026");
});

test("payment export keeps zero-charge stays in the result", () => {
  const [row] = exportFixture([
    { id: "s1", workerId: "w1", dateIn: "2026-08-01" },
  ]);

  assert.ok(row);
  assert.equal(row[field.total], 0);
  assert.equal(row[field.status], "Kh\u00f4ng ph\u00e1t sinh");
  assert.equal(row[field.leaveDate], "");
});

test("period overlap handles close days 29 to 31 and boundary dates", () => {
  const period = getBillingPeriod("2026-03", 31);
  assert.equal(period.start, "2026-02-28");
  assert.equal(period.end, "2026-03-31");
  assert.equal(stayOverlapsPaymentPeriod({ dateIn: "2026-02-28" }, period), true);
  assert.equal(stayOverlapsPaymentPeriod({ dateIn: "2026-03-30", dateOut: "2026-03-31" }, period), true);
  assert.equal(stayOverlapsPaymentPeriod({ dateIn: "2026-03-31" }, period), false);
  assert.equal(stayOverlapsPaymentPeriod({ dateIn: "2026-02-01", dateOut: "2026-02-28" }, period), false);
});
