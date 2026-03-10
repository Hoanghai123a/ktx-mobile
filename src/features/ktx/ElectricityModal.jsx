import React, { useState } from "react";
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
  // local draft state is initialised from the passed-in electricity record
  const [start, setStart] = useState(
    electricity?.start_reading ?? electricity?.start ?? "",
  );
  const [end, setEnd] = useState(
    electricity?.end_reading ?? electricity?.end ?? "",
  );

  // helper invoked when the modal closes; don't auto-save to avoid conflicts
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
    !electricity?.paid;

  // explicitly save current readings and close the modal
  async function handleSave() {
    if (!actions?.upsertElectricity) return;
    try {
      const s = Number(start || 0);
      const e = Number(end || 0);
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

    // Compute next month from billingMonth (format: YYYY-MM)
    let nextMonth = billingMonth;
    if (billingMonth) {
      const d = new Date(billingMonth + "-01");
      d.setMonth(d.getMonth() + 1);
      nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    await requireAdmin(async () => {
      try {
        // 1. Save the current reading first (same as Lưu)
        await actions.upsertElectricity({
          roomId: room?.id,
          month: billingMonth,
          start_reading: Number(start || 0),
          end_reading: currentEnd,
          paid: false,
        });

        // 2. Mark current record as paid to move to history
        await actions.markElectricityPaid({
          roomId: room.id,
          month: billingMonth,
        });

        // 3. Create new draft for next billing month:
        // start_reading = current end_reading
        // end_reading = 0
        // paid = false
        await actions.upsertElectricity({
          roomId: room.id,
          month: nextMonth,
          start_reading: currentEnd,
          end_reading: 0,
          paid: false,
        });
      } catch (err) {
        console.error("Lỗi khi lưu lịch sử:", err);
        alert("Lưu lịch sử thất bại: " + (err?.message || String(err)));
        return;
      }
    });

    onClose();
  }

  return (
    <Modal open={open} title="Tiền điện" onClose={handleClose}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Phòng {room?.code} - tháng {billingMonth}
        </div>
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
      </div>
    </Modal>
  );
}
