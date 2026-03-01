import React, { useMemo } from "react";
import { UserRound, LogOut, Plus, ArrowRightLeft } from "lucide-react";
import Modal from "../../components/ui/Modal.jsx";

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function RoomModal({
  open,
  onClose,

  // data
  state, // { floors: [...] }
  workerById, // Map(workerId -> worker)
  floorId,
  roomId,

  // quyền/admin
  isAdmin,

  // callbacks (tuỳ bạn dùng cái nào thì truyền)
  onOpenWorker, // (workerId) => void
  onAddStay, // ({floorId, roomId}) => void
  onCheckoutStay, // ({floorId, roomId, stayId}) => void
  onTransfer, // ({fromFloorId, fromRoomId}) => void
}) {
  const ctx = useMemo(() => {
    const floor = state?.floors?.find((f) => f.id === floorId);
    const room = floor?.rooms?.find((r) => r.id === roomId);
    return { floor, room };
  }, [state, floorId, roomId]);

  const title = ctx.room
    ? `Phòng ${ctx.room.code || ctx.room.name || ""} · ${ctx.floor?.name || ""}`
    : "Chi tiết phòng";

  const currentStays = useMemo(() => {
    const stays = ctx.room?.stays || [];
    return stays.filter((s) => !s.dateOut);
  }, [ctx.room]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {!ctx.room ? (
        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
          <div className="text-sm text-slate-600">Không tìm thấy phòng.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Đang ở: {currentStays.length}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Danh sách NLĐ hiện đang ở phòng này
                </div>
              </div>

              {isAdmin ? (
                <div className="flex gap-2">
                  <button
                    className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => onAddStay?.({ floorId, roomId })}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Thêm
                    </span>
                  </button>

                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    onClick={() =>
                      onTransfer?.({ fromFloorId: floorId, fromRoomId: roomId })
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Chuyển
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              {currentStays.length ? (
                currentStays.map((st) => {
                  const w = workerById?.get?.(st.workerId);
                  return (
                    <div
                      key={st.id || `${st.workerId}-${st.dateIn}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => (w?.id ? onOpenWorker?.(w.id) : null)}
                      >
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {w?.fullName || "(Không rõ tên)"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          Người tuyển: {w?.recruiter || "—"}
                        </div>
                      </button>

                      <div className="ml-2 flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100">
                          <UserRound className="h-5 w-5 text-slate-600" />
                        </div>

                        {isAdmin ? (
                          <button
                            className="rounded-2xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              onCheckoutStay?.({
                                floorId,
                                roomId,
                                stayId: st.id,
                              })
                            }
                            title="Trả phòng"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Phòng đang trống.
                </div>
              )}
            </div>
          </div>

          {/* Gợi ý nhanh */}
          <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">Gợi ý</div>
            <div className="mt-1 text-xs text-slate-600">
              Bấm vào tên NLĐ để xem chi tiết. Admin có thể Thêm/Chuyển/Trả
              phòng.
            </div>
          </div>

          <button
            onClick={onClose}
            className={clsx(
              "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700",
            )}
          >
            Đóng
          </button>
        </div>
      )}
    </Modal>
  );
}
