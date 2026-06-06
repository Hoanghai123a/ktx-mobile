import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";

function toPositiveInt(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function AddFloorModal({
  open,
  onClose,
  requireAdmin,
  addFloor,
  roomLimit = 0,
  currentRoomCount = 0,
}) {
  const [name, setName] = useState("");
  const [createRooms, setCreateRooms] = useState(false);
  const [startNo, setStartNo] = useState("");
  const [endNo, setEndNo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setCreateRooms(false);
    setStartNo("");
    setEndNo("");
    setBusy(false);
  }, [open]);

  const roomCount = useMemo(() => {
    if (!createRooms) return 0;
    const start = toPositiveInt(startNo);
    const end = toPositiveInt(endNo);
    return start && end >= start ? end - start + 1 : 0;
  }, [createRooms, endNo, startNo]);

  const invalidRange = createRooms && roomCount <= 0;
  const overLimit = roomLimit > 0 && currentRoomCount + roomCount > roomLimit;

  const submit = () => {
    requireAdmin(async () => {
      if (busy || invalidRange || overLimit) return;
      setBusy(true);
      try {
        const ok = await addFloor(name, {
          createRooms,
          startNo: toPositiveInt(startNo),
          endNo: toPositiveInt(endNo),
        });
        if (ok) onClose?.();
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Modal open={open} title="Thêm tầng" onClose={() => !busy && onClose?.()}>
      <div className="space-y-3">
        <TextField
          label="Tên tầng"
          value={name}
          onChange={setName}
          placeholder="VD: Tầng 3"
          disabled={busy}
        />

        <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-100">
          <input
            type="checkbox"
            checked={createRooms}
            disabled={busy}
            onChange={(e) => setCreateRooms(e.target.checked)}
            className="h-4 w-4"
          />
          Tạo phòng nhanh cho tầng này
        </label>

        {createRooms ? (
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Phòng từ"
              type="number"
              value={String(startNo)}
              onChange={setStartNo}
              placeholder="VD: 101"
              disabled={busy}
              error={invalidRange ? " " : null}
            />
            <TextField
              label="Phòng đến"
              type="number"
              value={String(endNo)}
              onChange={setEndNo}
              placeholder="VD: 105"
              disabled={busy}
              error={invalidRange ? " " : null}
            />
          </div>
        ) : null}

        {createRooms ? (
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
            Sẽ tạo {roomCount} phòng cho tầng mới.
          </div>
        ) : null}

        {roomLimit > 0 ? (
          <div className={`rounded-2xl px-3 py-2 text-xs font-semibold ring-1 ${overLimit ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-sky-50 text-sky-700 ring-sky-100"}`}>
            Giới hạn tòa nhà: {currentRoomCount + roomCount}/{roomLimit} phòng.
          </div>
        ) : null}

        <button
          disabled={busy || invalidRange || overLimit}
          className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          onClick={submit}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            {busy ? "Đang thêm..." : "Thêm tầng"}
          </span>
        </button>
      </div>
    </Modal>
  );
}
