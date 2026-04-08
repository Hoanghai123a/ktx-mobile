import React, { useMemo, useState } from "react";
import { message } from "antd";
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
  Mars,
  Venus,
} from "lucide-react";
import ElectricityModal from "./ElectricityModal";
import { roomGenderLabel } from "../../services/roomGender";

export default function RoomModal({
  open,
  onClose,
  // data
  floor,
  room, // { id, code, stays:[{id, workerId, dateIn, dateOut}], electricity? }
  workerById, // Map(workerId -> worker)
  workers = [],
  occupiedWorkerIds,
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
  const [addOpen, setAddOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [genderBusy, setGenderBusy] = useState(false);

  // manual check-in form state
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [hometown, setHometown] = useState("");
  const [phone, setPhone] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [note, setNote] = useState("");
  const [dateIn, setDateIn] = useState(todayISO());

  const [errors, setErrors] = useState({});
  const [checkOutCtx, setCheckOutCtx] = useState({
    open: false,
    stayId: null,
    workerName: "",
    dateOut: todayISO(),
  });

  const resetAddForm = () => {
    setSelectedWorkerId(null);
    setPickerQuery("");
    setEmployeeCode("");
    setFullName("");
    setDob("");
    setHometown("");
    setPhone("");
    setRecruiter("");
    setNote("");
    setDateIn(todayISO());
    setErrors({});
  };

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

  const recentDepartures = useMemo(() => history.slice(0, 5), [history]);

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
                          console.log("Updating room code:", {
                            roomId: room.id,
                            code: next,
                          });
                          const ok = await actions.updateRoom(room.id, {
                            code: next,
                          });
                          console.log("Update room code result:", ok);
                          if (ok) onClose?.();
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
                <button
                  className={clsx(
                    "rounded-2xl px-3 py-1 text-xs font-semibold",
                    auth?.isAdmin
                      ? "bg-white/70 text-slate-700 ring-1 ring-slate-200"
                      : "bg-slate-200 text-slate-500",
                  )}
                  onClick={() => requireAdmin(() => setGenderOpen(true))}
                >
                  <span className="inline-flex items-center gap-2">
                    {room.gender === "male" || room.gender === "Nam" ? (
                      <Mars className="h-4 w-4 text-sky-600" />
                    ) : room.gender === "female" || room.gender === "Nữ" ? (
                      <Venus className="h-4 w-4 text-pink-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-dashed border-slate-300" />
                    )}
                    {roomGenderLabel(room.gender)}
                  </span>
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
                  Checkout từng người hoặc thêm người
                </div>
              </div>

              <button
                className={clsx(
                  "rounded-2xl px-3 py-2 text-xs font-semibold",
                  auth?.isAdmin
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-400",
                )}
                onClick={() =>
                  requireAdmin(() => {
                    resetAddForm();
                    setAddOpen(true);
                  })
                }
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm mới
                </span>
              </button>
            </div>

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
                          {w?.employeeCode
                            ? `${w.employeeCode} - ${w?.fullName || ""}`
                            : w?.fullName || w?.name || s.workerId}
                        </div>
                        <div className="text-xs text-slate-600">
                          Vào: {s.dateIn ? String(s.dateIn).slice(0, 10) : "-"}
                        </div>
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

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-sm font-semibold text-slate-900">
                5 người rời đi gần nhất
              </div>
              <div className="mt-2 space-y-2">
                {recentDepartures.length ? (
                  recentDepartures.map((s) => {
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
                        </div>
                        <div className="shrink-0 text-xs font-semibold text-slate-600">
                          {s.dateOut ? String(s.dateOut).slice(0, 10) : "?"}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-2 text-center text-xs text-slate-400">
                    Chưa có người rời đi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={addOpen}
        title="Thêm người vào phòng"
        onClose={() => {
          setAddOpen(false);
          resetAddForm();
        }}
        zIndex="z-[60]"
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-dashed border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-600">
                Thông tin NLĐ
              </div>
              <button
                className={clsx(
                  "rounded-2xl px-4 py-3 text-sm font-semibold",
                  auth?.isAdmin
                    ? "bg-slate-100 text-slate-700"
                    : "bg-slate-50 text-slate-400",
                )}
                onClick={() => requireAdmin(() => setPickerOpen(true))}
              >
                Người cũ?
              </button>

              {selectedWorkerId ? (
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-100">
                  Đang dùng dữ liệu từ người cũ. Bạn có thể sửa lại trước khi
                  lưu.
                </div>
              ) : null}
            </div>
            <div className="mt-2 space-y-3">
              <TextField
                label="Mã nhân viên"
                value={employeeCode}
                onChange={(v) => setEmployeeCode(String(v || "").toUpperCase())}
                placeholder="VD: NV001"
                error={errors.employeeCode}
                disabled={!auth?.isAdmin}
              />
              <TextField
                label="Họ tên"
                value={fullName}
                onChange={setFullName}
                placeholder="VD: Nguyễn Văn A"
                error={errors.fullName}
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
                placeholder="VD: Vực Lực, Tam Đảo, Phú Thọ"
                disabled={!auth?.isAdmin}
              />
              <TextField
                label="Số điện thoại"
                value={phone}
                onChange={setPhone}
                placeholder="VD: 0987654321"
                disabled={!auth?.isAdmin}
              />
              <TextField
                label="Người tuyển"
                value={recruiter}
                onChange={setRecruiter}
                placeholder="VD: Lan HRP"
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
          </div>

          <TextField
            label="Ngày vào"
            value={dateIn}
            onChange={setDateIn}
            type="date"
            error={errors.dateIn}
            disabled={!auth?.isAdmin}
          />

          <div className="flex gap-2">
            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                auth?.isAdmin
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600",
              )}
              onClick={() =>
                requireAdmin(async () => {
                  const nextErrors = {};
                  const code = String(employeeCode || "")
                    .trim()
                    .toUpperCase();
                  const name = String(fullName || "").trim();
                  // Removed mandatory employeeCode check
                  if (code && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) {
                    nextErrors.employeeCode =
                      "Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự.";
                  }
                  if (!name) nextErrors.fullName = true;
                  if (!dateIn) nextErrors.dateIn = true;

                  setErrors(nextErrors);
                  if (Object.keys(nextErrors).length) return;

                  if (!actions?.addWorker || !actions?.checkIn) {
                    message.error(
                      "Chưa nối actions.addWorker / actions.checkIn",
                    );
                    return;
                  }

                  try {
                    let workerId = selectedWorkerId;

                    if (workerId) {
                      if (occupiedWorkerIds?.has(workerId)) {
                        const ok = confirm(
                          "NLĐ này đang ở phòng khác. Bạn vẫn muốn thêm vào phòng (có thể bị trùng)?",
                        );
                        if (!ok) return;
                      }

                      if (actions?.updateWorker) {
                        const ok = await actions.updateWorker({
                          workerId,
                          patch: {
                            employeeCode: code,
                            fullName: name,
                            dob: dob || null,
                            hometown: hometown || "",
                            recruiter: recruiter || "",
                            phone: phone || "",
                            note: note || "",
                          },
                        });
                        if (ok === false) return;
                      }
                    } else {
                      const w = await actions.addWorker({
                        employeeCode: code,
                        fullName: name,
                        hometown: hometown.trim(),
                        phone: phone.trim(),
                        recruiter: recruiter.trim(),
                        dob,
                        note: note.trim(),
                      });
                      workerId = w?.id;
                    }

                    if (!workerId) {
                      message.error("Không xác định được NLĐ để check-in.");
                      return;
                    }

                    await actions.checkIn({
                      floorId: floor.id,
                      roomId: room.id,
                      workerId,
                      dateIn: dateIn || todayISO(),
                    });

                    setAddOpen(false);
                    resetAddForm();
                    onClose?.();
                  } catch (e) {
                    alert(e?.message || String(e));
                  }
                })
              }
            >
              Thêm vào phòng
            </button>
            <button
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={resetAddForm}
            >
              Làm mới
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={genderOpen}
        title="Giới tính phòng"
        onClose={() => setGenderOpen(false)}
        zIndex="z-[80]"
      >
        <div className="space-y-3">
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="text-sm font-semibold">
              Chọn giới tính cho phòng
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Dùng để phân loại phòng. Có thể đổi bất cứ lúc nào.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              className={clsx(
                "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1",
                room.gender == null
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200",
              )}
              disabled={genderBusy}
              onClick={() =>
                requireAdmin(async () => {
                  if (!actions?.updateRoom) return;
                  setGenderBusy(true);
                  try {
                    console.log(
                      `[RoomModal] Updating gender for room ${room.id} to null`,
                    );
                    const ok = await actions.updateRoom(room.id, {
                      gender: null,
                    });
                    console.log(`[RoomModal] Update gender (null) result:`, ok);
                    if (ok !== false) {
                      setGenderOpen(false);
                      onClose?.();
                    }
                  } finally {
                    setGenderBusy(false);
                  }
                })
              }
            >
              Không chọn
            </button>

            <button
              className={clsx(
                "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1",
                room.gender === "male" || room.gender === "Nam"
                  ? "bg-sky-600 text-white ring-sky-600"
                  : "bg-white text-slate-800 ring-slate-200",
              )}
              disabled={genderBusy}
              onClick={() =>
                requireAdmin(async () => {
                  if (!actions?.updateRoom) return;
                  setGenderBusy(true);
                  try {
                    console.log(
                      `[RoomModal] Updating gender for room ${room.id} to male`,
                    );
                    const ok = await actions.updateRoom(room.id, {
                      gender: "male",
                    });
                    console.log(`[RoomModal] Update gender (male) result:`, ok);
                    if (ok !== false) {
                      setGenderOpen(false);
                      onClose?.();
                    }
                  } finally {
                    setGenderBusy(false);
                  }
                })
              }
            >
              <span className="inline-flex items-center gap-2">
                <Mars className="h-4 w-4" />
                Nam
              </span>
            </button>

            <button
              className={clsx(
                "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1",
                room.gender === "female" || room.gender === "Nữ"
                  ? "bg-pink-600 text-white ring-pink-600"
                  : "bg-white text-slate-800 ring-slate-200",
              )}
              disabled={genderBusy}
              onClick={() =>
                requireAdmin(async () => {
                  if (!actions?.updateRoom) return;
                  setGenderBusy(true);
                  try {
                    console.log(
                      `[RoomModal] Updating gender for room ${room.id} to female`,
                    );
                    const ok = await actions.updateRoom(room.id, {
                      gender: "female",
                    });
                    console.log(
                      `[RoomModal] Update gender (female) result:`,
                      ok,
                    );
                    if (ok !== false) {
                      setGenderOpen(false);
                      onClose?.();
                    }
                  } finally {
                    setGenderBusy(false);
                  }
                })
              }
            >
              <span className="inline-flex items-center gap-2">
                <Venus className="h-4 w-4" />
                Nữ
              </span>
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={pickerOpen}
        title="Người cũ"
        onClose={() => setPickerOpen(false)}
        zIndex="z-[70]"
      >
        <div className="space-y-3">
          <TextField
            label="Tìm kiếm"
            value={pickerQuery}
            onChange={setPickerQuery}
            placeholder="Tên / SĐT / CMND"
          />
          <div className="max-h-[60vh] space-y-2 overflow-auto">
            {(workers || [])
              .filter((w) => {
                const q = (pickerQuery || "").trim().toLowerCase();
                if (!q) return true;
                const cmnd =
                  w.idNumber ||
                  w.cmnd ||
                  w.id_number ||
                  w.identity_number ||
                  "";
                const key = `${w.employeeCode || ""} ${w.fullName || ""} ${
                  w.phone || ""
                } ${cmnd}`.toLowerCase();
                return key.includes(q);
              })
              .slice(0, 100)
              .map((w) => (
                <button
                  key={w.id}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50"
                  onClick={() => {
                    setSelectedWorkerId(w.id);
                    setEmployeeCode(String(w.employeeCode || "").toUpperCase());
                    setFullName(w.fullName || "");
                    setDob(w.dob || "");
                    setHometown(w.hometown || "");
                    setPhone(w.phone || "");
                    setRecruiter(w.recruiter || "");
                    setNote(w.note || "");
                    setErrors({});
                    setPickerOpen(false);
                    setAddOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {w.employeeCode ? `${w.employeeCode} - ` : ""}
                        {w.fullName || "(Chưa có tên)"}
                      </div>
                      <div className="text-xs text-slate-600">
                        {w.phone || "-"}
                      </div>
                    </div>
                    {occupiedWorkerIds?.has(w.id) ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Đang ở
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        Trống
                      </span>
                    )}
                  </div>
                </button>
              ))}
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
