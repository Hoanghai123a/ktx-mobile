import React, { useMemo, useRef, useState } from "react";
import { message } from "antd";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Pill from "../../components/ui/Pill";
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
  Upload,
  Droplets,
  LoaderCircle,
  Zap,
  FileDown,
  Undo2,
} from "lucide-react";
import ElectricityModal from "./ElectricityModal";
import { roomGenderLabel } from "../../services/roomGender";
import { formatDate } from "../../services/dateFormat";
import {
  calculateRoomRentForStay,
  calculateRoomUtility,
  findUtilityRecord,
  getBillingPeriod,
  getUtilityCheckoutBounds,
  readingsToMap,
} from "../../services/utilityBilling";
import {
  decodeQrFromImageFile,
  parseWorkerQr,
  workerGenderLabel,
} from "../../services/qrWorkerParser";

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
  const [utilityModal, setUtilityModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [genderBusy, setGenderBusy] = useState(false);
  const [genderPending, setGenderPending] = useState(null);

  // manual check-in form state
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [workerGender, setWorkerGender] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [dob, setDob] = useState("");
  const [hometown, setHometown] = useState("");
  const [phone, setPhone] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [electricityFee, setElectricityFee] = useState(0);
  const [waterFee, setWaterFee] = useState(0);
  const [freeRoomDays, setFreeRoomDays] = useState(0);
  const [electricityStartReading, setElectricityStartReading] = useState("");
  const [waterStartReading, setWaterStartReading] = useState("");
  const [note, setNote] = useState("");
  const [dateIn, setDateIn] = useState(todayISO());
  const [qrBusy, setQrBusy] = useState(false);
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [checkOutCtx, setCheckOutCtx] = useState({
    open: false,
    stayId: null,
    workerId: null,
    workerName: "",
    dateOut: todayISO(),
    electricityStartReading: "",
    waterStartReading: "",
    electricityEndReading: "",
    waterEndReading: "",
    editingDeparture: false,
  });

  const resetAddForm = () => {
    setSelectedWorkerId(null);
    setPickerQuery("");
    setEmployeeCode("");
    setFullName("");
    setWorkerGender("");
    setIdentityNumber("");
    setDob("");
    setHometown("");
    setPhone("");
    setRecruiter("");
    setElectricityFee(0);
    setWaterFee(0);
    setFreeRoomDays(0);
    setElectricityStartReading("");
    setWaterStartReading("");
    setNote("");
    setDateIn(todayISO());
    setErrors({});
    setAddBusy(false);
  };

  const current = useMemo(() => {
    const stays = room?.stays || [];
    return stays.filter((s) => !s.dateOut);
  }, [room]);

  const [invoiceModal, setInvoiceModal] = useState({ open: false, stayId: null });

  const invoiceData = useMemo(() => {
    if (!invoiceModal.stayId) return null;
    const stay = (room?.stays || []).find((s) => s.id === invoiceModal.stayId);
    if (!stay) return null;
    const worker = workerById?.get(stay.workerId);
    const charge = actions?.utilityChargesByWorkerId?.get?.(stay.workerId) || {};
    const roomAmount = Number(charge.roomAmount || 0);
    const electricityAmount = Number(charge.electricityAmount || 0);
    const waterAmount = Number(charge.waterAmount || 0);
    return {
      stay,
      worker,
      roomAmount,
      electricityAmount,
      waterAmount,
      totalAmount: roomAmount + electricityAmount + waterAmount,
    };
  }, [invoiceModal.stayId, room?.stays, workerById, actions?.utilityChargesByWorkerId]);

  const history = useMemo(() => {
    const stays = room?.stays || [];
    return stays
      .filter((s) => !!s.dateOut)
      .sort((a, b) => {
        const aKey = String(a.dateOut || "") > String(a.dateIn || "") ? a.dateOut : a.dateIn;
        const bKey = String(b.dateOut || "") > String(b.dateIn || "") ? b.dateOut : b.dateIn;
        return String(bKey || "").localeCompare(String(aKey || ""));
      });
  }, [room]);

  const recentDepartures = useMemo(() => history.slice(0, 5), [history]);

  const readingValue = (value) => {
    if (value === "" || value == null) return "";
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : "";
  };

  const normalizePhone10 = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

  const stayEndReading = (stay, type) => {
    if (!stay?.dateOut && !stay?.date_out) return "";
    const prefix = type === "water" ? "water" : "electricity";
    return readingValue(stay?.[`${prefix}EndReading`] ?? stay?.[`${prefix}_end_reading`]);
  };

  const getCheckOutReadings = (stay, dateOutValue = todayISO()) => {
    const billingMonth = actions?.billingMonth || String(dateOutValue || todayISO()).slice(0, 7);
    const electricity = getUtilityCheckoutBounds({
      room,
      stay,
      type: "electricity",
      billingMonth,
      billingCloseDay: actions?.billingCloseDay || 1,
      dateOut: dateOutValue,
    });
    const water = getUtilityCheckoutBounds({
      room,
      stay,
      type: "water",
      billingMonth,
      billingCloseDay: actions?.billingCloseDay || 1,
      dateOut: dateOutValue,
    });
    return {
      electricityStartReading: electricity.startReading,
      waterStartReading: water.startReading,
      electricityEndReading: electricity.endSource === "room" ? electricity.endReading : stayEndReading(stay, "electricity"),
      waterEndReading: water.endSource === "room" ? water.endReading : stayEndReading(stay, "water"),
    };
  };

  const openDepartureEditor = (stay) => {
    if (!stay?.id) return;
    const worker = workerById?.get?.(stay.workerId);
    const dateOutValue = stay.dateOut || stay.date_out || todayISO();
    const readings = getCheckOutReadings(stay, dateOutValue);
    setCheckOutCtx({
      open: true,
      stayId: stay.id,
      workerId: stay.workerId,
      workerName: worker?.fullName || worker?.name || "",
      dateOut: dateOutValue,
      electricityStartReading: readings.electricityStartReading,
      waterStartReading: readings.waterStartReading,
      electricityEndReading: readings.electricityEndReading,
      waterEndReading: readings.waterEndReading,
      editingDeparture: true,
    });
  };

  const checkOutAmount = useMemo(() => {
    const stay = (room?.stays || []).find((s) => s.id === checkOutCtx.stayId);
    const workerId = checkOutCtx.workerId || stay?.workerId;
    const hasBase = stay && workerId && checkOutCtx.dateOut;
    if (!hasBase) return { electricityAmount: 0, waterAmount: 0, roomAmount: 0, totalAmount: 0 };

    const billingMonth = actions?.billingMonth || String(checkOutCtx.dateOut).slice(0, 7);
    const canCalcElectricity = checkOutCtx.electricityStartReading !== "" && checkOutCtx.electricityEndReading !== "";
    const canCalcWater = checkOutCtx.waterStartReading !== "" && checkOutCtx.waterEndReading !== "";
    const electricityBounds = getUtilityCheckoutBounds({
      room,
      stay: {
        ...stay,
        dateOut: checkOutCtx.dateOut,
        electricityStartReading: Number(checkOutCtx.electricityStartReading || 0),
        electricityEndReading: Number(checkOutCtx.electricityEndReading || 0),
      },
      type: "electricity",
      billingMonth,
      billingCloseDay: actions?.billingCloseDay || 1,
      dateOut: checkOutCtx.dateOut,
    });
    const waterBounds = getUtilityCheckoutBounds({
      room,
      stay: {
        ...stay,
        dateOut: checkOutCtx.dateOut,
        waterStartReading: Number(checkOutCtx.waterStartReading || 0),
        waterEndReading: Number(checkOutCtx.waterEndReading || 0),
      },
      type: "water",
      billingMonth,
      billingCloseDay: actions?.billingCloseDay || 1,
      dateOut: checkOutCtx.dateOut,
    });
    const patchedStay = {
      ...stay,
      dateIn: canCalcElectricity ? electricityBounds.effectiveStartDate : waterBounds.effectiveStartDate,
      dateOut: canCalcElectricity ? electricityBounds.effectiveEndDate : waterBounds.effectiveEndDate,
      electricityStartReading: canCalcElectricity ? Number(electricityBounds.startReading || 0) : "",
      electricityEndReading: canCalcElectricity ? Number(electricityBounds.endReading || 0) : "",
      waterStartReading: canCalcWater ? Number(waterBounds.startReading || 0) : "",
      waterEndReading: canCalcWater ? Number(waterBounds.endReading || 0) : "",
    };
    const patchedRoom = {
      ...room,
      stays: (room?.stays || []).map((s) => (s.id === stay.id ? patchedStay : s)),
    };
    const settings = {
      billingMonth,
      billingCloseDay: actions?.billingCloseDay,
      electricityPrice: actions?.electricityPrice,
      waterPrice: actions?.waterPrice,
      waterBillingMode: actions?.waterBillingMode,
      periodStart: electricityBounds.effectiveStartDate,
      periodEnd: electricityBounds.effectiveEndDate,
    };
    const electricity = canCalcElectricity
      ? calculateRoomUtility({ room: patchedRoom, type: "electricity", settings })
      : null;
    const water = canCalcWater
      ? calculateRoomUtility({
          room: patchedRoom,
          type: "water",
          settings: { ...settings, periodStart: waterBounds.effectiveStartDate, periodEnd: waterBounds.effectiveEndDate },
        })
      : null;
    const electricityAmount = electricity?.amountByWorkerId.get(workerId) || 0;
    const waterAmount = water?.amountByWorkerId.get(workerId) || 0;
    const roomAmount = calculateRoomRentForStay({
      stay: { ...stay, dateOut: checkOutCtx.dateOut },
      worker: workerById?.get?.(workerId),
      settings: {
        billingMonth,
        billingCloseDay: actions?.billingCloseDay,
        roomMonthlyPrice: actions?.roomMonthlyPrice,
        roomBillingMode: actions?.roomBillingMode,
      },
    }).amount;
    return {
      electricityAmount,
      waterAmount,
      roomAmount,
      totalAmount: electricityAmount + waterAmount + roomAmount,
    };
  }, [actions, checkOutCtx, room, workerById]);

  const checkOutErrors = useMemo(() => {
    const errors = {};
    if (!checkOutCtx.dateOut || !room) return errors;

    const billingMonth = actions?.billingMonth || String(checkOutCtx.dateOut).slice(0, 7);
    const closeDay = actions?.billingCloseDay || 1;
    const period = getBillingPeriod(billingMonth, closeDay);

    const segmentStartAt = (type) => {
      const record = findUtilityRecord(room, type, period.month);
      const map = readingsToMap(record, period, room, type);
      const dates = [...map.keys()].filter((d) => d < checkOutCtx.dateOut).sort();
      const nearest = dates[dates.length - 1];
      return nearest != null ? Number(map.get(nearest)) : null;
    };

    const elecSegStart = segmentStartAt("electricity");
    const waterSegStart = segmentStartAt("water");
    const elecEnd = Number(checkOutCtx.electricityEndReading || 0);
    const waterEnd = Number(checkOutCtx.waterEndReading || 0);

    if (
      checkOutCtx.electricityEndReading !== "" &&
      elecSegStart != null &&
      elecEnd < elecSegStart
    ) {
      errors.electricity = `Số điện khi rời (${elecEnd}) không được nhỏ hơn số điện đầu giai đoạn (${elecSegStart}).`;
    }
    if (
      checkOutCtx.waterEndReading !== "" &&
      waterSegStart != null &&
      waterEnd < waterSegStart
    ) {
      errors.water = `Số nước khi rời (${waterEnd}) không được nhỏ hơn số nước đầu giai đoạn (${waterSegStart}).`;
    }
    return errors;
  }, [checkOutCtx.dateOut, checkOutCtx.electricityEndReading, checkOutCtx.waterEndReading, room, actions?.billingMonth, actions?.billingCloseDay]);

  const applyQrPayload = (payload) => {
    if (!payload) return false;
    if (payload.fullName) setFullName(payload.fullName);
    if (payload.gender) setWorkerGender(payload.gender);
    if (payload.dob) setDob(payload.dob);
    if (payload.identityNumber) setIdentityNumber(payload.identityNumber);
    if (payload.hometown) setHometown(payload.hometown);
    setErrors({});
    return !!(
      payload.fullName ||
      payload.gender ||
      payload.dob ||
      payload.identityNumber ||
      payload.hometown
    );
  };

  const applyQrText = (text) => {
    const payload = parseWorkerQr(text);
    if (!applyQrPayload(payload)) {
      message.warning("Không đọc được thông tin NLĐ từ mã QR.");
      return false;
    }
    message.success("Đã điền thông tin từ mã QR.");
    return true;
  };

  // title shown in modal header; include both label and code for clarity
  const title = room ? `Chi tiết phòng ${room.code}` : "Chi tiết phòng";

  async function updateRoomGender(nextGender) {
    if (!actions?.updateRoom) return;
    setGenderPending(nextGender || "none");
    setGenderBusy(true);
    try {
      const ok = await actions.updateRoom(room.id, { gender: nextGender });
      if (ok !== false) {
        setGenderOpen(false);
        onClose?.();
      }
    } finally {
      setGenderBusy(false);
      setGenderPending(null);
    }
  }

  const requestDeleteRoom = () => {
    requireAdmin(() => {
      const runDelete = async () => {
        if (!actions?.deleteRoom) {
          alert("Chưa nối actions.deleteRoom");
          return;
        }
        await actions.deleteRoom({ roomId: room.id });
        onClose?.();
      };

      if (typeof actions?.guardDelete === "function") {
        actions.guardDelete({
          title: "Xóa phòng",
          message: `Xóa phòng ${room.code}? Tất cả lịch sử ở phòng này sẽ bị xóa.`,
          onDelete: runDelete,
        });
        return;
      }

      runDelete();
    });
  };

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
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-2">
                  <div className="shrink-0 text-xs font-semibold text-slate-900">
                    {floor?.name || "Tầng"}
                  </div>
                  <div className="truncate text-base font-semibold text-slate-900">
                    Phòng {room.code}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {actions?.onViewWorker ? "Click NLĐ để xem" : ""}
                </div>
              </div>
              {auth?.isAdmin ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="grid h-8 w-8 place-items-center rounded-2xl bg-white/80 ring-1 ring-slate-200 hover:bg-white"
                    onClick={() => {
                      const next = prompt("Mã phòng", room.code) || room.code;
                      if (next !== room.code && next.trim()) {
                        requireAdmin(async () => {
                          const ok = await actions.updateRoom(room.id, {
                            code: next,
                          });
                          if (ok) onClose?.();
                        });
                      }
                    }}
                    title="Sửa mã phòng"
                  >
                    <Edit className="h-4 w-4 text-slate-600" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-2xl bg-white/80 ring-1 ring-rose-100 hover:bg-rose-50"
                    onClick={requestDeleteRoom}
                    title="Xóa phòng"
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5">
              <button
                className="shrink-0 rounded-2xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
                onClick={() => setUtilityModal("electricity")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Điện
                </span>
              </button>
              <button
                className="shrink-0 rounded-2xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-100"
                onClick={() => setUtilityModal("water")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5" />
                  Nước
                </span>
              </button>
              <button
                className={clsx(
                  "shrink-0 rounded-2xl px-3 py-1.5 text-xs font-semibold",
                  auth?.isAdmin
                    ? "bg-white/70 text-slate-700 ring-1 ring-slate-200"
                    : "bg-slate-200 text-slate-500",
                )}
                onClick={() => requireAdmin(() => setGenderOpen(true))}
                disabled={genderBusy}
              >
                <span className="inline-flex items-center gap-2">
                  {genderBusy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
                  ) : room.gender === "male" || room.gender === "Nam" ? (
                    <Mars className="h-4 w-4 text-sky-600" />
                  ) : room.gender === "female" || room.gender === "Nữ" ? (
                    <Venus className="h-4 w-4 text-pink-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-dashed border-slate-300" />
                  )}
                  {roomGenderLabel(room.gender)}
                </span>
              </button>
              <span className="shrink-0">
                <Pill
                  icon={Users}
                  text={`${current.length}`}
                  tone={current.length ? "green" : "slate"}
                />
              </span>
            </div>
          </div>

          {/* Current stays */}
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Người đang ở</div>
                <div className="text-xs text-slate-600">
                  Checkout từng người hoặc thêm người
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {actions?.exportRoomInvoice && current.length ? (
                  <button
                    className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    onClick={() => actions.exportRoomInvoice()}
                    title="Xuất phiếu thu cả phòng"
                    aria-label="Xuất phiếu thu cả phòng"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  className={clsx(
                    "rounded-2xl px-3 py-2 text-xs font-semibold",
                    auth?.isAdmin
                      ? "bg-[rgb(44_120_159)] text-white"
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
            </div>

            <div className="mt-3 space-y-2">
              {current.length ? (
                current.map((s) => {
                  const w = workerById?.get(s.workerId);
                  return (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          className="min-w-0 text-left"
                          onClick={() => actions?.onViewWorker?.(w?.id)}
                        >
                          <div className="text-sm font-semibold leading-5 text-slate-900">
                            {w?.employeeCode ? (
                              <span className="mr-1 font-bold">{w.employeeCode}</span>
                            ) : null}
                            <span>{w?.fullName || w?.name || s.workerId}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Vào: {formatDate(s.dateIn)}
                          </div>
                        </button>
                        <button
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500"
                          onClick={() => setInvoiceModal({ open: true, stayId: s.id })}
                          title="Xem phiếu thanh toán"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Phiếu
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
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
                              const readings = getCheckOutReadings(s, todayISO());
                              setCheckOutCtx({
                                open: true,
                                stayId: s.id,
                                workerId: s.workerId,
                                workerName: w?.fullName || "",
                                dateOut: todayISO(),
                                electricityStartReading: readings.electricityStartReading,
                                waterStartReading: readings.waterStartReading,
                                electricityEndReading: readings.electricityEndReading,
                                waterEndReading: readings.waterEndReading,
                                editingDeparture: false,
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
                  recentDepartures.map((s, idx) => {
                    const w = workerById?.get(s.workerId);
                    const name = w?.fullName || w?.name || s.workerId;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-700">
                            {name}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs font-semibold text-slate-600">
                          {formatDate(s.dateOut, "?")}
                        </div>
                        {auth?.isAdmin && idx === 0 ? (
                          <button
                            className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
                            onClick={() =>
                              requireAdmin(() => {
                                if (
                                  !window.confirm(
                                    `Hoàn tác ${name} rời phòng? Ngày rời và số điện/nước cuối sẽ bị xoá, tiền điện/nước cùng kỳ sẽ được tính lại.`,
                                  )
                                ) return;
                                actions.undoDeparture({ stayId: s.id });
                              })
                            }
                            title="Hoàn tác rời phòng"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Hoàn tác
                          </button>
                        ) : null}
                        {auth?.isAdmin ? (
                          <button
                            className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                            onClick={() => requireAdmin(() => openDepartureEditor(s))}
                            title="Sửa thông tin rời phòng"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                        ) : null}
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setQrBusy(true);
                  try {
                    const text = await decodeQrFromImageFile(file);
                    if (!text) {
                      message.warning("Không tìm thấy mã QR trong ảnh.");
                      return;
                    }
                    applyQrText(text);
                  } catch {
                    message.error("Không đọc được ảnh QR.");
                  } finally {
                    setQrBusy(false);
                  }
                }}
              />
              <div className="grid grid-cols-1 gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:opacity-60"
                  disabled={!auth?.isAdmin || qrBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4" />
                    Tải ảnh QR
                  </span>
                </button>
              </div>
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
                label="Số ngày ở Free"
                value={freeRoomDays}
                onChange={(v) => setFreeRoomDays(Math.max(0, Math.floor(Number(v || 0))))}
                type="number"
                placeholder="0"
                disabled={!auth?.isAdmin}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <div className="text-xs font-medium text-slate-600">
                    Giới tính
                  </div>
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
                  onChange={(v) =>
                    setIdentityNumber(String(v || "").replace(/\D/g, ""))
                  }
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
                placeholder="VD: Vực Lực, Tam Đảo, Phú Thọ"
                disabled={!auth?.isAdmin}
              />
              <TextField
                label="Số điện thoại"
                value={phone}
                onChange={(v) => setPhone(normalizePhone10(v))}
                type="tel"
                inputMode="numeric"
                maxLength={10}
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
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="Số điện ngày vào"
                  value={electricityStartReading}
                  onChange={setElectricityStartReading}
                  type="number"
                  placeholder="0"
                  error={errors.electricityStartReading}
                  disabled={!auth?.isAdmin}
                />
                <TextField
                  label="Số nước ngày vào"
                  value={waterStartReading}
                  onChange={setWaterStartReading}
                  type="number"
                  placeholder="0"
                  error={errors.waterStartReading}
                  disabled={!auth?.isAdmin}
                />
              </div>
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
                  ? "bg-[rgb(44_120_159)] text-white"
                  : "bg-slate-100 text-slate-600",
                addBusy ? "opacity-70" : "",
              )}
              disabled={addBusy || !auth?.isAdmin}
              onClick={() =>
                requireAdmin(async () => {
                  if (addBusy) return;
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
                  if (electricityStartReading === "")
                    nextErrors.electricityStartReading = true;
                  if (waterStartReading === "")
                    nextErrors.waterStartReading = true;

                  setErrors(nextErrors);
                  if (Object.keys(nextErrors).length) return;

                  if (!actions?.addWorker || !actions?.checkIn) {
                    message.error(
                      "Chưa nối actions.addWorker / actions.checkIn",
                    );
                    return;
                  }

                  setAddBusy(true);

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
                            gender: workerGender || "",
                            identityNumber: identityNumber || "",
                            dob: dob || null,
                            hometown: hometown || "",
                            recruiter: recruiter || "",
                            electricityFee: Number(electricityFee || 0),
                            waterFee: Number(waterFee || 0),
                            freeRoomDays: Math.max(0, Math.floor(Number(freeRoomDays || 0))),
                      phone: normalizePhone10(phone),
                            note: note || "",
                          },
                        });
                        if (ok === false) return;
                      }
                    } else {
                      const w = await actions.addWorker({
                        employeeCode: code,
                        fullName: name,
                        gender: workerGender || "",
                        identityNumber: identityNumber.trim(),
                        hometown: hometown.trim(),
                      phone: normalizePhone10(phone),
                        recruiter: recruiter.trim(),
                        electricityFee: Number(electricityFee || 0),
                        waterFee: Number(waterFee || 0),
                        freeRoomDays: Math.max(0, Math.floor(Number(freeRoomDays || 0))),
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
                      electricityStartReading: Number(
                        electricityStartReading || 0,
                      ),
                      waterStartReading: Number(waterStartReading || 0),
                    });

                    setAddOpen(false);
                    resetAddForm();
                    onClose?.();
                  } catch (e) {
                    alert(e?.message || String(e));
                  } finally {
                    setAddBusy(false);
                  }
                })
              }
            >
              <span className="inline-flex items-center justify-center gap-2">
                {addBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {addBusy ? "Đang thêm..." : "Thêm vào phòng"}
              </span>
            </button>
            <button
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
              disabled={addBusy}
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
                  ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                  : "bg-white text-slate-800 ring-slate-200",
              )}
              disabled={genderBusy}
              onClick={() =>
                requireAdmin(() => updateRoomGender(null))
              }
            >
              <span className="inline-flex items-center gap-2">
                {genderPending === "none" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Không chọn
              </span>
            </button>

            <button
              className={clsx(
                "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1",
                room.gender === "male" || room.gender === "Nam"
                  ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                  : "bg-white text-slate-800 ring-slate-200",
              )}
              disabled={genderBusy}
              onClick={() =>
                requireAdmin(() => updateRoomGender("male"))
              }
            >
              <span className="inline-flex items-center gap-2">
                {genderPending === "male" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mars className="h-4 w-4" />}
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
                requireAdmin(() => updateRoomGender("female"))
              }
            >
              <span className="inline-flex items-center gap-2">
                {genderPending === "female" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Venus className="h-4 w-4" />}
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
                    setWorkerGender(w.gender || "");
                    setIdentityNumber(
                      w.identityNumber || w.identity_number || "",
                    );
                    setDob(w.dob || "");
                    setHometown(w.hometown || "");
                    setPhone(normalizePhone10(w.phone));
                    setRecruiter(w.recruiter || "");
                    setElectricityFee(
                      Number(w.electricityFee || w.electricity_fee || 0),
                    );
                    setWaterFee(Number(w.waterFee || w.water_fee || 0));
                    setFreeRoomDays(Math.max(0, Math.floor(Number(w.freeRoomDays || w.free_room_days || 0))));
                    setElectricityStartReading("");
                    setWaterStartReading("");
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
                      <div className="text-xs text-slate-500">
                        {workerGenderLabel(w.gender) || "Chưa có giới tính"}
                        {w.identityNumber || w.identity_number
                          ? ` · CCCD ${w.identityNumber || w.identity_number}`
                          : ""}
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
        title={checkOutCtx.editingDeparture ? "Sửa thông tin rời phòng" : "Chọn ngày rời đi"}
        onClose={() =>
          setCheckOutCtx((prev) => ({
            ...prev,
            open: false,
            stayId: null,
            workerId: null,
            editingDeparture: false,
          }))
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
            onChange={(v) => {
              const stay = (room?.stays || []).find((s) => s.id === checkOutCtx.stayId);
              const readings = getCheckOutReadings(stay, v);
              setCheckOutCtx((prev) => ({
                ...prev,
                dateOut: v,
                electricityStartReading: readings.electricityStartReading,
                waterStartReading: readings.waterStartReading,
                electricityEndReading: readings.electricityEndReading,
                waterEndReading: readings.waterEndReading,
              }));
            }}
            type="date"
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Số điện đầu"
              value={checkOutCtx.electricityStartReading}
              onChange={() => {}}
              type="number"
              disabled
              title="Chỉ số đầu được lấy từ lúc vào phòng, không thể sửa tại bước rời đi."
            />
            <TextField
              label="Số điện khi rời"
              value={checkOutCtx.electricityEndReading}
              onChange={(v) =>
                setCheckOutCtx((prev) => ({
                  ...prev,
                  electricityEndReading: v,
                }))
              }
              type="number"
            />
            <TextField
              label="Số nước đầu"
              value={checkOutCtx.waterStartReading}
              onChange={() => {}}
              type="number"
              disabled
              title="Chỉ số đầu được lấy từ lúc vào phòng, không thể sửa tại bước rời đi."
            />
            <TextField
              label="Số nước khi rời"
              value={checkOutCtx.waterEndReading}
              onChange={(v) =>
                setCheckOutCtx((prev) => ({ ...prev, waterEndReading: v }))
              }
              type="number"
            />
          </div>
          {checkOutErrors.electricity ? (
            <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {checkOutErrors.electricity}
            </div>
          ) : null}
          {checkOutErrors.water ? (
            <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {checkOutErrors.water}
            </div>
          ) : null}
          <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
            <div className="text-xs font-medium text-sky-700">Thành tiền</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {Number(checkOutAmount.totalAmount || 0).toLocaleString("vi-VN")}đ
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Phòng: {Number(checkOutAmount.roomAmount || 0).toLocaleString("vi-VN")}đ · Điện: {Number(checkOutAmount.electricityAmount || 0).toLocaleString("vi-VN")}đ · Nước: {Number(checkOutAmount.waterAmount || 0).toLocaleString("vi-VN")}đ
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={() =>
                setCheckOutCtx((prev) => ({
                  ...prev,
                  open: false,
                  stayId: null,
                  workerId: null,
                  editingDeparture: false,
                }))
              }
            >
              Hủy
            </button>
            <button
              disabled={Object.keys(checkOutErrors).length > 0}
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                Object.keys(checkOutErrors).length > 0
                  ? "bg-slate-100 text-slate-400"
                  : "bg-[rgb(44_120_159)] text-white",
              )}
              onClick={() =>
                requireAdmin(async () => {
                  if (checkOutCtx.editingDeparture ? !actions?.updateDeparture : !actions?.checkOut) {
                    alert(checkOutCtx.editingDeparture ? "Chưa nối actions.updateDeparture" : "Chưa nối actions.checkOut");
                    return;
                  }
                  if (!checkOutCtx.dateOut) {
                    alert("Vui lòng chọn ngày rời đi.");
                    return;
                  }
                  if (
                    checkOutCtx.electricityStartReading === "" ||
                    checkOutCtx.electricityEndReading === "" ||
                    checkOutCtx.waterStartReading === "" ||
                    checkOutCtx.waterEndReading === ""
                  ) {
                    alert(
                      "Vui lòng nhập đủ chỉ số điện/nước khi rời.",
                    );
                    return;
                  }
                  const payload = {
                    stayId: checkOutCtx.stayId,
                    dateOut: checkOutCtx.dateOut,
                    electricityStartReading: Number(
                      checkOutCtx.electricityStartReading || 0,
                    ),
                    electricityEndReading: Number(
                      checkOutCtx.electricityEndReading || 0,
                    ),
                    waterStartReading: Number(
                      checkOutCtx.waterStartReading || 0,
                    ),
                    waterEndReading: Number(checkOutCtx.waterEndReading || 0),
                    electricityAmount: checkOutAmount.electricityAmount,
                    waterAmount: checkOutAmount.waterAmount,
                    roomAmount: checkOutAmount.roomAmount,
                    totalAmount: checkOutAmount.totalAmount,
                  };
                  if (checkOutCtx.editingDeparture) {
                    await actions.updateDeparture(payload);
                  } else {
                    await actions.checkOut(payload);
                  }
                  setCheckOutCtx((prev) => ({
                    ...prev,
                    open: false,
                    stayId: null,
                    workerId: null,
                    editingDeparture: false,
                  }));
                })
              }
            >
              {checkOutCtx.editingDeparture ? "Lưu chỉnh sửa" : "Xác nhận"}
            </button>
          </div>
        </div>
      </Modal>

      <ElectricityModal
        key={`utility-${utilityModal || "none"}-${room?.id}-${actions?.billingMonth}-${actions?.billingCloseDay}`}
        open={!!utilityModal}
        onClose={() => setUtilityModal(null)}
        room={room}
        workerById={workerById}
        utilityType={utilityModal || "electricity"}
        records={utilityModal === "water" ? room.water : room.electricity}
        pricePerUnit={
          utilityModal === "water"
            ? actions?.waterPrice
            : actions?.electricityPrice
        }
        waterBillingMode={actions?.waterBillingMode}
        billingMonth={actions?.billingMonth}
        billingCloseDay={actions?.billingCloseDay}
        auth={auth}
        requireAdmin={requireAdmin}
        actions={{
          upsertUtility: actions?.upsertUtility,
          editDeparture: openDepartureEditor,
        }}
      />

      <Modal
        open={invoiceModal.open}
        title="Phiếu thanh toán"
        onClose={() => setInvoiceModal({ open: false, stayId: null })}
        zIndex="z-[80]"
      >
        {invoiceData ? (
          <div className="space-y-3">
            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="text-xs font-medium text-slate-500">
                {actions?.billingMonth ? `Kỳ thu: ${actions.billingMonth}` : "Phiếu thanh toán"}
              </div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {invoiceData.worker?.employeeCode ? `${invoiceData.worker.employeeCode} - ` : ""}
                {invoiceData.worker?.fullName || invoiceData.stay.workerId}
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                {floor?.name ? `${floor.name} · ` : ""}Phòng {room?.code || "—"}
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Vào: {formatDate(invoiceData.stay.dateIn)}
                {invoiceData.stay.dateOut ? ` · Rời: ${formatDate(invoiceData.stay.dateOut)}` : ""}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-700">Tiền phòng</span>
                <span className="text-sm font-semibold text-slate-900">
                  {invoiceData.roomAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 py-1.5">
                <span className="text-sm text-slate-700">Tiền điện</span>
                <span className="text-sm font-semibold text-slate-900">
                  {invoiceData.electricityAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 py-1.5">
                <span className="text-sm text-slate-700">Tiền nước</span>
                <span className="text-sm font-semibold text-slate-900">
                  {invoiceData.waterAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-white">
              <span className="text-sm font-semibold">Tổng cần thu</span>
              <span className="text-lg font-bold">
                {invoiceData.totalAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>

            {actions?.exportWorkerInvoice ? (
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                onClick={() => {
                  actions.exportWorkerInvoice(invoiceData.stay.workerId);
                }}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Tải Excel
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-slate-600">Không tìm thấy thông tin thanh toán.</div>
        )}
      </Modal>
    </>
  );
}
