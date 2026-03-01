import React from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";
import SelectField from "../../components/ui/SelectField.jsx";
import Empty from "../../components/ui/Empty.jsx";

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default React.memo(function KtxView({
  state,
  floor,
  setFloorId,
  auth,
  exportExcel,
  requireAdmin,
  onOpenInit,
  onOpenAddRoom,
  onOpenLogin,
  onOpenAddFloor,
  guardDelete,
  deleteFloor,
  RoomCard, // truyền từ App xuống
}) {
  const cols = Math.min(4, Math.max(2, state.settings.roomGridCols || 3));

  if (state.floors.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-lg font-semibold text-slate-900">
            Chưa có tầng/phòng
          </div>

          <div className="mt-1 text-sm text-slate-600">
            {auth.isAdmin
              ? "Hãy khởi tạo cấu trúc KTX để bắt đầu."
              : "Bạn đang ở chế độ xem. Hãy đăng nhập Admin để khởi tạo."}
          </div>

          {auth.isAdmin ? (
            <button
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              onClick={onOpenInit}
            >
              Khởi tạo KTX
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="flex items-center gap-2">
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

      <div className="mt-3 flex gap-2">
        <button
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm"
          onClick={exportExcel}
        >
          <span className="inline-flex items-center justify-center gap-2">
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
          onClick={() => (auth.isAdmin ? onOpenAddRoom() : onOpenLogin())}
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Phòng
          </span>
        </button>
      </div>

      <div
        className={clsx(
          "mt-4 grid gap-2",
          cols === 2
            ? "grid-cols-2"
            : cols === 3
              ? "grid-cols-3"
              : "grid-cols-4",
        )}
      >
        {floor?.rooms?.length ? (
          floor.rooms.map((r) => (
            <RoomCard key={r.id} r={r} floorId={floor.id} />
          ))
        ) : (
          <div className="col-span-full">
            <Empty
              title="Chưa có phòng ở tầng này"
              hint={
                auth.isAdmin
                  ? "Thêm phòng để bắt đầu."
                  : "Bạn đang ở chế độ xem. Hãy đăng nhập để thêm phòng."
              }
              action={
                <button
                  onClick={() => requireAdmin(onOpenAddRoom)}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Thêm phòng
                </button>
              }
            />
          </div>
        )}
      </div>

      {auth.isAdmin ? (
        <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Quản lý tầng</div>
              <div className="text-xs text-slate-600">
                Thêm / xóa tầng nhanh
              </div>
            </div>
            <button
              className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              onClick={onOpenAddFloor}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tầng
              </span>
            </button>
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
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});
