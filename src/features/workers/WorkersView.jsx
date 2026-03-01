import React, { useMemo } from "react";
import { FileDown, UserPlus, UserRound } from "lucide-react";
import Empty from "../../components/ui/Empty.jsx";

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default React.memo(function WorkersView({
  workers,
  q,
  auth,
  onExportExcel,
  requireAdmin,
  onOpenAddWorker,
  onOpenWorker,
}) {
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query
      ? workers.filter((w) => w.fullName.toLowerCase().includes(query))
      : workers;
  }, [workers, q]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm"
          onClick={onExportExcel}
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
          onClick={() => requireAdmin(onOpenAddWorker)}
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
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
            .map((w) => (
              <button
                key={w.id}
                className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
                onClick={() => onOpenWorker(w.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {w.fullName}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Quê quán: {w.hometown || "—"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Người tuyển: {w.recruiter || "—"}
                    </div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100">
                    <UserRound className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </button>
            ))
        ) : (
          <Empty
            title="Không có NLĐ"
            hint={
              auth.isAdmin
                ? "Thêm NLĐ để bắt đầu."
                : "Bạn đang ở chế độ xem. Hãy đăng nhập để thêm NLĐ."
            }
            action={
              <button
                onClick={() => requireAdmin(onOpenAddWorker)}
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
});
