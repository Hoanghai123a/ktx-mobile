import React, { useEffect, useState } from "react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import clsx from "../../components/ui/clsx";

export default function ElectricityModal({
  open,
  onClose,
  room,
  electricity,
  pricePerUnit,
  billingMonth,
  auth,
  requireAdmin,
  actions,
}) {
  const thisElectricity =
    electricity?.find((e) => e?.month === billingMonth) ||
    electricity?.[0] ||
    {};
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  function handleClose() {
    onClose();
  }
  const used = Number(end || 0) - Number(start || 0);
  const cost = used > 0 ? used * (pricePerUnit || 0) : 0;
  const canPay =
    start !== "" &&
    end !== "" &&
    !isNaN(used) &&
    used >= 0 &&
    !thisElectricity?.paid;
  async function handleSave() {
    if (!actions?.upsertElectricity) return;
    try {
      const s = Number(start || 0);
      const e = Number(end || 0);
      console.log("Saving electricity reading:", {
        s,
        e,
      });
      await actions.upsertElectricity({
        roomId: room?.id,
        month: billingMonth,
        start_reading: s,
        end_reading: e,
        paid: electricity?.paid || false,
      });
      onClose();
    } catch (err) {
      console.error("Lỗi khi lưu số điện:", err);
      alert("Lưu số điện thất bại: " + (err?.message || String(err)));
    }
  }
  async function handlePay() {
    if (!canPay) return;
    const currentEnd = Number(end || 0);
    await requireAdmin(async () => {
      try {
        await actions.upsertElectricity({
          roomId: room?.id,
          month: billingMonth,
          start_reading: Number(start || 0),
          end_reading: currentEnd,
          paid: true,
        });
      } catch (err) {
        console.error("Lỗi khi lưu lịch sử:", err);
        alert("Lưu lịch sử thất bại: " + (err?.message || String(err)));
        return;
      }
    });
    onClose();
  }
  useEffect(() => {
    setStart(
      thisElectricity?.month === billingMonth
        ? (thisElectricity?.start_reading ?? 0)
        : (thisElectricity?.end_reading ?? 0),
    );
    setEnd(
      thisElectricity?.month === billingMonth
        ? (thisElectricity?.end_reading ?? 0)
        : (thisElectricity?.end_reading ?? 0),
    );
  }, [open]);
  const isSameMonth = thisElectricity?.month === billingMonth;
  return (
    <Modal open={open} title="Tiền điện" onClose={handleClose}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Phòng {room?.code} - tháng {billingMonth}
        </div>
        {isSameMonth ? ( // cùng tháng với bill mới nhất
          thisElectricity?.paid ? (
            <div className="flex flex-col border-t border-[#ccc] pt-2 gap-1">
              <div
                className="text-[18px] bg-green-500 text-white rounded
            flex items-center justify-center font-medium p-1 py-3 mb-2"
              >
                Đã thu
              </div>
              <div className="flex flex-col gap-1 bg-green-50 p-3 p-r-2">
                <div className="flex text-[13px] justify-between">
                  Số điện đầu (a):{" "}
                  <b>{thisElectricity?.start_reading?.toLocaleString()}</b>
                </div>
                <div className="flex text-[13px] justify-between">
                  Số điện cuối (b):{" "}
                  <b>{thisElectricity?.end_reading?.toLocaleString()}</b>
                </div>
                <div className="flex text-[13px] justify-between border-t border-[#ccc] pt-1">
                  Đã dùng (c=b-a):
                  <b>
                    {(
                      thisElectricity?.end_reading -
                      thisElectricity?.start_reading
                    ).toLocaleString()}
                  </b>
                </div>
                <div className="flex text-[13px] justify-between">
                  Đơn giá (d): <b>{pricePerUnit?.toLocaleString()} VND / số</b>
                </div>
              </div>
              <div className="flex justify-between font-medium text-[15px] mt-2">
                Thành tiền (t=c*d):{" "}
                <div className="">
                  {(
                    pricePerUnit *
                    (thisElectricity?.end_reading -
                      thisElectricity?.start_reading)
                  ).toLocaleString()}{" "}
                  VND
                </div>
              </div>
            </div>
          ) : (
            <>
              <TextField
                label="Số điện đầu"
                type="number"
                value={start}
                onChange={(v) => setStart(v)}
                disabled={!auth?.isAdmin}
              />
              <TextField
                label="Số điện sau"
                type="number"
                value={end}
                onChange={(v) => setEnd(v)}
              />
              <div className="text-sm">
                Đã dùng: {used.toLocaleString()} = {used.toLocaleString()} x{" "}
                {pricePerUnit?.toLocaleString()} = {cost.toLocaleString()} VND
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                  onClick={handleSave}
                >
                  Lưu
                </button>
                <button
                  className={clsx(
                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
                    canPay
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500",
                  )}
                  disabled={!canPay}
                  onClick={handlePay}
                >
                  Đã thu
                </button>
              </div>
            </>
          )
        ) : (
          // khác tháng: chưa có bill cho tháng này
          <>
            <TextField
              label="Số điện đầu"
              type="number"
              value={start}
              onChange={(v) => setStart(v)}
              disabled={!auth?.isAdmin}
            />
            <TextField
              label="Số điện sau"
              type="number"
              value={end}
              onChange={(v) => setEnd(v)}
            />
            <div className="text-sm">
              Đã dùng: {used.toLocaleString()} = {used.toLocaleString()} x{" "}
              {pricePerUnit?.toLocaleString()} = {cost.toLocaleString()} VND
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                onClick={handleSave}
              >
                Lưu
              </button>
              <button
                className={clsx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-slate-900 text-white",
                )}
                onClick={handlePay}
              >
                Đã thu
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
