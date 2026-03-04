import React, { useMemo } from "react";
import Modal from "../../components/ui/Modal";
import Pill from "../../components/ui/Pill";

export default function StaysHistoryModal({ open, onClose, stays = [], roomById, workerById, onExport }) {
  const rows = useMemo(() => {
    return (stays || [])
      .slice()
      .sort((a, b) => {
        const da = a.dateIn ? String(a.dateIn) : "";
        const db = b.dateIn ? String(b.dateIn) : "";
        return db.localeCompare(da);
      })
      .map((s) => ({
        ...s,
        roomCode: roomById?.get(s.roomId)?.code || s.roomId || "—",
        workerName: workerById?.get(s.workerId)?.fullName || "—",
      }));
  }, [stays, roomById, workerById]);

  // only show first 100 items for performance
  const displayed = rows.slice(0, 100);

  return (
    <Modal open={open} title="Lịch sử ra/vào" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Tổng: {rows.length}</div>
            <div className="mt-2 text-xs text-slate-600">
              Hiển thị {displayed.length} mục gần nhất (100 mục).
            </div>
          </div>
          {typeof onExport === "function" ? (
            <button
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
              onClick={onExport}
            >
              Excel đầy đủ
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          {displayed.length ? (
            displayed.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{r.workerName}</div>
                    <div className="text-xs text-slate-600">Phòng: {r.roomCode}</div>
                  </div>
                  <div className="text-xs text-slate-600 text-right">
                    <div>Vào: {String(r.dateIn || "").split("T")[0] || "-"}</div>
                    <div>Rời: {r.dateOut ? String(r.dateOut).split("T")[0] : "-"}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100">Chưa có lịch sử.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
