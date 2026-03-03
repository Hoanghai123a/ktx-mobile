// src/services/workersService.js
import { supabase } from "./supabaseClient";

export async function addWorker(worker) {
  const payload = {
    full_name: (worker.fullName || "").trim(),
    hometown: (worker.hometown || "").trim(),
    recruiter: (worker.recruiter || "").trim(),
    dob: worker.dob ? worker.dob : null,
    phone: (worker.phone || "").trim(),
  };

  const res = await supabase
    .from("workers")
    .insert([payload])
    .select("id")
    .single();
  if (res.error) throw new Error("Tạo NLĐ lỗi: " + res.error.message);

  return { id: res.data.id, ...worker };
}

export async function updateWorker(workerId, patch) {
  const payload = {};
  if (patch.fullName != null) payload.full_name = patch.fullName.trim();
  if (patch.hometown != null) payload.hometown = patch.hometown.trim();
  if (patch.recruiter != null) payload.recruiter = patch.recruiter.trim();
  if (patch.dob !== undefined) payload.dob = patch.dob ? patch.dob : null;
  if (patch.phone !== undefined) payload.phone = (patch.phone || "").trim();

  const res = await supabase.from("workers").update(payload).eq("id", workerId);
  if (res.error) throw new Error("Cập nhật NLĐ lỗi: " + res.error.message);
}

export async function deleteWorker(workerId) {
  const res = await supabase.from("workers").delete().eq("id", workerId);
  if (res.error) throw new Error("Xóa NLĐ lỗi: " + res.error.message);
}
