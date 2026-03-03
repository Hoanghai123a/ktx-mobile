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
        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          onClick={() =>
            requireAdmin(async () => {
              addRoom(floor.id, code);
              onClose?.();
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
