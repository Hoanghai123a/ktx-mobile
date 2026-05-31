import test from "node:test";
import assert from "node:assert/strict";
import { importExcelRowsToDb } from "../src/services/excelImportService.js";

function makeDeps() {
  const calls = {
    workerCreate: [],
    workerUpdate: [],
    stayCreate: [],
  };

  const deps = {
    roomService: {
      getAll: async () => [{ id: "room-101", code: "101", floor_id: "floor-1" }],
    },
    floorService: {
      getAll: async () => [{ id: "floor-1", name: "Tầng 1" }],
    },
    workerService: {
      getAll: async () => [],
      create: async (payload) => {
        calls.workerCreate.push(payload);
        return { id: `w-${calls.workerCreate.length}` };
      },
      update: async (id, patch) => {
        calls.workerUpdate.push({ id, patch });
        return { id };
      },
    },
    stayService: {
      getAll: async () => [],
      create: async (payload) => {
        calls.stayCreate.push(payload);
        return { id: `s-${calls.stayCreate.length}` };
      },
    },
  };

  return { deps, calls };
}

test("import: có mã NV -> lưu đúng employee_code và tạo stay", async () => {
  const { deps, calls } = makeDeps();

  const rows = [
    {
      "Mã nhân viên": "NV001",
      "Họ tên": "Nguyễn Văn A",
      Phòng: "101",
      "Ngày vào": "2026-04-01",
    },
  ];

  const res = await importExcelRowsToDb(rows, "token", deps, null);
  assert.equal(res.total, 1);
  assert.equal(res.workersInserted, 1);
  assert.equal(res.staysInserted, 1);
  assert.equal((res.errors || []).length, 0);

  assert.equal(calls.workerCreate.length, 1);
  assert.equal(calls.workerCreate[0].employee_code, "NV001");
  assert.equal(calls.workerCreate[0].full_name, "Nguyễn Văn A");

  assert.equal(calls.stayCreate.length, 1);
  assert.equal(calls.stayCreate[0].room_id, "room-101");
  assert.equal(calls.stayCreate[0].date_in, "2026-04-01");
});

test("import: không có mã NV -> để trống mã và vẫn tạo stay", async () => {
  const { deps, calls } = makeDeps();

  const rows = [
    {
      "Họ tên": "Trần Thị B",
      Phòng: "101",
      "Ngày vào": "2026-04-02",
    },
  ];

  const res = await importExcelRowsToDb(rows, "token", deps, null);
  assert.equal(res.total, 1);
  assert.equal(res.workersInserted, 1);
  assert.equal(res.staysInserted, 1);
  assert.equal((res.errors || []).length, 0);

  assert.equal(calls.workerCreate.length, 1);
  const code = calls.workerCreate[0].employee_code;
  assert.equal(code, null);
});

test("import: nhận thêm tầng, giới tính, CCCD và phí NLĐ", async () => {
  const { deps, calls } = makeDeps();

  const rows = [
    {
      "Mã nhân viên": "NV004",
      "Họ tên": "Worker Z",
      "Giới tính": "Nam",
      "Số CCCD": "001001001001",
      "Tiền điện": "12,000",
      "Tiền nước": "8000",
      Tầng: "Tầng 1",
      Phòng: "101",
      "Ngày vào": "2026-04-04",
    },
  ];

  const res = await importExcelRowsToDb(rows, "token", deps, null);
  assert.equal((res.errors || []).length, 0);
  assert.equal(calls.workerCreate[0].gender, "male");
  assert.equal(calls.workerCreate[0].identity_number, "001001001001");
  assert.equal(calls.workerCreate[0].electricity_fee, 12000);
  assert.equal(calls.workerCreate[0].water_fee, 8000);
  assert.equal(calls.stayCreate[0].room_id, "room-101");
});

test("import: so khớp tầng có dấu với tầng không dấu trong DB", async () => {
  const { deps, calls } = makeDeps();
  deps.floorService.getAll = async () => [{ id: "floor-1", name: "Tang 1" }];

  const rows = [
    {
      "Mã nhân viên": "NV005",
      "Họ tên": "Worker Accent",
      Tầng: "Tầng 1",
      Phòng: "101",
      "Ngày vào": "2026-04-05",
    },
  ];

  const res = await importExcelRowsToDb(rows, "token", deps, null);
  assert.equal((res.errors || []).length, 0);
  assert.equal(res.staysInserted, 1);
  assert.equal(calls.stayCreate[0].room_id, "room-101");
});

test("import: file lỗi định dạng rows=null -> trả về errors", async () => {
  const { deps } = makeDeps();
  const res = await importExcelRowsToDb(null, "token", deps, null);
  assert.equal(res.total, 0);
  assert.ok((res.errors || []).length >= 1);
});

test("import: trùng mã NV -> không tạo worker lần 2 (chỉ update nếu cần)", async () => {
  const { deps, calls } = makeDeps();

  const rows = [
    {
      "Mã nhân viên": "NV002",
      "Họ tên": "Worker X",
      Phòng: "",
      "Ngày vào": "",
      "Người tuyển": "",
    },
    {
      "Mã nhân viên": "NV002",
      "Họ tên": "Worker X",
      Phòng: "",
      "Ngày vào": "",
      "Người tuyển": "Recruiter",
    },
  ];

  const res = await importExcelRowsToDb(rows, "token", deps, null);
  assert.equal(res.total, 2);
  assert.equal(res.workersInserted, 1);
  assert.equal(res.workersUpdated, 1);
  assert.equal(calls.workerCreate.length, 1);
  assert.equal(calls.workerUpdate.length, 1);
});

test("import: trùng stay (cùng worker/room/date) -> skipped 1, staysInserted 1", async () => {
  const { deps, calls } = makeDeps();

  const rows = [
    {
      "Mã nhân viên": "NV003",
      "Họ tên": "Worker Y",
      Phòng: "101",
      "Ngày vào": "2026-04-03",
      "Ngày rời": "",
    },
    {
      "Mã nhân viên": "NV003",
      "Họ tên": "Worker Y",
      Phòng: "101",
      "Ngày vào": "2026-04-03",
      "Ngày rời": "",
    },
  ];

  const res = await importExcelRowsToDb(rows, "token", deps, null);
  assert.equal(res.total, 2);
  assert.equal(res.staysInserted, 1);
  assert.equal(res.skipped, 1);
  assert.equal(calls.stayCreate.length, 1);
});
