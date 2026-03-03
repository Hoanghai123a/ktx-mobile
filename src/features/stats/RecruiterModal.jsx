import React, { useMemo } from "react";
import { DoorOpen } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Pill from "../../components/ui/Pill";

export default function RecruiterModal({
  recruiterModal, // {open,recruiter}
  setRecruiterModal,
  recruiterWorkersMap, // Map(recruiter -> [{workerId,fullName,hometown,floorName,roomCode}])
  setWorkerModal,
}) {
  const key = recruiterModal.recruiter;
  const list = useMemo(
    () => (key ? recruiterWorkersMap.get(key) || [] : []),
    [key, recruiterWorkersMap],
  );

  return (
    <Modal
      open={recruiterModal.open}
      title={`NLĐ theo người tuyển: ${recruiterModal.recruiter || ""}`}
      onClose={() => setRecruiterModal({ open: false, recruiter: null })}
    >
      {!key ? (
        <div className="text-sm text-slate-600">Không có dữ liệu.</div>
      ) : !list.length ? (
        <div className="text-sm text-slate-600">
          Chưa có NLĐ đang ở thuộc người tuyển này.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="text-sm font-semibold">{key}</div>
            <div className="mt-1 text-xs text-slate-600">
              Tổng NLĐ đang ở: {list.length}
            </div>
          </div>

          {list.map((it) => (
            <button
              key={it.workerId + it.roomCode}
              className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
              onClick={() =>
                setWorkerModal({
                  open: true,
                  workerId: it.workerId,
                  roomCtx: null,
                })
              }
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {it.fullName}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Quê quán: {it.hometown || "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Đang ở: {it.floorName} • Phòng {it.roomCode}
                  </div>
                </div>
                <Pill icon={DoorOpen} text={it.roomCode} tone="sky" />
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
