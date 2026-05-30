import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Confirm from "../../components/ui/Confirm";
import clsx from "../../components/ui/clsx";
import { Save, Trash2, StickyNote } from "lucide-react";
import NoteList from "../../components/ui/NoteList";

export default function WorkerModal({
  open,
  onClose,

  worker, // { id, fullName, phone, note }
  stays, // list stays of worker (optional)
  roomById, // Map(roomId -> room) optional

  auth,
  requireAdmin,

  actions, // { updateWorker, deleteWorker }
}) {
  const [employeeCode, setEmployeeCode] = useState(worker?.employeeCode || "");
  const [fullName, setFullName] = useState(worker?.fullName || "");
  const [dob, setDob] = useState(worker?.dob || "");
  const [hometown, setHometown] = useState(worker?.hometown || "");
  const [recruiter, setRecruiter] = useState(worker?.recruiter || "");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [note, setNote] = useState(worker?.note || "");
  const [confirmDel, setConfirmDel] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setEmployeeCode(worker?.employeeCode || "");
    setFullName(worker?.fullName || "");
    setDob(worker?.dob || "");
    setHometown(worker?.hometown || "");
    setRecruiter(worker?.recruiter || "");
    setPhone(worker?.phone || "");
    setNote(worker?.note || "");
  }, [
    worker?.id,
    worker?.employeeCode,
    worker?.fullName,
    worker?.dob,
    worker?.hometown,
    worker?.recruiter,
    worker?.phone,
    worker?.note,
  ]);

  const title = worker
    ? `${worker.employeeCode ? `${worker.employeeCode} - ` : ""}${
        worker.fullName || "NLĐ"
      }`
    : "NLĐ";

  const currentStay = useMemo(() => {
    const list = stays || [];
    return list.find((s) => !s.dateOut) || null;
  }, [stays]);

  const stayHistory = useMemo(() => {
    const list = stays || [];
    return list
      .filter((s) => !!s.dateOut)
      .sort((a, b) => new Date(b.dateOut || 0) - new Date(a.dateOut || 0));
  }, [stays]);

  return (
    <>
      <Modal open={open} title={title} onClose={onClose} zIndex="z-[70]">
        {!worker ? (
          <div className="text-sm text-slate-600">Không tìm thấy NLĐ.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Ghi chú chi tiết</div>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" />
                    {showNotes ? "Ẩn" : "Xem"}
                  </span>
                </button>
              </div>
              {showNotes && (
                <NoteList targetId={worker.id} targetType="worker" />
              )}
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-semibold">Thông tin NLĐ</div>

              <div className="mt-3 space-y-2">
                <TextField
                  label="Mã nhân viên"
                  value={employeeCode}
                  onChange={(v) =>
                    setEmployeeCode(String(v || "").toUpperCase())
                  }
                  placeholder="VD: NV001"
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="Họ tên"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Nguyễn Văn A"
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="Ngày sinh"
                  value={dob}
                  onChange={setDob}
                  type="date"
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="Quê quán"
                  value={hometown}
                  onChange={setHometown}
                  placeholder="Hải Phòng"
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="Người tuyển"
                  value={recruiter}
                  onChange={setRecruiter}
                  placeholder="Nguyễn Văn B"
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="SĐT"
                  value={phone}
                  onChange={setPhone}
                  placeholder="09xxxxxxx"
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="Ghi chú"
                  value={note}
                  onChange={setNote}
                  placeholder="Ghi chú thêm về NLĐ"
                  disabled={!auth?.isAdmin}
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className={clsx(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                    auth?.isAdmin
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                  onClick={() =>
                    requireAdmin(async () => {
                      if (!actions?.updateWorker) {
                        alert("Chưa nối actions.updateWorker");
                        return;
                      }
                      const code = (employeeCode || "").trim().toUpperCase();
                      if (code && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) {
                        message.warning(
                          "Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự.",
                        );
                        return;
                      }
                      const nextName = (fullName || "").trim();
                      if (!nextName) {
                        message.warning("Tên không được rỗng.");
                        return;
                      }
                      console.log("WorkerModal: calling updateWorker...");
                      const result = await actions.updateWorker({
                        workerId: worker.id,
                        patch: {
                          employeeCode: code,
                          fullName: nextName,
                          dob: dob || null,
                          hometown: hometown || "",
                          recruiter: recruiter || "",
                          phone: phone || "",
                          note: note || "",
                        },
                      });

                      // Kiểm tra nếu có kết quả trả về (không bị lỗi)
                      if (result) {
                        message.success("Cập nhật thông tin thành công!"); // Thêm thông báo để người dùng biết
                        onClose?.();
                      } else {
                        message.error("Lưu thất bại, vui lòng thử lại.");
                      }
                    })
                  }
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    Lưu
                  </span>
                </button>

                <button
                  className={clsx(
                    "rounded-2xl px-4 py-3 text-sm font-semibold",
                    auth?.isAdmin
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                  onClick={() => requireAdmin(() => setConfirmDel(true))}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-semibold">Tình trạng ở</div>
              <div className="mt-2 text-sm text-slate-700">
                {currentStay
                  ? (() => {
                      let roomCode = "—";
                      // Add detailed fallback handling
                      if (currentStay.roomId) {
                        if (roomById) {
                          const room = roomById.get(currentStay.roomId);
                          if (room) {
                            roomCode = room.code || currentStay.roomId;
                          } else {
                            // Room not found in map, use ID as fallback
                            roomCode = currentStay.roomId;
                          }
                        } else {
                          // roomById is undefined, use ID as fallback
                          roomCode = currentStay.roomId;
                        }
                      }
                      // Format date properly
                      let dateStr = "-";
                      if (currentStay.dateIn) {
                        if (typeof currentStay.dateIn === "string") {
                          // If it's a string like "2025-12-23" or "2025-12-23T10:00:00Z"
                          dateStr = currentStay.dateIn.split("T")[0];
                        } else if (currentStay.dateIn instanceof Date) {
                          // If it's a Date object
                          dateStr = currentStay.dateIn
                            .toISOString()
                            .split("T")[0];
                        }
                      }
                      return `Đang ở phòng: ${roomCode} (vào ${dateStr})`;
                    })()
                  : "Hiện không ở phòng nào."}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-semibold">Lịch sử ở</div>
              <div className="mt-2 space-y-2">
                {stayHistory.length ? (
                  stayHistory.map((s) => {
                    const room = roomById?.get(s.roomId);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                      >
                        <div className="text-sm font-medium text-slate-700">
                          Phòng {room?.code || s.roomId}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {s.dateIn ? String(s.dateIn).slice(0, 10) : "?"} ➔{" "}
                          {s.dateOut ? String(s.dateOut).slice(0, 10) : "?"}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-1 text-center text-xs text-slate-400">
                    Chưa có lịch sử.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={confirmDel}
        title="Xóa NLĐ"
        message="Bạn chắc chắn muốn xóa NLĐ này?"
        confirmText="Xóa"
        onCancel={() => setConfirmDel(false)}
        onConfirm={() =>
          requireAdmin(async () => {
            setConfirmDel(false);
            if (!actions?.deleteWorker) {
              alert("Chưa nối actions.deleteWorker");
              return;
            }
            await actions.deleteWorker({ workerId: worker.id });
            onClose?.();
          })
        }
      />
    </>
  );
}
