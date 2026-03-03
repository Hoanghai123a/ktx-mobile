import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Confirm from "../../components/ui/Confirm";
import clsx from "../../components/ui/clsx";
import { Save, Trash2 } from "lucide-react";

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
  const [fullName, setFullName] = useState(worker?.fullName || "");
  const [dob, setDob] = useState(worker?.dob || "");
  const [hometown, setHometown] = useState(worker?.hometown || "");
  const [recruiter, setRecruiter] = useState(worker?.recruiter || "");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    setFullName(worker?.fullName || "");
    setDob(worker?.dob || "");
    setHometown(worker?.hometown || "");
    setRecruiter(worker?.recruiter || "");
    setPhone(worker?.phone || "");
  }, [worker?.id]);

  const title = worker ? worker.fullName || "NLĐ" : "NLĐ";

  const currentStay = useMemo(() => {
    const list = stays || [];
    return list.find((s) => !s.dateOut) || null;
  }, [stays]);

  return (
    <>
      <Modal open={open} title={title} onClose={onClose}>
        {!worker ? (
          <div className="text-sm text-slate-600">Không tìm thấy NLĐ.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-semibold">Thông tin NLĐ</div>

              <div className="mt-3 space-y-2">
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
                      const nextName = (fullName || "").trim();
                      if (!nextName) return alert("Tên không được rỗng.");
                      await actions.updateWorker({
                        workerId: worker.id,
                        patch: {
                          fullName: nextName,
                          dob: dob || null,
                          hometown: hometown || "",
                          recruiter: recruiter || "",
                          phone: phone || "",
                        },
                      });
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
