import React from "react";
import { FileDown, UserPlus, UserRound } from "lucide-react";

import clsx from "../../components/ui/clsx";
import Empty from "../../components/ui/Empty";
import { workerGenderLabel } from "../../services/qrWorkerParser";

export default function WorkersView({
  state,
  q,
  auth,
  exportExcel,
  requireAdmin,
  setAddWorkerModal,
  setWorkerModal,
  floors = [],
}) {
  // Filter to only workers currently staying
  const occupiedWorkerIds = new Set();
  const currentRoomByWorkerId = new Map();
  for (const f of floors) {
    for (const r of f.rooms) {
      for (const st of r.stays) {
        if (!st.dateOut) {
          occupiedWorkerIds.add(st.workerId);
          currentRoomByWorkerId.set(st.workerId, {
            floorName: f.name,
            roomCode: r.code,
          });
        }
      }
    }
  }

  const query = q.trim().toLowerCase();
  const list = query
    ? state.workers
        .filter((w) => occupiedWorkerIds.has(w.id))
        .filter((w) => {
          const name = (w.fullName || "").toLowerCase();
          const code = (w.employeeCode || "").toLowerCase();
          return name.includes(query) || code.includes(query);
        })
    : state.workers.filter((w) => occupiedWorkerIds.has(w.id));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm"
          onClick={() => exportExcel?.()}
        >
          <span className="inline-flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Xuất Excel
          </span>
        </button>

        <button
          className={clsx(
            "rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
            auth.isAdmin
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700",
          )}
          onClick={() => requireAdmin?.(() => setAddWorkerModal?.(true))}
        >
          <span className="inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm NLĐ
          </span>
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {list.length ? (
          list
            .slice()
            .sort((a, b) => {
              const ac = (a.employeeCode || "").localeCompare(
                b.employeeCode || "",
                "vi",
              );
              if (ac !== 0) return ac;
              return a.fullName.localeCompare(b.fullName, "vi");
            })
            .map((w) => (
              <button
                key={w.id}
                className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
                onClick={() =>
                  setWorkerModal?.({
                    open: true,
                    workerId: w.id,
                    roomCtx: null,
                  })
                }
              >
                <div className="flex flex-col items-start justify-between">
                  <div className="text-base font-semibold text-slate-900">
                    {w.employeeCode ? `${w.employeeCode} - ` : ""}
                    {w.fullName}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {workerGenderLabel(w.gender) || "Chưa có giới tính"}
                    {w.identityNumber ? ` · CCCD ${w.identityNumber}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Điện: {Number(w.electricityFee || 0).toLocaleString("vi-VN")}đ · Nước: {Number(w.waterFee || 0).toLocaleString("vi-VN")}đ
                  </div>
                  <div className="flex gap-2 justify-space-between w-full">
                    <div className="w-2/3 overflow-ellipsis">
                      <div className="mt-1 text-xs text-slate-600">
                        SĐT: {w.phone || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        Quê quán: {w.hometown || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        Ghi chú: {w.note || "—"}
                      </div>
                    </div>
                    <div className="w-1/3 overflow-ellipsis">
                      <div className="mt-0.5 text-xs text-slate-600">
                        Phòng:{" "}
                        {currentRoomByWorkerId.get(w.id)?.roomCode || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        Người tuyển: {w.recruiter || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))
        ) : (
          <Empty
            title="Không có NLĐ đang ở"
            hint={
              auth.isAdmin
                ? "Hiện tại không có NLĐ nào đang ở trong KTX."
                : "Bạn đang ở chế độ xem. Hãy đăng nhập để thêm NLĐ."
            }
            action={
              <button
                onClick={() => requireAdmin?.(() => setAddWorkerModal?.(true))}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Thêm NLĐ
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
