// src/services/workersService.js
import { supabase } from "./supabaseClient";

function isMissingWorkerNoteColumn(error) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("workers.note") || msg.includes('column "note"');
}

export async function addWorker(worker) {
  const basePayload = {
    full_name: (worker.fullName || "").trim(),
    hometown: (worker.hometown || "").trim(),
    recruiter: (worker.recruiter || "").trim(),
    dob: worker.dob ? worker.dob : null,
    phone: (worker.phone || "").trim(),
  };
  const payloadWithNote = { ...basePayload, note: (worker.note || "").trim() };

  let res = await supabase
    .from("workers")
    .insert([payloadWithNote])
    .select("id")
    .single();

  if (res.error && isMissingWorkerNoteColumn(res.error)) {
    res = await supabase.from("workers").insert([basePayload]).select("id").single();
  }

  if (res.error) throw new Error("Tạo NLĐ lỗi: " + res.error.message);

  return { id: res.data.id, ...worker };
}

export async function updateWorker(workerId, patch) {
  const payloadBase = {};
  if (patch.fullName != null) payloadBase.full_name = patch.fullName.trim();
  if (patch.hometown != null) payloadBase.hometown = patch.hometown.trim();
  if (patch.recruiter != null) payloadBase.recruiter = patch.recruiter.trim();
  if (patch.dob !== undefined) payloadBase.dob = patch.dob ? patch.dob : null;
  if (patch.phone !== undefined) payloadBase.phone = (patch.phone || "").trim();

  const payloadWithNote = { ...payloadBase };
  if (patch.note !== undefined) payloadWithNote.note = (patch.note || "").trim();

  let res = await supabase.from("workers").update(payloadWithNote).eq("id", workerId);
  if (res.error && isMissingWorkerNoteColumn(res.error)) {
    res = await supabase.from("workers").update(payloadBase).eq("id", workerId);
  }

  if (res.error) throw new Error("Cập nhật NLĐ lỗi: " + res.error.message);
}

export async function deleteWorker(workerId) {
  const res = await supabase.from("workers").delete().eq("id", workerId);
  if (res.error) throw new Error("Xóa NLĐ lỗi: " + res.error.message);
}
