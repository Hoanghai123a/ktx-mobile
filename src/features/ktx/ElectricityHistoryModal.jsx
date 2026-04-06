import React, { useMemo } from "react";
import Modal from "../../components/ui/Modal";

function monthToTime(month) {
  // month dạng "YYYY-MM"
  if (!month) return 0;
  const [y, m] = String(month).split("-").map(Number);
  if (!y || !m) return 0;
  return Date.UTC(y, m - 1, 1);
}

export default function ElectricityHistoryModal({
  open,
  onClose,
  records = [],
  pricePerUnit = 0,
  mode = "all", // "paid" | "pending" | "all"
  month, // optional: để hiển thị "Tháng ..."
}) {
  // ✅ Sort mới -> cũ ngay trong modal để luôn đúng
  const sorted = useMemo(() => {
    const arr = Array.isArray(records) ? [...records] : [];
    arr.sort((a, b) => {
      const eA = a?.electricity || {};
      const eB = b?.electricity || {};

      const tA = eA.paid_at ? Date.parse(eA.paid_at) : monthToTime(eA.month);
      const tB = eB.paid_at ? Date.parse(eB.paid_at) : monthToTime(eB.month);

      // mới -> cũ
      if (tA !== tB) return (tB || 0) - (tA || 0);

      // fallback ổn định theo phòng
      return String(a?.roomCode || "").localeCompare(String(b?.roomCode || ""));
    });
    return arr;
  }, [records]);

  const rows = useMemo(() => {
    return sorted.map((r) => {
      const e = r.electricity || {};

      // ✅ đọc đúng field mới, nhưng vẫn fallback field cũ nếu còn tồn tại
      const start = Number(e.start_reading ?? e.start ?? 0);
      const end = Number(e.end_reading ?? e.end ?? 0);

      const used = Math.max(0, end - start);
      const cost = used * Number(pricePerUnit || 0);

      return {
        ...r,
        month: e.month || "",
        start,
        end,
        used,
        cost,
        paid: !!e.paid,
        paidAt: e.paid_at || null,
      };
    });
  }, [sorted, pricePerUnit]);

  const title =
    mode === "paid"
      ? "Lịch sử: Đã thanh toán"
      : mode === "pending"
        ? "Lịch sử: Chưa thanh toán"
        : "Lịch sử tiền điện";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold">
            {month ? `Tháng: ${month} • ` : ""}
            Tổng bản ghi: {rows.length}
          </div>
        </div>

        <div className="space-y-2">
          {rows.length ? (
            rows.map((r, idx) => (
              <div
                key={`${r.roomCode || "room"}-${r.month}-${idx}`}
                className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">
                      Phòng {r.roomCode}
                    </div>
                    <div className="text-xs text-slate-600">
                      Tháng {r.month}
                    </div>
                    <div className="text-xs text-slate-500">
                      Thanh toán:{" "}
                      {r.paidAt
                        ? new Date(r.paidAt).toLocaleString("vi-VN")
                        : "--"}
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 text-right">
                    <div>Đầu: {r.start}</div>
                    <div>Sau: {r.end}</div>
                    <div>Đã dùng: {r.used}</div>
                    <div className="font-semibold">
                      Số tiền: {r.cost.toLocaleString("vi-VN")}₫
                    </div>
                    <div>
                      Trạng thái: {r.paid ? "Đã thanh toán" : "Chưa thanh toán"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100">
              Chưa có dữ liệu.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
