import React, { useMemo, useState } from "react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import clsx from "../../components/ui/clsx";

function toPositiveInt(value, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildDefaultRanges(floors, roomsPerFloor, startNo) {
  const count = toPositiveInt(floors, 1);
  const rooms = toPositiveInt(roomsPerFloor, 1);
  let nextStart = toPositiveInt(startNo, 101);

  return Array.from({ length: count }, (_, index) => {
    const start = nextStart;
    const end = start + rooms - 1;
    nextStart = end + 1;
    return { name: `Tầng ${index + 1}`, startNo: start, endNo: end };
  });
}

function normalizeRanges(initModal) {
  const floors = toPositiveInt(initModal.floors, 1);
  const defaults = buildDefaultRanges(
    floors,
    initModal.roomsPerFloor,
    initModal.startNo,
  );
  const current = Array.isArray(initModal.floorRanges)
    ? initModal.floorRanges
    : [];

  return defaults.map((row, index) => ({
    ...row,
    ...(current[index] || {}),
    name: current[index]?.name || row.name,
  }));
}

function validateRanges(rows) {
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    const startNo = toPositiveInt(row.startNo);
    const endNo = toPositiveInt(row.endNo);
    if (!startNo || !endNo) return `Tầng ${index + 1}: nhập đủ phòng từ/đến.`;
    if (endNo < startNo) return `Tầng ${index + 1}: phòng đến phải >= phòng từ.`;
    for (let code = startNo; code <= endNo; code += 1) {
      if (seen.has(code)) return `Mã phòng ${code} bị trùng giữa các tầng.`;
      seen.add(code);
    }
  }
  return "";
}

export default function InitKtxModal({
  initModal,
  setInitModal,
  requireAdmin,
  initKtxFromInputs,
  roomLimit = 0,
  currentRoomCount = 0,
}) {
  const [busy, setBusy] = useState(false);
  const mode = initModal.mode || "uniform";
  const floorRanges = useMemo(() => normalizeRanges(initModal), [initModal]);
  const requestedRooms = useMemo(() => {
    if (mode === "ranges") {
      return floorRanges.reduce((sum, row) => {
        const start = toPositiveInt(row.startNo);
        const end = toPositiveInt(row.endNo);
        return sum + (start && end && end >= start ? end - start + 1 : 0);
      }, 0);
    }
    return toPositiveInt(initModal.floors) * toPositiveInt(initModal.roomsPerFloor);
  }, [floorRanges, initModal.floors, initModal.roomsPerFloor, mode]);
  const overLimit = roomLimit > 0 && currentRoomCount + requestedRooms > roomLimit;

  const setMode = (nextMode) => {
    setInitModal((m) => ({
      ...m,
      mode: nextMode,
      floorRanges: normalizeRanges(m),
    }));
  };

  const setFloors = (value) => {
    setInitModal((m) => {
      const floors = toPositiveInt(value, 0);
      return { ...m, floors, floorRanges: normalizeRanges({ ...m, floors }) };
    });
  };

  const setRange = (index, patch) => {
    setInitModal((m) => {
      const rows = normalizeRanges(m);
      rows[index] = { ...rows[index], ...patch };
      return { ...m, floorRanges: rows };
    });
  };

  const resetRanges = () => {
    setInitModal((m) => ({ ...m, floorRanges: buildDefaultRanges(m.floors, m.roomsPerFloor, m.startNo) }));
  };

  const submit = () => {
    requireAdmin(async () => {
      if (overLimit) return;
      const payload = { ...initModal };
      if (mode === "ranges") {
        const rows = normalizeRanges(initModal).map((row, index) => ({
          name: row.name?.trim() || `Tầng ${index + 1}`,
          startNo: toPositiveInt(row.startNo),
          endNo: toPositiveInt(row.endNo),
        }));
        const error = validateRanges(rows);
        if (error) {
          alert(error);
          return;
        }
        payload.floorRanges = rows;
      }

      setBusy(true);
      try {
        const ok = await initKtxFromInputs(payload);
        if (ok) setInitModal((m) => ({ ...m, open: false }));
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Modal
      open={initModal.open}
      title="Khởi tạo cấu trúc KTX"
      onClose={() => !busy && setInitModal((m) => ({ ...m, open: false }))}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={clsx(
              "rounded-2xl px-3 py-2 text-sm font-semibold ring-1",
              mode !== "ranges"
                ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                : "bg-white text-slate-700 ring-slate-200",
            )}
            onClick={() => setMode("uniform")}
          >
            Tạo đều
          </button>
          <button
            type="button"
            className={clsx(
              "rounded-2xl px-3 py-2 text-sm font-semibold ring-1",
              mode === "ranges"
                ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                : "bg-white text-slate-700 ring-slate-200",
            )}
            onClick={() => setMode("ranges")}
          >
            Từng tầng
          </button>
        </div>

        <TextField
          label="Số tầng"
          type="number"
          value={String(initModal.floors)}
          onChange={setFloors}
          placeholder="VD: 3"
        />

        {mode === "ranges" ? (
          <div className="space-y-2 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-600">
                Khoảng phòng theo từng tầng
              </div>
              <button
                type="button"
                className="rounded-2xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                onClick={resetRanges}
              >
                Tự điền
              </button>
            </div>

            {floorRanges.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_80px] gap-2">
                <TextField
                  label={index === 0 ? "Tên tầng" : " "}
                  value={row.name || `Tầng ${index + 1}`}
                  onChange={(v) => setRange(index, { name: v })}
                />
                <TextField
                  label={index === 0 ? "Từ" : " "}
                  type="number"
                  value={String(row.startNo || "")}
                  onChange={(v) => setRange(index, { startNo: Number(v || 0) })}
                />
                <TextField
                  label={index === 0 ? "Đến" : " "}
                  type="number"
                  value={String(row.endNo || "")}
                  onChange={(v) => setRange(index, { endNo: Number(v || 0) })}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <TextField
              label="Số phòng / tầng"
              type="number"
              value={String(initModal.roomsPerFloor)}
              onChange={(v) =>
                setInitModal((m) => ({ ...m, roomsPerFloor: Number(v || 0) }))
              }
              placeholder="VD: 10"
            />

            <TextField
              label="Mã phòng bắt đầu"
              type="number"
              value={String(initModal.startNo)}
              onChange={(v) =>
                setInitModal((m) => ({ ...m, startNo: Number(v || 0) }))
              }
              placeholder="VD: 101"
            />
          </>
        )}

        <button
          className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
          disabled={busy || overLimit}
          onClick={submit}
        >
          {busy ? "Đang tạo..." : "Tạo tầng & phòng"}
        </button>

        {roomLimit > 0 ? (
          <div className={clsx(
            "rounded-2xl px-3 py-2 text-xs font-semibold ring-1",
            overLimit ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-sky-50 text-sky-700 ring-sky-100",
          )}>
            Giới hạn tòa nhà: {currentRoomCount + requestedRooms}/{roomLimit} phòng.
          </div>
        ) : null}

        <div className="text-xs text-slate-500">
          Tạo đều: mã phòng tăng dần. Từng tầng: nhập khoảng riêng, ví dụ 101-105, 106-108.
        </div>
      </div>
    </Modal>
  );
}
