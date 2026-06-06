import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import SelectField from "../../components/ui/SelectField";

export default function AddRoomModal({
  open,
  onClose,
  requireAdmin,
  state,
  floor,
  setFloorId,
  addRoom,
  roomLimit = 0,
  currentRoomCount = 0,
  roomLimitReached = false,
}) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open) setCode("");
  }, [open]);

  return (
    <Modal open={open} title="Thêm phòng" onClose={onClose}>
      <div className="space-y-3">
        <SelectField
          label="Tầng"
          value={floor?.id || ""}
          onChange={(v) => setFloorId(v)}
          options={state.floors.map((f) => ({ value: f.id, label: f.name }))}
        />
        <TextField
          label="Mã phòng"
          value={code}
          onChange={setCode}
          placeholder="VD: 106"
        />
        {roomLimit > 0 ? (
          <div className="rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
            Đã dùng {currentRoomCount}/{roomLimit} phòng.
          </div>
        ) : null}
        {roomLimitReached ? (
          <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
            Tòa nhà đã đạt giới hạn phòng.
          </div>
        ) : null}
        <button
          disabled={roomLimitReached}
          className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() =>
            requireAdmin(async () => {
              if (roomLimitReached) return;
              const ok = await addRoom(floor.id, code);
              if (ok) onClose?.();
            })
          }
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Thêm phòng
          </span>
        </button>
      </div>
    </Modal>
  );
}
