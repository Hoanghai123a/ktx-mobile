// src/services/excelImportService.js
import * as XLSX from "xlsx";

async function loadDefaultDeps() {
  const mod = await import("./api-services/index.js");
  return {
    workerService: mod.workerService,
    roomService: mod.roomService,
    stayService: mod.stayService,
  };
}

function normHeader(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[._-]/g, " ");
}

function excelSerialToISO(n) {
  const utc = new Date(Math.round((n - 25569) * 86400 * 1000));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateToISO(v) {
  if (!v && v !== 0) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    if (v > 20000 && v < 60000) return excelSerialToISO(v);
    return "";
  }
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+.*)?$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }

  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  return "";
}

function normalizePhone(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.replace(/\s+/g, "");
}

function isValidEmployeeCode(code) {
  if (!code) return true; // Optional
  return /^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code);
}

export async function importExcelRowsToDb(rows, token, deps, logger = console) {
  if (!Array.isArray(rows)) {
    return {
      total: 0,
      workersInserted: 0,
      workersUpdated: 0,
      staysInserted: 0,
      skipped: 0,
      errors: ["File Excel lỗi định dạng (không đọc được dữ liệu)."],
    };
  }

  const pick = (row, keys) => {
    for (const k of keys) {
      const kk = normHeader(k);
      for (const col of Object.keys(row)) {
        if (normHeader(col) === kk) return row[col];
      }
    }
    return "";
  };

  const total = rows.length;

  try {
    const services = deps || (await loadDefaultDeps());

    const roomsData = await services.roomService.getAll(token);
    const roomIdByCode = new Map(
      (roomsData || []).map((r) => [String(r.code).trim(), r.id]),
    );

    const workersData = await services.workerService.getAll(token);
    const keyOfWorker = (fullName, dob, phone) =>
      `${String(fullName || "")
        .trim()
        .toLowerCase()}|${String(dob || "").trim()}|${String(phone || "").trim()}`;

    const existingByCode = new Map();
    const existingByLegacyKey = new Map();
    for (const w of workersData || []) {
      const fullName = w.full_name || w.fullName;
      const dob = w.dob;
      const phone = w.phone;
      const code = String(w.employee_code || w.employeeCode || "")
        .trim()
        .toUpperCase();
      if (code) existingByCode.set(code, w);
      existingByLegacyKey.set(keyOfWorker(fullName, dob || "", phone || ""), w);
    }

    const staysData = await services.stayService.getAll(token);
    const activeStayByWorker = new Map();
    const existingStayKeys = new Set();
    const stayKey = (workerId, roomId, dateIn, dateOut) =>
      `${workerId}|${roomId}|${dateIn}|${dateOut || ""}`;
    for (const st of staysData || []) {
      existingStayKeys.add(
        stayKey(st.worker_id, st.room_id, st.date_in, st.date_out || ""),
      );
      if (!st.date_out) activeStayByWorker.set(st.worker_id, st);
    }

    let workersInserted = 0;
    let workersUpdated = 0;
    let staysInserted = 0;
    let skipped = 0;
    const errors = [];
    const logs = [];

    const log = (level, msg, payload) => {
      logs.push({ t: new Date().toISOString(), level, msg, payload });
      if (logger?.[level]) logger[level](msg, payload || "");
    };

    log("info", `IMPORT START: rows=${total}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2;

      const providedEmployeeCode = String(
        pick(row, [
          "Mã nhân viên",
          "Ma nhan vien",
          "Mã NV",
          "Ma NV",
          "Employee code",
          "Employee_code",
          "Code",
        ]),
      )
        .trim()
        .toUpperCase();

      const fullName = String(
        pick(row, ["Họ tên", "Ho ten", "Full name", "Tên", "Name"]),
      ).trim();

      if (!fullName) {
        skipped++;
        log("warn", `IMPORT SKIP line ${line}: missing fullName`);
        continue;
      }

      if (providedEmployeeCode && !isValidEmployeeCode(providedEmployeeCode)) {
        errors.push({
          line,
          reason:
            "Mã nhân viên không hợp lệ (chỉ A-Z, 0-9, _ và -, dài 2-32 ký tự).",
          fullName,
        });
        continue;
      }

      const dob = parseDateToISO(
        pick(row, ["Ngày sinh", "Ngay sinh", "DOB", "Birth", "Birthdate"]),
      );
      const phone = normalizePhone(
        pick(row, ["Số điện thoại", "So dien thoai", "Phone", "SDT", "Sdt"]),
      );
      const hometown = String(
        pick(row, ["Quê quán", "Que quan", "Hometown", "Que"]),
      ).trim();
      const recruiter = String(
        pick(row, ["Người tuyển", "Nguoi tuyen", "Recruiter", "Tuyen"]),
      ).trim();
      const note = String(
        pick(row, ["Ghi chú", "Ghi chu", "Note", "Notes"]),
      ).trim();
      const roomCode = String(
        pick(row, ["Phòng", "Phong", "Room", "Room code"]),
      ).trim();
      const rawDateIn = pick(row, [
        "Ngày vào",
        "Ngay vao",
        "Date in",
        "Check in",
      ]);
      const rawDateOut = pick(row, [
        "Ngày rời",
        "Ngay roi",
        "Ngày ra",
        "Ngay ra",
        "Date out",
        "Check out",
      ]);
      const dateIn = parseDateToISO(rawDateIn);
      const dateOut = parseDateToISO(rawDateOut);
      const hasRawDateIn = rawDateIn != null && String(rawDateIn).trim() !== "";
      const hasRawDateOut =
        rawDateOut != null && String(rawDateOut).trim() !== "";
      const hasAnyStayInfo = !!roomCode || hasRawDateIn || hasRawDateOut;

      if (hasRawDateOut && !dateOut) {
        errors.push({
          line,
          reason: `Không parse được ngày rời: "${String(rawDateOut).trim()}"`,
          fullName,
        });
        continue;
      }

      const k = keyOfWorker(fullName, dob, phone);
      let worker =
        (providedEmployeeCode
          ? existingByCode.get(providedEmployeeCode)
          : null) || existingByLegacyKey.get(k);
      let workerId = worker?.id || null;

      const currentCode = String(
        worker?.employee_code || worker?.employeeCode || "",
      )
        .trim()
        .toUpperCase();
      let finalEmployeeCode = providedEmployeeCode || currentCode || null;
      // No longer forcing makeVisitorEmployeeCode for missing codes
      // as per user requirement to allow empty employee codes.

      if (!workerId) {
        const workerPayload = {
          employee_code: finalEmployeeCode,
          full_name: fullName,
          dob: dob || null,
          phone: phone || null,
          hometown: hometown || null,
          recruiter: recruiter || null,
          note: note || null,
        };

        try {
          const ins = await services.workerService.create(workerPayload, token);
          workerId = ins.id;
          workersInserted++;
          worker = {
            id: workerId,
            employee_code: finalEmployeeCode,
            full_name: fullName,
            dob,
            phone,
            hometown,
            recruiter,
            note,
          };
          existingByCode.set(finalEmployeeCode, worker);
          existingByLegacyKey.set(k, worker);
        } catch (err) {
          errors.push({
            line,
            reason: `Tạo NLĐ lỗi: ${err.message}`,
            fullName,
          });
          continue;
        }
      } else {
        const patch = {};
        if (!currentCode) patch.employee_code = finalEmployeeCode;
        if (hometown && !worker.hometown) patch.hometown = hometown;
        if (recruiter && !worker.recruiter) patch.recruiter = recruiter;
        if (dob && !worker.dob) patch.dob = dob;
        if (phone && !worker.phone) patch.phone = phone;
        if (note && !worker.note) patch.note = note;

        if (Object.keys(patch).length) {
          try {
            await services.workerService.update(workerId, patch, token);
            workersUpdated++;
          } catch (err) {
            log("warn", `IMPORT WARN line ${line}: update worker failed`, err);
          }
        }
      }

      if (hasAnyStayInfo) {
        if (!roomCode) {
          errors.push({
            line,
            reason: "Thiếu mã phòng (Phòng/Room).",
            fullName,
          });
          continue;
        }

        const roomId = roomIdByCode.get(roomCode);
        if (!roomId) {
          errors.push({
            line,
            reason: `Không tìm thấy phòng: ${roomCode}`,
            fullName,
          });
          continue;
        }

        if (!dateIn) {
          errors.push({
            line,
            reason: "Thiếu hoặc không parse được ngày vào.",
            fullName,
          });
          continue;
        }

        const nextStayKey = stayKey(workerId, roomId, dateIn, dateOut || "");
        if (existingStayKeys.has(nextStayKey)) {
          skipped++;
          continue;
        }

        if (!dateOut) {
          const active = activeStayByWorker.get(workerId);
          if (active) {
            errors.push({
              line,
              reason: "NLĐ đang có lượt ở hiện tại (không tự chuyển).",
              fullName,
            });
            continue;
          }
        }

        try {
          await services.stayService.create(
            {
              room_id: roomId,
              worker_id: workerId,
              date_in: dateIn,
              date_out: dateOut || null,
            },
            token,
          );
          staysInserted++;
          existingStayKeys.add(nextStayKey);
          if (!dateOut)
            activeStayByWorker.set(workerId, {
              worker_id: workerId,
              room_id: roomId,
              date_out: null,
            });
        } catch (err) {
          errors.push({
            line,
            reason: `Tạo lịch sử ở lỗi: ${err.message}`,
            fullName,
          });
          continue;
        }
      }
    }

    log("info", "IMPORT DONE", {
      total,
      workersInserted,
      workersUpdated,
      staysInserted,
      skipped,
      errors: errors.length,
    });

    return {
      total,
      workersInserted,
      workersUpdated,
      staysInserted,
      skipped,
      errors,
      logs,
    };
  } catch (err) {
    return {
      total,
      workersInserted: 0,
      workersUpdated: 0,
      staysInserted: 0,
      skipped: 0,
      errors: [`Lỗi hệ thống khi nhập Excel: ${err.message}`],
    };
  }
}

async function _importExcelFileToDbLegacy(file, token) {
  const { roomService, workerService, stayService } = await loadDefaultDeps();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const pick = (row, keys) => {
    for (const k of keys) {
      const kk = normHeader(k);
      for (const col of Object.keys(row)) {
        if (normHeader(col) === kk) return row[col];
      }
    }
    return "";
  };

  const total = rows.length;

  try {
    // preload rooms
    const roomsData = await roomService.getAll(token);
    const roomIdByCode = new Map(
      (roomsData || []).map((r) => [String(r.code).trim(), r.id]),
    );

    // preload workers
    const workersData = await workerService.getAll(token);
    const keyOfWorker = (fullName, dob, phone) =>
      `${String(fullName || "")
        .trim()
        .toLowerCase()}|${String(dob || "").trim()}|${String(phone || "").trim()}`;

    const existingByCode = new Map();
    const existingByLegacyKey = new Map();
    for (const w of workersData || []) {
      // API returns snake_case from DB
      // Check both field names to be safe
      const fullName = w.full_name || w.fullName;
      const dob = w.dob;
      const phone = w.phone;
      const code = String(w.employee_code || w.employeeCode || "")
        .trim()
        .toUpperCase();
      if (code) existingByCode.set(code, w);
      existingByLegacyKey.set(keyOfWorker(fullName, dob || "", phone || ""), w);
    }

    // preload stays
    const staysData = await stayService.getAll(token);
    const activeStayByWorker = new Map();
    const existingStayKeys = new Set();
    const stayKey = (workerId, roomId, dateIn, dateOut) =>
      `${workerId}|${roomId}|${dateIn}|${dateOut || ""}`;
    for (const st of staysData || []) {
      existingStayKeys.add(
        stayKey(st.worker_id, st.room_id, st.date_in, st.date_out || ""),
      );
      if (!st.date_out) activeStayByWorker.set(st.worker_id, st);
    }

    let workersInserted = 0;
    let workersUpdated = 0;
    let staysInserted = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2;

      const employeeCode = String(
        pick(row, [
          "Mã nhân viên",
          "Ma nhan vien",
          "Mã NV",
          "Ma NV",
          "Employee code",
          "Employee_code",
          "Code",
        ]),
      )
        .trim()
        .toUpperCase();

      const fullName = String(
        pick(row, ["Họ tên", "Ho ten", "Full name", "Tên", "Name"]),
      ).trim();

      // employeeCode is now optional
      if (employeeCode && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(employeeCode)) {
        errors.push({
          line,
          reason:
            "Mã nhân viên không hợp lệ (chỉ A-Z, 0-9, _ và -, dài 2-32 ký tự).",
          fullName: fullName || "(trống)",
        });
        continue;
      }
      if (!fullName) {
        errors.push({
          line,
          reason: "Thiếu Họ tên.",
          fullName: "(trống)",
        });
        continue;
      }

      const dob = parseDateToISO(
        pick(row, ["Ngày sinh", "Ngay sinh", "DOB", "Birth", "Birthdate"]),
      );
      const phone = normalizePhone(
        pick(row, ["Số điện thoại", "So dien thoai", "Phone", "SDT", "Sdt"]),
      );
      const hometown = String(
        pick(row, ["Quê quán", "Que quan", "Hometown", "Que"]),
      ).trim();
      const recruiter = String(
        pick(row, ["Người tuyển", "Nguoi tuyen", "Recruiter", "Tuyen"]),
      ).trim();
      const note = String(
        pick(row, ["Ghi chú", "Ghi chu", "Note", "Notes"]),
      ).trim();
      const roomCode = String(
        pick(row, ["Phòng", "Phong", "Room", "Room code"]),
      ).trim();
      const rawDateIn = pick(row, [
        "Ngày vào",
        "Ngay vao",
        "Date in",
        "Check in",
      ]);
      const rawDateOut = pick(row, [
        "Ngày rời",
        "Ngay roi",
        "Ngày ra",
        "Ngay ra",
        "Date out",
        "Check out",
      ]);
      const dateIn = parseDateToISO(rawDateIn);
      const dateOut = parseDateToISO(rawDateOut);
      const hasRawDateIn = rawDateIn != null && String(rawDateIn).trim() !== "";
      const hasRawDateOut =
        rawDateOut != null && String(rawDateOut).trim() !== "";
      const hasAnyStayInfo = !!roomCode || hasRawDateIn || hasRawDateOut;

      if (hasRawDateOut && !dateOut) {
        errors.push({
          line,
          reason: `Không parse được ngày rời: "${String(rawDateOut).trim()}"`,
          fullName,
        });
        console.warn(
          `IMPORT ERROR line ${line}: dateOut invalid for "${fullName}"`,
          rawDateOut,
        );
      }

      // 1) upsert worker
      const k = keyOfWorker(fullName, dob, phone);
      let worker =
        existingByCode.get(employeeCode) || existingByLegacyKey.get(k);
      let workerId = worker?.id || null;

      if (!workerId) {
        const workerPayload = {
          employee_code: employeeCode,
          full_name: fullName,
          dob: dob || null,
          phone: phone || null,
          hometown: hometown || null,
          recruiter: recruiter || null,
          note: note || null,
        };

        try {
          const ins = await workerService.create(workerPayload, token);
          workerId = ins.id;
          workersInserted++;
          worker = {
            id: workerId,
            employee_code: employeeCode,
            full_name: fullName,
            dob,
            phone,
            hometown,
            recruiter,
            note,
          };
          existingByCode.set(employeeCode, worker);
          existingByLegacyKey.set(k, worker);
        } catch (err) {
          errors.push({
            line,
            reason: `Tạo NLĐ lỗi: ${err.message}`,
            fullName,
          });
          continue;
        }
      } else {
        const patch = {};
        const currentCode = String(
          worker.employee_code || worker.employeeCode || "",
        )
          .trim()
          .toUpperCase();
        if (!currentCode) patch.employee_code = employeeCode;
        if (hometown && !worker.hometown) patch.hometown = hometown;
        if (recruiter && !worker.recruiter) patch.recruiter = recruiter;
        if (dob && !worker.dob) patch.dob = dob;
        if (phone && !worker.phone) patch.phone = phone;
        if (note && !worker.note) patch.note = note;

        if (Object.keys(patch).length) {
          try {
            await workerService.update(workerId, patch, token);
            workersUpdated++;
          } catch (err) {
            console.error(`Update worker ${workerId} failed`, err);
          }
        }
      }

      // 2) stays
      if (hasAnyStayInfo) {
        if (!roomCode) {
          errors.push({
            line,
            reason: "Thiếu mã phòng (Phòng/Room).",
            fullName,
          });
          continue;
        }
        if (!dateIn) {
          errors.push({
            line,
            reason: `Thiếu hoặc không parse được ngày vào: "${String(rawDateIn).trim()}"`,
            fullName,
          });
          continue;
        }
        if (hasRawDateOut && !dateOut) {
          continue;
        }

        const roomId = roomIdByCode.get(roomCode);
        if (!roomId) {
          errors.push({
            line,
            reason: `Phòng không tồn tại: ${roomCode}`,
            fullName,
          });
          continue;
        }

        const nextStayKey = stayKey(workerId, roomId, dateIn, dateOut || "");
        if (existingStayKeys.has(nextStayKey)) {
          skipped++;
          continue;
        }

        if (!dateOut) {
          const active = activeStayByWorker.get(workerId);
          if (active) {
            errors.push({
              line,
              reason: "NLĐ đang có lượt ở hiện tại (không tự chuyển).",
              fullName,
            });
            continue;
          }
        }

        try {
          await stayService.create(
            {
              room_id: roomId,
              worker_id: workerId,
              date_in: dateIn,
              date_out: dateOut || null,
            },
            token,
          );
          staysInserted++;
          existingStayKeys.add(nextStayKey);
          if (!dateOut)
            activeStayByWorker.set(workerId, {
              worker_id: workerId,
              room_id: roomId,
              date_out: null,
            });
        } catch (err) {
          errors.push({
            line,
            reason: `Tạo lịch sử ở lỗi: ${err.message}`,
            fullName,
          });
          continue;
        }
      }
    }

    return {
      total,
      workersInserted,
      workersUpdated,
      staysInserted,
      skipped,
      errors,
    };
  } catch (err) {
    throw new Error(`Lỗi hệ thống khi nhập Excel: ${err.message}`);
  }
}

export async function importExcelFileToDb(file, token) {
  try {
    const name = String(file?.name || "");
    if (!/\.(xlsx|xls)$/i.test(name)) {
      return {
        total: 0,
        workersInserted: 0,
        workersUpdated: 0,
        staysInserted: 0,
        skipped: 0,
        errors: ["File không đúng định dạng .xlsx/.xls"],
      };
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) {
      return {
        total: 0,
        workersInserted: 0,
        workersUpdated: 0,
        staysInserted: 0,
        skipped: 0,
        errors: ["File Excel không có sheet dữ liệu."],
      };
    }
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return await importExcelRowsToDb(rows, token);
  } catch (e) {
    return {
      total: 0,
      workersInserted: 0,
      workersUpdated: 0,
      staysInserted: 0,
      skipped: 0,
      errors: [`Không đọc được file Excel: ${e?.message || String(e)}`],
    };
  }
}
