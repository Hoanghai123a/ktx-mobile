import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Confirm from "../../components/ui/Confirm";
import clsx from "../../components/ui/clsx";
import { PhoneCall, Save, Trash2, StickyNote } from "lucide-react";
import NoteList from "../../components/ui/NoteList";
import { formatDate } from "../../services/dateFormat";
import { getBillingPeriod, normalizeBillingMonth } from "../../services/utilityBilling";

function numberOrBlank(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function startReadingForWorker({ type, stay, room, billingMonth, billingCloseDay }) {
  if (!stay) return "";
  const prefix = type === "water" ? "water" : "electricity";
  const stayStart = numberOrBlank(stay?.[`${prefix}StartReading`] ?? stay?.[`${prefix}_start_reading`]);
  const month = normalizeBillingMonth(billingMonth);
  const period = getBillingPeriod(month, billingCloseDay || 1);
  const list = Array.isArray(room?.[type === "water" ? "water" : "electricity"])
    ? room[type === "water" ? "water" : "electricity"]
    : [];
  const record = list.find((row) => String(row?.month || "").slice(0, 7) === month) || null;
  const roomStart = numberOrBlank(record?.start_reading ?? record?.startReading);
  const dateIn = String(stay?.dateIn || stay?.date_in || "").slice(0, 10);
  if (dateIn && dateIn > period.start) return stayStart;
  return roomStart !== "" ? roomStart : stayStart;
}

export default function WorkerModal({
  open,
  onClose,
  worker,
  stays,
  roomById,
  auth,
  requireAdmin,
  actions,
}) {
  const [employeeCode, setEmployeeCode] = useState(worker?.employeeCode || "");
  const [fullName, setFullName] = useState(worker?.fullName || "");
  const [workerGender, setWorkerGender] = useState(worker?.gender || "");
  const [identityNumber, setIdentityNumber] = useState(worker?.identityNumber || "");
  const [dob, setDob] = useState(worker?.dob || "");
  const [hometown, setHometown] = useState(worker?.hometown || "");
  const [recruiter, setRecruiter] = useState(worker?.recruiter || "");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [electricityFee, setElectricityFee] = useState(worker?.electricityFee || 0);
  const [waterFee, setWaterFee] = useState(worker?.waterFee || 0);
  const [freeRoomDays, setFreeRoomDays] = useState(worker?.freeRoomDays || 0);
  const [electricityStartReading, setElectricityStartReading] = useState("");
  const [waterStartReading, setWaterStartReading] = useState("");
  const [note, setNote] = useState(worker?.note || "");
  const [confirmDel, setConfirmDel] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setEmployeeCode(worker?.employeeCode || "");
    setFullName(worker?.fullName || "");
    setWorkerGender(worker?.gender || "");
    setIdentityNumber(worker?.identityNumber || "");
    setDob(worker?.dob || "");
    setHometown(worker?.hometown || "");
    setRecruiter(worker?.recruiter || "");
    setPhone(worker?.phone || "");
    setElectricityFee(Number(worker?.electricityFee || 0));
    setWaterFee(Number(worker?.waterFee || 0));
    setFreeRoomDays(Math.max(0, Math.floor(Number(worker?.freeRoomDays || 0))));
    setNote(worker?.note || "");
  }, [
    worker?.id,
    worker?.employeeCode,
    worker?.fullName,
    worker?.gender,
    worker?.identityNumber,
    worker?.dob,
    worker?.hometown,
    worker?.recruiter,
    worker?.phone,
    worker?.electricityFee,
    worker?.waterFee,
    worker?.freeRoomDays,
    worker?.note,
  ]);

  const title = worker
    ? `${worker.employeeCode ? `${worker.employeeCode} - ` : ""}${worker.fullName || "NLĐ"}`
    : "NLĐ";

  const currentStay = useMemo(() => {
    const list = stays || [];
    return list.find((s) => !s.dateOut) || null;
  }, [stays]);

  useEffect(() => {
    setElectricityStartReading(numberOrBlank(currentStay?.electricityStartReading ?? currentStay?.electricity_start_reading));
    setWaterStartReading(numberOrBlank(currentStay?.waterStartReading ?? currentStay?.water_start_reading));
  }, [currentStay?.id, currentStay?.electricityStartReading, currentStay?.electricity_start_reading, currentStay?.waterStartReading, currentStay?.water_start_reading]);

  const startReadings = useMemo(() => {
    const room = currentStay?.roomId ? roomById?.get?.(currentStay.roomId) : null;
    return {
      electricity: startReadingForWorker({
        type: "electricity",
        stay: currentStay,
        room,
        billingMonth: actions?.billingMonth,
        billingCloseDay: actions?.billingCloseDay,
      }),
      water: startReadingForWorker({
        type: "water",
        stay: currentStay,
        room,
        billingMonth: actions?.billingMonth,
        billingCloseDay: actions?.billingCloseDay,
      }),
    };
  }, [actions?.billingCloseDay, actions?.billingMonth, currentStay, roomById]);

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
              {showNotes ? <NoteList targetId={worker.id} targetType="worker" /> : null}
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-semibold">Thông tin NLĐ</div>

              <div className="mt-3 space-y-2">
                <TextField
                  label="Mã nhân viên"
                  value={employeeCode}
                  onChange={(v) => setEmployeeCode(String(v || "").toUpperCase())}
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
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-slate-600">Giới tính</div>
                    <select
                      value={workerGender}
                      onChange={(e) => setWorkerGender(e.target.value)}
                      disabled={!auth?.isAdmin}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
                    >
                      <option value="">Chưa chọn</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </label>
                  <TextField
                    label="Số CCCD"
                    value={identityNumber}
                    onChange={(v) => setIdentityNumber(String(v || "").replace(/\D/g, ""))}
                    placeholder="12 số"
                    disabled={!auth?.isAdmin}
                  />
                </div>
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
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-slate-600">SĐT</div>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xxxxxxx"
                      disabled={!auth?.isAdmin}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
                    />
                    <a
                      href={phone ? `tel:${String(phone).replace(/[^0-9+]/g, "")}` : undefined}
                      onClick={(e) => {
                        if (!phone) e.preventDefault();
                      }}
                      className={clsx(
                        "absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl transition",
                        phone
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-300 pointer-events-none",
                      )}
                      title="Gọi điện"
                      aria-label="Gọi điện"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </a>
                  </div>
                </label>
                <TextField
                  label="Số ngày ở Free"
                  value={freeRoomDays}
                  onChange={(v) => setFreeRoomDays(Math.max(0, Math.floor(Number(v || 0))))}
                  type="number"
                  placeholder="0"
                  disabled={!auth?.isAdmin}
                />
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label="Số điện đầu vào"
                    value={electricityStartReading}
                    onChange={setElectricityStartReading}
                    type="number"
                    placeholder={startReadings.electricity === "" ? "0" : String(startReadings.electricity)}
                    disabled={!auth?.isAdmin || !currentStay}
                  />
                  <TextField
                    label="Số nước đầu vào"
                    value={waterStartReading}
                    onChange={setWaterStartReading}
                    type="number"
                    placeholder={startReadings.water === "" ? "0" : String(startReadings.water)}
                    disabled={!auth?.isAdmin || !currentStay}
                  />
                </div>
                <TextField
                  label="Ghi chú"
                  value={note}
                  onChange={setNote}
                  placeholder="Ghi chú thêm về NLĐ"
                  disabled={!auth?.isAdmin}
                />              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className={clsx(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                    auth?.isAdmin ? "bg-[rgb(44_120_159)] text-white" : "bg-slate-100 text-slate-600",
                  )}
                  onClick={() =>
                    requireAdmin(async () => {
                      if (!actions?.updateWorker) {
                        alert("Chưa nối actions.updateWorker");
                        return;
                      }
                      const code = (employeeCode || "").trim().toUpperCase();
                      if (code && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) {
                        message.warning("Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự.");
                        return;
                      }
                      const nextName = (fullName || "").trim();
                      if (!nextName) {
                        message.warning("Tên không được rỗng.");
                        return;
                      }

                      const result = await actions.updateWorker({
                        workerId: worker.id,
                        patch: {
                          employeeCode: code,
                          fullName: nextName,
                          gender: workerGender || "",
                          identityNumber: identityNumber || "",
                          electricityFee: Number(electricityFee || 0),
                          waterFee: Number(waterFee || 0),
                          freeRoomDays: Math.max(0, Math.floor(Number(freeRoomDays || 0))),
                          dob: dob || null,
                          hometown: hometown || "",
                          recruiter: recruiter || "",
                          phone: phone || "",
                          note: note || "",
                        },
                      });

                      if (result && currentStay?.id && actions?.updateStayReadings) {
                        const stayResult = await actions.updateStayReadings({
                          stayId: currentStay.id,
                          electricityStartReading: Number(electricityStartReading || 0),
                          waterStartReading: Number(waterStartReading || 0),
                        });
                        if (stayResult === false) {
                          message.error("Lưu chỉ số điện/nước thất bại.");
                          return;
                        }
                      }

                      if (result) {
                        message.success("Cập nhật thông tin thành công!");
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
                    auth?.isAdmin ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600",
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
                      let roomCode = "-";
                      if (currentStay.roomId) {
                        const room = roomById?.get(currentStay.roomId);
                        roomCode = room?.code || currentStay.roomId;
                      }
                      const dateStr = formatDate(currentStay.dateIn);
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
                          {formatDate(s.dateIn, "?")} - {formatDate(s.dateOut, "?")}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-1 text-center text-xs text-slate-400">Chưa có lịch sử.</div>
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


