import React from "react";
import { FileDown, Users, UserRound, Filter } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

// Pill bạn đang có ở components/ui (nếu file của bạn khác path thì sửa lại)
import Pill from "../../components/ui/Pill.jsx";

export default React.memo(function StatsView({
  stats,
  recruiterStats,
  onExportExcel,
  onOpenRecruiter,
}) {
  const safeStats = Array.isArray(stats) ? stats : [];
  const safeRecruiterStats = Array.isArray(recruiterStats)
    ? recruiterStats
    : [];
  const totalWorkers = safeRecruiterStats.reduce(
    (a, b) => a + (Number(b?.workers) || 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">
              Thống kê theo số người/phòng
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Ví dụ: phòng trống, 1 người, 2 người, …
            </div>
          </div>
          <button
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            onClick={onExportExcel}
          >
            <span className="inline-flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Excel
            </span>
          </button>
        </div>

        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="occupancy" tickFormatter={(v) => `${v} người`} />
              <Tooltip />
              <Bar dataKey="rooms" fill="#93c5fd" radius={[10, 10, 0, 0]}>
                <LabelList dataKey="rooms" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {safeStats.map((s) => (
            <div
              key={s.occupancy}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <div className="text-xs text-slate-600">
                {s.occupancy === 0 ? "Phòng trống" : `${s.occupancy} người`}
              </div>
              <div className="mt-1 text-lg font-semibold">{s.rooms}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              Thống kê NLĐ theo người tuyển (đang ở)
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Đếm NLĐ hiện đang ở theo cột “Người tuyển”.
            </div>
          </div>
          <Pill icon={Users} text={`${totalWorkers} NLĐ`} tone="green" />
        </div>

        {safeRecruiterStats.length ? (
          <div className="mt-3 space-y-2">
            {safeRecruiterStats.map((x) => (
              <button
                key={x.recruiter}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => onOpenRecruiter(x.recruiter)}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {x.recruiter}
                  </div>
                  <div className="text-xs text-slate-600">
                    Bấm để xem danh sách NLĐ
                  </div>
                </div>
                <Pill icon={UserRound} text={`${x.workers}`} tone="sky" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600">Chưa có NLĐ đang ở.</div>
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Gợi ý lọc</div>
            <div className="mt-1 text-xs text-slate-600">
              Dùng ô tìm kiếm ở trên để lọc theo tên NLĐ (tự làm mờ phòng không
              khớp).
            </div>
          </div>
          <Pill icon={Filter} text="Tìm nhanh" tone="sky" />
        </div>
      </div>
    </div>
  );
});
