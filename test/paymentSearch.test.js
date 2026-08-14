import test from "node:test";
import assert from "node:assert/strict";

import { filterWorkerPaymentRows } from "../src/services/paymentSearch.js";

test("payment search filters by partial worker name or employee code", () => {
  const rows = [
    { workerName: "Ng\u1ecdc Anh", employeeCode: "NV001" },
    { workerName: "Tr\u1ea7n B\u00ecnh", employeeCode: "KT-208" },
  ];

  assert.deepEqual(filterWorkerPaymentRows(rows, "anh"), [rows[0]]);
  assert.deepEqual(filterWorkerPaymentRows(rows, "208"), [rows[1]]);
});

test("payment search ignores surrounding spaces and letter case", () => {
  const rows = [
    { workerName: "Nguy\u1ec5n V\u0103n An", employeeCode: "NV-AbC" },
  ];

  assert.deepEqual(filterWorkerPaymentRows(rows, "  NGUY\u1ec4N  "), rows);
  assert.deepEqual(filterWorkerPaymentRows(rows, "  nv-ABC  "), rows);
});

test("empty payment search returns the original list", () => {
  const rows = [{ workerName: "A", employeeCode: "NV1" }];
  assert.equal(filterWorkerPaymentRows(rows, "   "), rows);
});
