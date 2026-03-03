import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";

export default function AddFloorModal({
  open,
  onClose,
  requireAdmin,
  addFloor,
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  return (
    <Modal open={open} title="Thêm tầng" onClose={onClose}>
      <div className="space-y-3">
        <TextField
          label="Tên tầng"
          value={name}
          onChange={setName}
          placeholder="VD: Tầng 3"
        />
        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          onClick={() =>
            requireAdmin(async () => {
              addFloor(name);
              onClose?.();
            })
          }
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Thêm tầng
          </span>
        </button>
      </div>
    </Modal>
  );
}
