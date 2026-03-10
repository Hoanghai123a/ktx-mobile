// src/services/ktxDbService.js
import { supabase } from "./supabaseClient";

/**
 * Trả về shape giống App.jsx đang dùng:
 * floors: [{id,name,rooms:[{id,code,stays:[{id,workerId,roomId,dateIn,dateOut}]}]}]
 * workers: [{id,fullName,hometown,recruiter,dob,phone}]
 */
export async function loadAllFromDb() {
  const floorsRes = await supabase
    .from("floors")
    .select("id,name,sort")
    .order("sort", { ascending: true });
  if (floorsRes.error)
    throw new Error("load floors error: " + floorsRes.error.message);

  const roomsRes = await supabase
    .from("rooms")
    .select("id,floor_id,code,sort")
    .order("sort", { ascending: true });
  if (roomsRes.error)
    throw new Error("load rooms error: " + roomsRes.error.message);

  const workersRes = await supabase
    .from("workers")
    .select("id,full_name,hometown,recruiter,dob,phone")
    .order("full_name", { ascending: true });
  if (workersRes.error)
    throw new Error("load workers error: " + workersRes.error.message);

  const staysRes = await supabase
    .from("stays")
    .select("id,room_id,worker_id,date_in,date_out")
    .order("date_in", { ascending: false });
  if (staysRes.error)
    throw new Error("load stays error: " + staysRes.error.message);

  // load electricity records if table exists; tolerate missing-table errors gracefully
  let elecData = [];
  const elecRes = await supabase
    .from("electricities")
    // request all columns; older start/end fields (if present) will be
    // handled by our normalization logic below
    .select("*")
    .order("month", { ascending: false });

  if (elecRes.error) {
    const msg = elecRes.error.message || "";
    const isMissingTable =
      elecRes.error.code === "42P01" ||
      msg.includes("Could not find the table") ||
      /relation "electricities" does not exist/i.test(msg) ||
      /table "electricities" does not exist/i.test(msg);

    if (!isMissingTable) {
      throw new Error("load electricity error: " + elecRes.error.message);
    }
    console.warn(
      "electricities table not found, continuing without billing data",
    );
    // otherwise just leave elecData empty and continue
  } else {
    elecData = elecRes.data || [];
  }

  const roomsByFloor = new Map();
  for (const r of roomsRes.data || []) {
    if (!roomsByFloor.has(r.floor_id)) roomsByFloor.set(r.floor_id, []);
    roomsByFloor
      .get(r.floor_id)
      .push({ id: r.id, code: r.code, stays: [], electricity: null });
  }

  const staysByRoom = new Map();
  for (const st of staysRes.data || []) {
    if (!staysByRoom.has(st.room_id)) staysByRoom.set(st.room_id, []);
    staysByRoom.get(st.room_id).push({
      id: st.id,
      workerId: st.worker_id,
      roomId: st.room_id,
      dateIn: st.date_in,
      dateOut: st.date_out,
    });
  }

  const elecByRoom = new Map();
  for (const e of elecData || []) {
    // keep latest per room or simple last one
    elecByRoom.set(e.room_id, {
      id: e.id,
      month: e.month,
      // normalize column names from database to internal fields
      start: e.start_reading != null ? e.start_reading : e.start,
      end: e.end_reading != null ? e.end_reading : e.end,
      paid: e.paid,
      paidAt: e.paid_at,
    });
  }

  const floors = (floorsRes.data || []).map((f) => {
    const rooms = (roomsByFloor.get(f.id) || []).map((r) => ({
      ...r,
      stays: staysByRoom.get(r.id) || [],
      electricity: elecByRoom.get(r.id) || null,
    }));
    return { id: f.id, name: f.name, rooms };
  });

  const workers = (workersRes.data || []).map((w) => ({
    id: w.id,
    fullName: w.full_name,
    hometown: w.hometown || "",
    recruiter: w.recruiter || "",
    dob: w.dob || "",
    phone: w.phone || "",
  }));

  return { floors, workers };
}

export async function initKtxFromInputs({ floors, roomsPerFloor, startNo }) {
  const F = Number(floors);
  const R = Number(roomsPerFloor);
  const S = Number(startNo);

  if (!Number.isInteger(F) || F <= 0 || F > 100)
    throw new Error("Số tầng không hợp lệ.");
  if (!Number.isInteger(R) || R <= 0 || R > 300)
    throw new Error("Số phòng/tầng không hợp lệ.");
  if (!Number.isInteger(S) || S <= 0)
    throw new Error("Số bắt đầu không hợp lệ.");

  const floorsCheck = await supabase.from("floors").select("id").limit(1);
  if (floorsCheck.error)
    throw new Error(
      "Không kiểm tra được dữ liệu hiện có: " + floorsCheck.error.message,
    );
  if ((floorsCheck.data || []).length > 0)
    throw new Error(
      "KTX đã có tầng/phòng. Hãy Reset DB trước khi khởi tạo lại.",
    );

  const floorsPayload = Array.from({ length: F }, (_, i) => ({
    name: `Tầng ${i + 1}`,
    sort: i + 1,
  }));

  const insFloors = await supabase
    .from("floors")
    .insert(floorsPayload)
    .select("id,sort");
  if (insFloors.error)
    throw new Error("Tạo tầng lỗi: " + insFloors.error.message);

  const floorIdBySort = new Map(
    (insFloors.data || []).map((x) => [x.sort, x.id]),
  );

  const totalRooms = F * R;
  const roomsPayload = [];
  for (let i = 0; i < totalRooms; i++) {
    const floorSort = Math.floor(i / R) + 1; // 1..F
    const sort = (i % R) + 1; // 1..R
    const code = String(S + i);
    roomsPayload.push({ floor_id: floorIdBySort.get(floorSort), code, sort });
  }

  const BATCH = 500;
  for (let i = 0; i < roomsPayload.length; i += BATCH) {
    const batch = roomsPayload.slice(i, i + BATCH);
    const insRooms = await supabase.from("rooms").insert(batch);
    if (insRooms.error)
      throw new Error("Tạo phòng lỗi: " + insRooms.error.message);
  }

  return true;
}

/** Xóa sạch DB theo thứ tự tránh FK */
export async function wipeDatabase() {
  const a = await supabase.from("stays").delete().not("id", "is", null);
  if (a.error) throw new Error("stays: " + a.error.message);

  const b = await supabase.from("workers").delete().not("id", "is", null);
  if (b.error) throw new Error("workers: " + b.error.message);

  const c = await supabase.from("rooms").delete().not("id", "is", null);
  if (c.error) throw new Error("rooms: " + c.error.message);

  const d = await supabase.from("floors").delete().not("id", "is", null);
  if (d.error) throw new Error("floors: " + d.error.message);
}
