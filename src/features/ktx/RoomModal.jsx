import React, { useMemo, useState } from "react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Pill from "../../components/ui/Pill";
import Confirm from "../../components/ui/Confirm";
import clsx from "../../components/ui/clsx";
import {
  Users,
  Trash2,
  Save,
  LogOut,
  Plus,
  Edit,
  StickyNote,
} from "lucide-react";
import ElectricityModal from "./ElectricityModal";
import NoteList from "../../components/ui/NoteList";

export default function RoomModal({
  open,
  onClose,
  // data
  floor,
  room, // { id, code, stays:[{id, workerId, dateIn, dateOut}], electricity? }
  workerById, // Map(workerId -> worker)
  // permissions
  auth, // { isAdmin: boolean }
  requireAdmin, // (fn)=>void
  // actions (bạn nối từ App.jsx)
  // note: may supply onViewWorker to allow clicking a name to open worker details
  // available callbacks: updateRoom, deleteRoom, checkOut, addWorker, checkIn,
  //                  onViewWorker, transfer, upsertElectricity, markElectricityPaid
  actions,
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [elecModal, setElecModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // manual check-in form state
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const [isAdding, setIsAdding] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newHometown, setNewHometown] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRecruiter, setNewRecruiter] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newDateIn, setNewDateIn] = useState(todayISO());
  const [checkOutCtx, setCheckOutCtx] = useState({
    open: false,
    stayId: null,
    workerName: "",
    dateOut: todayISO(),
  });

  const current = useMemo(() => {
    const stays = room?.stays || [];
    return stays.filter((s) => !s.dateOut);
  }, [room]);

  const history = useMemo(() => {
    const stays = room?.stays || [];
    return stays
      .filter((s) => !!s.dateOut)
      .sort((a, b) => new Date(b.dateOut || 0) - new Date(a.dateOut || 0));
  }, [room]);

  // title shown in modal header; include both label and code for clarity
  const title = room ? `Chi tiết phòng ${room.code}` : "Chi tiết phòng";

  if (!room) {
    return (
      <Modal open={open} title="Phòng" onClose={onClose}>
        <div className="text-sm text-slate-600">Không tìm thấy phòng.</div>
      </Modal>
    );
  }

  return (
    <>
      <Modal open={open} title={title} onClose={onClose}>
        <div className="space-y-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Ghi chú phòng
              </div>
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
            {showNotes && <NoteList targetId={room.id} targetType="room" />}
          </div>

          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-900">
              {floor?.name || "Tầng"}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {/* hint only shown when caller handles viewing worker details */}
              {actions?.onViewWorker ? "Click NLĐ để xem" : ""}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-2 justify-center items-center">
                <div className="text-base font-semibold text-slate-900">
                  Phòng {room.code}
                </div>
                {auth?.isAdmin ? (
                  <button
                    className="mt-1 grid h-7 w-7 place-items-center rounded-2xl bg-white/70 ring-1 ring-slate-200 hover:bg-white"
                    onClick={() => {
                      // allow editing the code directly from top panel
                      const next = prompt("Mã phòng", room.code) || room.code;
                      if (next !== room.code && next.trim()) {
                        requireAdmin(async () => {
                          await actions.updateRoom({
                            roomId: room.id,
                            patch: { code: next },
                          });
                        });
                      }
                    }}
                    title="Sửa mã phòng"
                  >
                    <Edit className="h-4 w-4 text-slate-600" />
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={clsx(
                    "rounded-2xl px-3 py-1 text-xs font-semibold",
                    auth?.isAdmin
                      ? "bg-sky-500 text-white"
                      : "bg-slate-200 text-slate-500",
                  )}
                  onClick={() => setElecModal(true)}
                >
                  Tiền điện
                </button>
                <Pill
                  icon={Users}
                  text={`${current.length} đang ở`}
                  tone={current.length ? "green" : "slate"}
                />
              </div>
            </div>
          </div>

          {/* Current stays */}
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Người đang ở</div>
                <div className="text-xs text-slate-600">
                  Checkout từng người hoặc thêm người mới
                </div>
              </div>

              <button
                className={clsx(
                  "rounded-2xl px-3 py-2 text-xs font-semibold",
                  auth?.isAdmin
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600",
                )}
                onClick={() => requireAdmin(() => setIsAdding(true))}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Check-in
                </span>
              </button>
            </div>

            {isAdding && (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-dashed border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-600">
                    Tạo NLĐ mới
                  </div>
                  <div className="mt-2 space-y-3">
                    <TextField
                      label="Họ tên"
                      value={newFullName}
                      onChange={setNewFullName}
                      placeholder="VD: Nguyễn Văn A"
                    />
                    <TextField
                      label="Ngày sinh"
                      value={newDob}
                      onChange={setNewDob}
                      type="date"
                    />
                    <TextField
                      label="Quê quán"
                      value={newHometown}
                      onChange={setNewHometown}
                      placeholder="VD: Nghệ An"
                    />
                    <TextField
                      label="Số điện thoại"
                      value={newPhone}
                      onChange={setNewPhone}
                      placeholder="VD: 0987654321"
                    />
                    <TextField
                      label="Người tuyển"
                      value={newRecruiter}
                      onChange={setNewRecruiter}
                      placeholder="VD: Chị Lan"
                    />
                    <TextField
                      label="Ghi chú"
                      value={newNote}
                      onChange={setNewNote}
                      placeholder="Ghi chú thêm về NLĐ"
                    />
                  </div>
                </div>

                <TextField
                  label="Ngày vào"
                  value={newDateIn}
                  onChange={setNewDateIn}
                  type="date"
                />

                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                    onClick={async () => {
                      requireAdmin(async () => {
                        if (!newFullName.trim()) {
                          alert("Vui lòng nhập Họ tên.");
                          return;
                        }
                        const w = await actions.addWorker({
                          fullName: newFullName.trim(),
                          hometown: newHometown.trim(),
                          phone: newPhone.trim(),
                          recruiter: newRecruiter.trim(),
                          dob: newDob,
                          note: newNote.trim(),
                        });
                        await actions.checkIn({
                          floorId: floor.id,
                          roomId: room.id,
                          workerId: w.id,
                          dateIn: newDateIn || todayISO(),
                        });
                        setIsAdding(false);
                        // reset form
                        setNewFullName("");
                        setNewDob("");
                        setNewHometown("");
                        setNewPhone("");
                        setNewRecruiter("");
                        setNewNote("");
                        setNewDateIn(todayISO());
                      });
                    }}
                  >
                    Thêm vào phòng
                  </button>
                  <button
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    onClick={() => setIsAdding(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {current.length ? (
                current.map((s) => {
                  const w = workerById?.get(s.workerId);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <button
                        className="min-w-0 text-left"
                        onClick={() => actions?.onViewWorker?.(w?.id)}
                      >
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {w?.fullName || w?.name || s.workerId}
                        </div>
                        <div className="text-xs text-slate-600">
                          Vào: {s.dateIn ? String(s.dateIn).slice(0, 10) : "-"}
                        </div>
                        {w?.note ? (
                          <div className="text-xs text-slate-600">
                            Ghi chú: {w.note}
                          </div>
                        ) : null}
                      </button>

                      <div className="flex gap-2">
                        {actions?.transfer ? (
                          <button
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                            onClick={() =>
                              actions.transfer({
                                stayId: s.id,
                                workerId: s.workerId,
                              })
                            }
                          >
                            Chuyển phòng
                          </button>
                        ) : null}
                        <button
                          className={clsx(
                            "rounded-2xl px-3 py-2 text-xs font-semibold",
                            auth?.isAdmin
                              ? "bg-slate-100 text-slate-700"
                              : "bg-slate-50 text-slate-400",
                          )}
                          onClick={() =>
                            requireAdmin(async () => {
                              if (!actions?.checkOut) {
                                alert("Chưa nối actions.checkOut");
                                return;
                              }
                              setCheckOutCtx({
                                open: true,
                                stayId: s.id,
                                workerName: w?.fullName || "",
                                dateOut: todayISO(),
                              });
                            })
                          }
                        >
                          <span className="inline-flex items-center gap-2">
                            <LogOut className="h-4 w-4" />
                            Rời đi
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-600">
                  Phòng đang trống.
                </div>
              )}
            </div>
          </div>

          {/* History stays */}
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">
              Lịch sử ở phòng
            </div>
            <div className="mt-3 space-y-2">
              {history.length ? (
                history.map((s) => {
                  const w = workerById?.get(s.workerId);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-700">
                          {w?.fullName || w?.name || s.workerId}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {s.dateIn ? String(s.dateIn).slice(0, 10) : "?"} ➔{" "}
                          {s.dateOut ? String(s.dateOut).slice(0, 10) : "?"}
                        </div>
                      </div>
                      <Pill text="Đã rời" tone="slate" />
                    </div>
                  );
                })
              ) : (
                <div className="py-2 text-center text-xs text-slate-400">
                  Chưa có lịch sử.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={checkOutCtx.open}
        title="Chọn ngày rời đi"
        onClose={() =>
          setCheckOutCtx((prev) => ({ ...prev, open: false, stayId: null }))
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            {checkOutCtx.workerName
              ? `NLĐ: ${checkOutCtx.workerName}`
              : "Xác nhận thông tin rời đi"}
          </div>
          <TextField
            label="Ngày rời đi"
            value={checkOutCtx.dateOut}
            onChange={(v) =>
              setCheckOutCtx((prev) => ({ ...prev, dateOut: v }))
            }
            type="date"
          />
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={() =>
                setCheckOutCtx((prev) => ({
                  ...prev,
                  open: false,
                  stayId: null,
                }))
              }
            >
              Hủy
            </button>
            <button
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              onClick={() =>
                requireAdmin(async () => {
                  if (!actions?.checkOut) {
                    alert("Chưa nối actions.checkOut");
                    return;
                  }
                  if (!checkOutCtx.dateOut) {
                    alert("Vui lòng chọn ngày rời đi.");
                    return;
                  }
                  await actions.checkOut({
                    stayId: checkOutCtx.stayId,
                    dateOut: checkOutCtx.dateOut,
                  });
                  setCheckOutCtx((prev) => ({
                    ...prev,
                    open: false,
                    stayId: null,
                  }));
                })
              }
            >
              Xác nhận
            </button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={confirmDel}
        title="Xóa phòng"
        message={`Bạn chắc chắn muốn xóa phòng ${room.code}?`}
        confirmText="Xóa"
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          setConfirmDel(false);
          if (typeof actions?.guardDelete === "function") {
            actions.guardDelete({
              title: "Xóa phòng",
              message: `Xóa phòng ${room.code}? Tất cả lịch sử ở phòng này sẽ bị xóa.`,
              onDelete: async () => {
                if (!actions?.deleteRoom) {
                  alert("Chưa nối actions.deleteRoom");
                  return;
                }
                await actions.deleteRoom({ roomId: room.id });
                onClose?.();
              },
            });
            return;
          }

          // Fallback: require admin then delete
          requireAdmin(async () => {
            if (!actions?.deleteRoom) {
              alert("Chưa nối actions.deleteRoom");
              return;
            }
            await actions.deleteRoom({ roomId: room.id });
            onClose?.();
          });
        }}
      />

      <ElectricityModal
        key={`elec-${room?.id}-${room?.electricity?.id || "new"}-${actions?.billingMonth}-${elecModal}`}
        open={elecModal}
        onClose={() => setElecModal(false)}
        room={room}
        electricity={room.electricity}
        pricePerUnit={actions?.electricityPrice}
        billingMonth={actions?.billingMonth}
        auth={auth}
        requireAdmin={requireAdmin}
        actions={{
          upsertElectricity: actions?.upsertElectricity,
          markElectricityPaid: actions?.markElectricityPaid,
        }}
      />
    </>
  );
}
