import React, { useState } from "react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";

export default function InitKtxModal({
  initModal, // {open,floors,roomsPerFloor,startNo}
  setInitModal,
  requireAdmin,
  initKtxFromInputs, // async (initModal)=>boolean
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={initModal.open}
      title="Khởi tạo cấu trúc KTX"
      onClose={() => !busy && setInitModal((m) => ({ ...m, open: false }))}
    >
      <div className="space-y-3">
        <TextField
          label="Số tầng"
          type="number"
          value={String(initModal.floors)}
          onChange={(v) =>
            setInitModal((m) => ({ ...m, floors: Number(v || 0) }))
          }
          placeholder="VD: 3"
        />

        <TextField
          label="Số phòng / tầng"
          type="number"
          value={String(initModal.roomsPerFloor)}
          onChange={(v) =>
            setInitModal((m) => ({ ...m, roomsPerFloor: Number(v || 0) }))
          }
          placeholder="VD: 10"
        />

        <TextField
          label="Mã phòng bắt đầu"
          type="number"
          value={String(initModal.startNo)}
          onChange={(v) =>
            setInitModal((m) => ({ ...m, startNo: Number(v || 0) }))
          }
          placeholder="VD: 101"
        />

        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          disabled={busy}
          onClick={() =>
            requireAdmin(async () => {
              setBusy(true);
              try {
                const ok = await initKtxFromInputs(initModal); // ✅ true/false
                if (ok) setInitModal((m) => ({ ...m, open: false }));
              } finally {
                setBusy(false);
              }
            })
          }
        >
          {busy ? "Đang tạo..." : "Tạo tầng & phòng"}
        </button>

        <div className="text-xs text-slate-500">
          Mã phòng sẽ tăng dần: start, start+1, start+2...
        </div>
      </div>
    </Modal>
  );
}
