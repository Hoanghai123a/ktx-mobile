// src/services/excelImportService.js
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

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
  if (typeof v === "number") {
    if (v > 20000 && v < 60000) return excelSerialToISO(v);
    return "";
  }
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
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

export async function importExcelFileToDb(file) {
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

  // preload rooms
  const roomsRes = await supabase.from("rooms").select("id,code");
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  const roomIdByCode = new Map(
    (roomsRes.data || []).map((r) => [String(r.code).trim(), r.id]),
  );

  // preload workers
  const workersRes = await supabase
    .from("workers")
    .select("id,full_name,dob,phone,hometown,recruiter");
  if (workersRes.error) throw new Error(workersRes.error.message);

  const keyOfWorker = (fullName, dob, phone) =>
    `${String(fullName || "")
      .trim()
      .toLowerCase()}|${String(dob || "").trim()}|${String(phone || "").trim()}`;

  const existing = new Map();
  for (const w of workersRes.data || []) {
    existing.set(keyOfWorker(w.full_name, w.dob || "", w.phone || ""), w);
  }

  // preload stays
  const staysRes = await supabase
    .from("stays")
    .select("id,worker_id,room_id,date_out");
  if (staysRes.error) throw new Error(staysRes.error.message);

  const activeStayByWorker = new Map();
  for (const st of staysRes.data || []) {
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

    const fullName = String(
      pick(row, ["Họ tên", "Ho ten", "Full name", "Tên", "Name"]),
    ).trim();
    if (!fullName) {
      skipped++;
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
    const roomCode = String(
      pick(row, ["Phòng", "Phong", "Room", "Room code"]),
    ).trim();
    const dateIn = parseDateToISO(
      pick(row, ["Ngày vào", "Ngay vao", "Date in", "Check in"]),
    );
    const dateOut = parseDateToISO(
      pick(row, [
        "Ngày rời",
        "Ngay roi",
        "Ngày ra",
        "Ngay ra",
        "Date out",
        "Check out",
      ]),
    );

    // 1) upsert worker
    const k = keyOfWorker(fullName, dob, phone);
    let worker = existing.get(k);
    let workerId = worker?.id || null;

    if (!workerId) {
      const ins = await supabase
        .from("workers")
        .insert([
          {
            full_name: fullName,
            dob: dob || null,
            phone: phone || null,
            hometown: hometown || null,
            recruiter: recruiter || null,
          },
        ])
        .select("id")
        .single();

      if (ins.error) {
        errors.push({
          line,
          reason: `Tạo NLĐ lỗi: ${ins.error.message}`,
          fullName,
        });
        continue;
      }

      workerId = ins.data.id;
      workersInserted++;
      worker = {
        id: workerId,
        full_name: fullName,
        dob,
        phone,
        hometown,
        recruiter,
      };
      existing.set(k, worker);
    } else {
      const patch = {};
      if (hometown && !worker.hometown) patch.hometown = hometown;
      if (recruiter && !worker.recruiter) patch.recruiter = recruiter;
      if (dob && !worker.dob) patch.dob = dob;
      if (phone && !worker.phone) patch.phone = phone;

      if (Object.keys(patch).length) {
        const up = await supabase
          .from("workers")
          .update(patch)
          .eq("id", workerId);
        if (!up.error) workersUpdated++;
      }
    }

    // 2) stays
    if (roomCode && dateIn) {
      const roomId = roomIdByCode.get(roomCode);
      if (!roomId) {
        errors.push({
          line,
          reason: `Phòng không tồn tại: ${roomCode}`,
          fullName,
        });
        continue;
      }

      const active = activeStayByWorker.get(workerId);
      if (active) {
        errors.push({
          line,
          reason: `NLĐ đang ở phòng khác (không tự chuyển)`,
          fullName,
        });
        continue;
      }

      const insStay = await supabase
        .from("stays")
        .insert([
          {
            room_id: roomId,
            worker_id: workerId,
            date_in: dateIn,
            date_out: dateOut || null,
          },
        ]);

      if (insStay.error) {
        errors.push({
          line,
          reason: `Tạo lịch sử ở lỗi: ${insStay.error.message}`,
          fullName,
        });
        continue;
      }

      staysInserted++;
      if (!dateOut)
        activeStayByWorker.set(workerId, {
          worker_id: workerId,
          room_id: roomId,
          date_out: null,
        });
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
}
