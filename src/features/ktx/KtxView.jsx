import React, { useMemo } from "react";
import {
  FileDown,
  Plus,
  Trash2,
  DoorClosed,
  DoorOpen,
  Users,
} from "lucide-react";

import clsx from "../../components/ui/clsx";
import SelectField from "../../components/ui/SelectField";
import Empty from "../../components/ui/Empty";
import Pill from "../../components/ui/Pill";

export default function KtxView({
  state,
  auth,

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

  guardDelete,
  deleteFloor,
}) {
  const floor = useMemo(() => {
    const id = floorId || state?.floors?.[0]?.id || "";
    return state.floors.find((f) => f.id === id) || null;
  }, [state.floors, floorId]);

  const cols = Math.min(4, Math.max(2, state?.settings?.roomGridCols || 3));

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
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
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
      <div className="flex items-end gap-2">
        <div className="">
          <SelectField
            label="Chọn tầng"
            value={floor?.id || ""}
            onChange={(v) => setFloorId(v)}
            options={state.floors.map((f) => ({
              value: f.id,
              label: `${f.name} (${f.rooms.length} phòng)`,
            }))}
          />
        </div>
        <button
          className={clsx(
            "rounded-2xl px-3 py-2 text-sm font-semibold shadow-sm",
            auth?.isAdmin
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700",
          )}
          onClick={() => {
            const el = document.getElementById("floor-management");
            if (el && el.scrollIntoView)
              el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          Quản lý
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm"
          onClick={() => exportExcel()}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <FileDown className="h-4 w-4" />
            Xuất Excel
          </span>
        </button>

        <button
          className={clsx(
            "rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
            auth?.isAdmin
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700",
          )}
          onClick={() =>
            auth?.isAdmin ? setAddRoomModal(true) : setLoginModal(true)
          }
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Phòng
          </span>
        </button>
      </div>

      <div
        className="mt-4 grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
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
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Thêm phòng
                </button>
              }
            />
          </div>
        )}
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
              className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
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
          {count === 0 ? (
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
            .map((s) => workerById?.get(s.workerId)?.fullName)
            .filter(Boolean)
            .join(", ")}
        </div>
      ) : null}
    </button>
  );
}
