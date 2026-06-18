import React, { useMemo, useRef, useState } from "react";
import {
  FileDown,
  Plus,
  Trash2,
  Building2,
  ChevronDown,
  DoorClosed,
  DoorOpen,
  Mars,
  Venus,
  Users,
} from "lucide-react";

import clsx from "../../components/ui/clsx";
import Empty from "../../components/ui/Empty";
import Pill from "../../components/ui/Pill";

export default function KtxView({
  state,
  auth,
  currentBuilding,

  floorId,
  setFloorId,

  q,
  globalMatches,
  workerById,

  setRoomModal,
  exportExcel,
  requireAdmin,

  setInitModal,
  setAddRoomModal,
  setLoginModal,
  setAddFloorModal,
  setTab,

  guardDelete,
  deleteFloor,
}) {
  const floor = useMemo(() => {
    const id = floorId || state?.floors?.[0]?.id || "";
    return state.floors.find((f) => f.id === id) || null;
  }, [state.floors, floorId]);

  const cols = Math.min(4, Math.max(2, state?.settings?.roomGridCols || 3));
  const swipeRef = useRef({ startX: 0, startY: 0, swiped: false });
  const [slideDirection, setSlideDirection] = useState(null);
  const floorIndex = useMemo(
    () => state.floors.findIndex((f) => f.id === (floor?.id || floorId)),
    [floor?.id, floorId, state.floors],
  );

  function changeFloor(nextId) {
    const nextIndex = state.floors.findIndex((f) => f.id === nextId);
    if (nextIndex < 0 || nextIndex === floorIndex) return;
    setSlideDirection(nextIndex > floorIndex ? 1 : -1);
    setFloorId(nextId);
  }

  function switchFloorBySwipe(direction) {
    const nextIndex = Math.min(
      Math.max(floorIndex + direction, 0),
      state.floors.length - 1,
    );
    if (nextIndex !== floorIndex && state.floors[nextIndex]?.id) {
      setSlideDirection(direction);
      setFloorId(state.floors[nextIndex].id);
      return true;
    }
    return false;
  }

  function handleSwipeStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeRef.current = { startX: touch.clientX, startY: touch.clientY, swiped: false };
  }

  function handleSwipeEnd(e) {
    const touch = e.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - swipeRef.current.startX;
    const dy = touch.clientY - swipeRef.current.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 60 || absX < absY * 1.4) return;
    swipeRef.current.swiped = true;
    switchFloorBySwipe(dx < 0 ? 1 : -1);
    e.preventDefault();
  }

  function handleSwipeClickCapture(e) {
    if (!swipeRef.current.swiped) return;
    e.preventDefault();
    e.stopPropagation();
    swipeRef.current.swiped = false;
  }

  if (!currentBuilding) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <div className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-500" />
          </div>
          <div className="text-lg font-semibold text-slate-900">
            Chưa chọn tòa nhà
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Thông tin KTX chỉ hiển thị theo tòa nhà bạn đã chọn trước đó.
          </div>
          <button
            className="mt-4 w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => setTab?.(auth?.systemAdmin ? "admin" : "buildings")}
          >
            Chọn tòa nhà
          </button>
        </div>
      </div>
    );
  }

  if (!state?.floors?.length) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-lg font-semibold text-slate-900">
            Chưa có tầng/phòng
          </div>

          <div className="mt-1 text-sm text-slate-600">
            {auth?.isAdmin
              ? "Hãy khởi tạo cấu trúc KTX để bắt đầu."
              : "Bạn đang ở chế độ xem. Hãy đăng nhập Admin để khởi tạo."}
          </div>

          {auth?.isAdmin ? (
            <button
              className="mt-4 w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white"
              onClick={() =>
                setInitModal((m) => ({ ...(m || {}), open: true }))
              }
            >
              Khởi tạo KTX
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24">
      <div className="grid grid-cols-2 items-end gap-2">
        <div className="min-w-0">
          <label className="relative block">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(2_132_199)]" />
            <select
              className="h-10 w-full appearance-none rounded-2xl border-0 bg-sky-100 py-2 pl-9 pr-8 text-sm font-semibold text-[rgb(2_132_199)] outline-none ring-0 focus:bg-sky-100"
              value={floor?.id || ""}
              onChange={(e) => changeFloor(e.target.value)}
            >
              {state.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(2_132_199)]" />
          </label>
        </div>

        <div className="flex min-w-0 justify-end gap-2 pt-2">
          <button
            className={clsx(
              "shrink-0 rounded-2xl px-3 py-3 text-xs font-semibold shadow-sm",
              auth?.isAdmin
                ? "bg-[rgb(255,255,255)]"
                : "bg-slate-100 text-slate-700",
            )}
            onClick={() =>
              auth?.isAdmin ? setAddRoomModal(true) : setLoginModal(true)
            }
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" />
              Phòng
            </span>
          </button>
          <button
            className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold shadow-sm"
            onClick={() => exportExcel()}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <FileDown className="h-4 w-4" />
              Excel
            </span>
          </button>
        </div>
      </div>
      <div
        className="mt-4 overflow-hidden"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        onClickCapture={handleSwipeClickCapture}
      >
        <div
          key={floor?.id || "floor"}
          className={clsx(
            "grid gap-3",
            slideDirection === 1
              ? "ktx-floor-slide-from-right"
              : slideDirection === -1
                ? "ktx-floor-slide-from-left"
                : "",
          )}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          onAnimationEnd={() => setSlideDirection(null)}
        >
        {floor?.rooms?.length ? (
          floor.rooms.map((r) => (
            <RoomCard
              key={r.id}
              r={r}
              floorId={floor.id}
              q={q}
              globalMatches={globalMatches}
              workerById={workerById}
              setRoomModal={setRoomModal}
            />
          ))
        ) : (
          <div className="col-span-full">
            <Empty
              title="Chưa có phòng ở tầng này"
              hint={
                auth?.isAdmin
                  ? "Thêm phòng để bắt đầu."
                  : "Bạn đang ở chế độ xem. Hãy đăng nhập để thêm phòng."
              }
              action={
                <button
                  onClick={() => requireAdmin(() => setAddRoomModal(true))}
                  className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white"
                >
                  Thêm phòng
                </button>
              }
            />
          </div>
        )}
        </div>
      </div>

      <div
        id="floor-management"
        className="mt-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Quản lý tầng</div>
            <div className="text-xs text-slate-600">Thêm / xóa tầng nhanh</div>
          </div>
          {auth?.isAdmin ? (
            <button
              className="rounded-2xl bg-[rgb(44_120_159)] px-3 py-2 text-xs font-semibold text-white"
              onClick={() => setAddFloorModal(true)}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tầng
              </span>
            </button>
          ) : (
            <button
              className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={() => setLoginModal(true)}
            >
              Đăng nhập
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {state.floors.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
            >
              <button className="text-left" onClick={() => setFloorId(f.id)}>
                <div className="text-sm font-semibold text-slate-900">
                  {f.name}
                </div>
                <div className="text-xs text-slate-600">
                  {
                    f.rooms.filter((r) => r.stays.some((s) => !s.dateOut))
                      .length
                  }
                  /{f.rooms.length} phòng
                </div>
              </button>

              {auth?.isAdmin ? (
                <button
                  className="rounded-2xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  onClick={() =>
                    guardDelete({
                      title: "Xóa tầng",
                      message: `Xóa ${f.name}? Tất cả phòng và lịch sử ở trong tầng này sẽ bị xóa.`,
                      onDelete: async () => {
                        await deleteFloor(f.id);
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  className="rounded-2xl px-3 py-2 text-xs font-semibold text-rose-300 opacity-50 cursor-not-allowed"
                  onClick={() => setLoginModal(true)}
                  title="Đăng nhập để xóa tầng"
                  disabled
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tách từ App.jsx: function RoomCard({ r, floorId }) */
function RoomCard({ r, floorId, q, globalMatches, workerById, setRoomModal }) {
  const current = r.stays.filter((s) => !s.dateOut);
  const count = current.length;

  const isMatched = (q || "").trim() ? globalMatches?.roomIds?.has(r.id) : true;

  const tone =
    count === 0
      ? "bg-white"
      : count === 1
        ? "bg-emerald-50"
        : count === 2
          ? "bg-sky-50"
          : "bg-amber-50";

  const ring =
    count === 0
      ? "ring-slate-100"
      : count === 1
        ? "ring-emerald-100"
        : count === 2
          ? "ring-sky-100"
          : "ring-amber-100";

  return (
    <button
      onClick={() => setRoomModal({ open: true, floorId, roomId: r.id })}
      className={clsx(
        "relative rounded-3xl p-3 text-left shadow-sm ring-1 transition active:scale-[0.99]",
        tone,
        ring,
        isMatched ? "" : "opacity-35",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500">Phòng</div>
          <div className="mt-0.5 text-base font-semibold text-slate-900">
            {r.code}
          </div>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/70 ring-1 ring-slate-200">
          {r.gender === "male" || r.gender === "Nam" ? (
            <Mars className="h-5 w-5 text-sky-600" />
          ) : r.gender === "female" || r.gender === "Nữ" ? (
            <Venus className="h-5 w-5 text-pink-600" />
          ) : count === 0 ? (
            <DoorClosed className="h-5 w-5 text-slate-500" />
          ) : (
            <DoorOpen className="h-5 w-5 text-slate-700" />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Pill
          icon={Users}
          text={`${count} NLĐ`}
          tone={
            count === 0
              ? "slate"
              : count === 1
                ? "green"
                : count === 2
                  ? "sky"
                  : "amber"
          }
        />
        <div className="text-xs font-medium text-slate-500">
          {count === 0 ? "Trống" : "Đang ở"}
        </div>
      </div>

      {(q || "").trim() && isMatched ? (
        <div className="mt-2 line-clamp-2 text-xs text-slate-600">
          {current
            .map((s) => {
              const w = workerById?.get(s.workerId);
              if (!w) return null;
              return w.employeeCode
                ? `${w.employeeCode} - ${w.fullName}`
                : w.fullName;
            })
            .filter(Boolean)
            .join(", ")}
        </div>
      ) : null}
    </button>
  );
}
