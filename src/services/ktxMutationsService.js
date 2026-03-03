// src/services/ktxMutationsService.js
import { supabase } from "./supabaseClient";

export async function addFloor({ name, sort }) {
  const res = await supabase
    .from("floors")
    .insert([{ name, sort }])
    .select("id")
    .single();
  if (res.error) throw new Error("Tạo tầng lỗi: " + res.error.message);
  return res.data.id;
}

export async function deleteFloor({ floorId, roomIds }) {
  if (roomIds?.length) {
    const a = await supabase.from("stays").delete().in("room_id", roomIds);
    if (a.error) throw new Error("Xóa tầng lỗi (stays): " + a.error.message);

    const b = await supabase.from("rooms").delete().in("id", roomIds);
    if (b.error) throw new Error("Xóa tầng lỗi (rooms): " + b.error.message);
  }

  const c = await supabase.from("floors").delete().eq("id", floorId);
  if (c.error) throw new Error("Xóa tầng lỗi (floor): " + c.error.message);
}

export async function addRoom({ floorId, code, sort }) {
  const res = await supabase
    .from("rooms")
    .insert([{ floor_id: floorId, code, sort }]);
  if (res.error) throw new Error("Tạo phòng lỗi: " + res.error.message);
}

export async function updateRoomCode({ roomId, code }) {
  const res = await supabase.from("rooms").update({ code }).eq("id", roomId);
  if (res.error) throw new Error("Sửa tên phòng lỗi: " + res.error.message);
}

export async function deleteRoom({ roomId }) {
  const a = await supabase.from("stays").delete().eq("room_id", roomId);
  if (a.error) throw new Error("Xóa phòng lỗi (stays): " + a.error.message);

  const b = await supabase.from("rooms").delete().eq("id", roomId);
  if (b.error) throw new Error("Xóa phòng lỗi (room): " + b.error.message);
}

export async function checkInWorker({ roomId, workerId, dateIn }) {
  const payload = {
    room_id: roomId,
    worker_id: workerId,
    date_in: dateIn,
    date_out: null,
  };
  const res = await supabase.from("stays").insert([payload]);
  if (res.error)
    throw new Error("Thêm NLĐ vào phòng lỗi: " + res.error.message);
}

export async function checkOutStay({ stayId, dateOut }) {
  const res = await supabase
    .from("stays")
    .update({ date_out: dateOut })
    .eq("id", stayId);
  if (res.error) throw new Error("Cho NLĐ rời đi lỗi: " + res.error.message);
}

export async function transferWorker({
  stayId,
  workerId,
  toRoomId,
  transferDate,
}) {
  // 1) close old stay
  const closeRes = await supabase
    .from("stays")
    .update({ date_out: transferDate })
    .eq("id", stayId);
  if (closeRes.error) {
    throw new Error(
      "Chuyển phòng lỗi (đóng phòng cũ): " + closeRes.error.message,
    );
  }

  // 2) create new stay
  const insRes = await supabase
    .from("stays")
    .insert([
      {
        room_id: toRoomId,
        worker_id: workerId,
        date_in: transferDate,
        date_out: null,
      },
    ]);
  if (insRes.error) {
    throw new Error(
      "Chuyển phòng lỗi (tạo phòng mới): " + insRes.error.message,
    );
  }
}
