import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  DoorClosed,
  DoorOpen,
  Users,
  Plus,
  Trash2,
  LogIn,
  LogOut,
  Search,
  FileDown,
  Filter,
  Home,
  BarChart3,
  UserRound,
  ChevronDown,
  ChevronLeft,
  Calendar,
  UserPlus,
  UserMinus,
  Shield,
  Pencil,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import * as XLSX from "xlsx";

// ---------------------------
// Data model
// ---------------------------
// NLĐ = Worker
// Room stays store check-in/out.

const LS_KEY = "ktx_mobile_manager_v1";
const LS_AUTH = "ktx_mobile_manager_auth_v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(LS_AUTH);
    if (!raw) return { isAdmin: false };
    return JSON.parse(raw);
  } catch {
    return { isAdmin: false };
  }
}

function saveAuth(auth) {
  localStorage.setItem(LS_AUTH, JSON.stringify(auth));
}

const seed = () => {
  const w1 = {
    id: uid("w"),
    fullName: "Nguyễn Văn A",
    hometown: "Nghệ An",
    recruiter: "Chị Lan",
  };
  const w2 = {
    id: uid("w"),
    fullName: "Trần Thị B",
    hometown: "Quảng Ngãi",
    recruiter: "Anh Hùng",
  };
  const w3 = {
    id: uid("w"),
    fullName: "Lê Văn C",
    hometown: "Thanh Hóa",
    recruiter: "Chị Lan",
  };

  const f1 = {
    id: uid("f"),
    name: "Tầng 1",
    rooms: [
      {
        id: uid("r"),
        code: "101",
        stays: [
          { id: uid("s"), workerId: w1.id, dateIn: todayISO(), dateOut: null },
          { id: uid("s"), workerId: w2.id, dateIn: todayISO(), dateOut: null },
        ],
      },
      {
        id: uid("r"),
        code: "102",
        stays: [
          { id: uid("s"), workerId: w3.id, dateIn: todayISO(), dateOut: null },
        ],
      },
      { id: uid("r"), code: "103", stays: [] },
      { id: uid("r"), code: "104", stays: [] },
      { id: uid("r"), code: "105", stays: [] },
    ],
  };

  const f2 = {
    id: uid("f"),
    name: "Tầng 2",
    rooms: [
      { id: uid("r"), code: "201", stays: [] },
      { id: uid("r"), code: "202", stays: [] },
      { id: uid("r"), code: "203", stays: [] },
      { id: uid("r"), code: "204", stays: [] },
      { id: uid("r"), code: "205", stays: [] },
    ],
  };

  return {
    floors: [f1, f2],
    workers: [w1, w2, w3],
    settings: {
      adminPassword: "123456", // bạn có thể đổi trong phần Cài đặt (admin)
      siteName: "Quản lý KTX",
      roomGridCols: 3,
      maxOccupancyHint: 6,
    },
  };
};

// ---------------------------
// UI helpers
// ---------------------------
function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Pill({ icon: Icon, text, tone = "slate" }) {
  const toneMap = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        toneMap[tone] || toneMap.slate,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{text}</span>
    </span>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-base font-semibold">{title}</div>
          <button
            className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
        <div className="max-h-[78vh] overflow-auto px-4 pb-5">{children}</div>
        <div className="h-2" />
      </div>
    </div>
  );
}

function Confirm({
  open,
  title = "Xác nhận",
  message,
  confirmText = "Xóa",
  onCancel,
  onConfirm,
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-slate-400"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function Empty({ title, hint, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100">
        <DoorOpen className="h-6 w-6 text-slate-500" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{hint}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2",
        active ? "text-slate-900" : "text-slate-500",
      )}
    >
      <Icon className={clsx("h-5 w-5", active ? "" : "opacity-80")} />
      <span
        className={clsx("text-[11px] font-medium", active ? "" : "opacity-90")}
      >
        {label}
      </span>
    </button>
  );
}

// ---------------------------
// Main App
// ---------------------------
export default function App() {
  const [state, setState] = useState(() => loadState() || seed());
  const [auth, setAuth] = useState(() => loadAuth());
  const [tab, setTab] = useState("ktx"); // ktx | stats | workers | settings

  const [q, setQ] = useState("");
  const [floorId, setFloorId] = useState(() => state.floors?.[0]?.id || "");

  // dialogs
  const [roomModal, setRoomModal] = useState({
    open: false,
    floorId: null,
    roomId: null,
  });
  const [workerModal, setWorkerModal] = useState({
    open: false,
    workerId: null,
    roomCtx: null,
  });
  const [addFloorModal, setAddFloorModal] = useState(false);
  const [addRoomModal, setAddRoomModal] = useState(false);
  const [addWorkerModal, setAddWorkerModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [confirm, setConfirm] = useState({ open: false });
  const [recruiterModal, setRecruiterModal] = useState({
    open: false,
    recruiter: null,
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    saveAuth(auth);
  }, [auth]);

  useEffect(() => {
    // keep selected floor valid
    if (!state.floors.some((f) => f.id === floorId)) {
      setFloorId(state.floors?.[0]?.id || "");
    }
  }, [state.floors, floorId]);

  const workerById = useMemo(() => {
    const map = new Map();
    for (const w of state.workers) map.set(w.id, w);
    return map;
  }, [state.workers]);

  const floor = useMemo(
    () => state.floors.find((f) => f.id === floorId) || state.floors[0],
    [state.floors, floorId],
  );

  const globalMatches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return { workerIds: new Set(), roomIds: new Set() };

    const matchedWorkers = state.workers
      .filter((w) => w.fullName.toLowerCase().includes(query))
      .map((w) => w.id);

    const workerIdSet = new Set(matchedWorkers);

    const roomIdSet = new Set();
    for (const f of state.floors) {
      for (const r of f.rooms) {
        const current = r.stays.filter((s) => !s.dateOut);
        if (current.some((s) => workerIdSet.has(s.workerId)))
          roomIdSet.add(r.id);
      }
    }

    return { workerIds: workerIdSet, roomIds: roomIdSet };
  }, [q, state.workers, state.floors]);

  // ---------------------------
  // Mutations
  // ---------------------------
  function requireAdmin(action) {
    if (!auth.isAdmin) {
      setLoginModal(true);
      return;
    }
    action();
  }

  function addFloor(name) {
    const newFloor = {
      id: uid("f"),
      name: name.trim() || `Tầng ${state.floors.length + 1}`,
      rooms: [],
    };
    setState((s) => ({ ...s, floors: [...s.floors, newFloor] }));
    setFloorId(newFloor.id);
  }

  function deleteFloor(floorIdToDelete) {
    setState((s) => ({
      ...s,
      floors: s.floors.filter((f) => f.id !== floorIdToDelete),
    }));
  }

  function addRoom(toFloorId, code) {
    setState((s) => ({
      ...s,
      floors: s.floors.map((f) =>
        f.id === toFloorId
          ? {
              ...f,
              rooms: [
                ...f.rooms,
                {
                  id: uid("r"),
                  code: code.trim() || `${f.name}-${f.rooms.length + 1}`,
                  stays: [],
                },
              ],
            }
          : f,
      ),
    }));
  }

  // Rename room code/name
  function updateRoomCode(floorId, roomId, newCode) {
    const nextCode = (newCode || "").trim();
    if (!nextCode) {
      alert("Tên phòng không được để trống.");
      return;
    }

    setState((s) => ({
      ...s,
      floors: s.floors.map((f) => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.map((r) =>
            r.id === roomId ? { ...r, code: nextCode } : r,
          ),
        };
      }),
    }));
  }

  function deleteRoom(floorId, roomId) {
    setState((s) => ({
      ...s,
      floors: s.floors.map((f) =>
        f.id === floorId
          ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) }
          : f,
      ),
    }));
  }

  function addWorker(worker) {
    const w = { id: uid("w"), ...worker };
    setState((s) => ({ ...s, workers: [...s.workers, w] }));
    return w;
  }

  function updateWorker(workerId, patch) {
    setState((s) => ({
      ...s,
      workers: s.workers.map((w) =>
        w.id === workerId ? { ...w, ...patch } : w,
      ),
    }));
  }

  function deleteWorker(workerId) {
    // Only delete if not referenced by stays
    const referenced = state.floors.some((f) =>
      f.rooms.some((r) => r.stays.some((s) => s.workerId === workerId)),
    );
    if (referenced) {
      alert(
        "Không thể xóa NLĐ vì đang có lịch sử ở phòng. Hãy cho NLĐ rời đi và giữ lịch sử.",
      );
      return;
    }
    setState((s) => ({
      ...s,
      workers: s.workers.filter((w) => w.id !== workerId),
    }));
  }

  function checkInWorker({ floorId, roomId, workerId, dateIn }) {
    setState((s) => ({
      ...s,
      floors: s.floors.map((f) => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.map((r) => {
            if (r.id !== roomId) return r;
            // prevent duplicate current stay
            const already = r.stays.some(
              (st) => st.workerId === workerId && !st.dateOut,
            );
            if (already) return r;
            return {
              ...r,
              stays: [
                { id: uid("s"), workerId, dateIn, dateOut: null },
                ...r.stays,
              ],
            };
          }),
        };
      }),
    }));
  }

  function checkOutStay({ floorId, roomId, stayId, dateOut }) {
    setState((s) => ({
      ...s,
      floors: s.floors.map((f) => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          rooms: f.rooms.map((r) => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              stays: r.stays.map((st) =>
                st.id === stayId ? { ...st, dateOut } : st,
              ),
            };
          }),
        };
      }),
    }));
  }

  // ---------------------------
  // Derived
  // ---------------------------
  const allRooms = useMemo(
    () =>
      state.floors.flatMap((f) =>
        f.rooms.map((r) => ({ floorId: f.id, floorName: f.name, ...r })),
      ),
    [state.floors],
  );

  const stats = useMemo(() => {
    const buckets = new Map();
    for (const f of state.floors) {
      for (const r of f.rooms) {
        const n = r.stays.filter((s) => !s.dateOut).length;
        buckets.set(n, (buckets.get(n) || 0) + 1);
      }
    }
    const maxN = Math.max(3, ...Array.from(buckets.keys()));
    const rows = [];
    for (let i = 0; i <= maxN; i++)
      rows.push({ occupancy: i, rooms: buckets.get(i) || 0 });
    return rows;
  }, [state.floors]);

  const recruiterStats = useMemo(() => {
    const counts = new Map();
    for (const f of state.floors) {
      for (const r of f.rooms) {
        for (const st of r.stays) {
          if (st.dateOut) continue;
          const w = workerById.get(st.workerId);
          const key = (w?.recruiter || "(Chưa có)").trim() || "(Chưa có)";
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([recruiter, workers]) => ({ recruiter, workers }))
      .sort((a, b) => b.workers - a.workers);
  }, [state.floors, workerById]);

  const recruiterWorkersMap = useMemo(() => {
    // Map<recruiterName, Array<{workerId, fullName, hometown, floorName, roomCode, dateIn}>>
    const map = new Map();

    for (const f of state.floors) {
      for (const r of f.rooms) {
        for (const st of r.stays) {
          if (st.dateOut) continue; // chỉ NLĐ đang ở
          const w = workerById.get(st.workerId);
          if (!w) continue;

          const recruiter = (w.recruiter || "(Chưa có)").trim() || "(Chưa có)";
          const item = {
            workerId: w.id,
            fullName: w.fullName,
            hometown: w.hometown,
            recruiter,
            floorName: f.name,
            roomCode: r.code,
            dateIn: st.dateIn,
          };

          if (!map.has(recruiter)) map.set(recruiter, []);
          map.get(recruiter).push(item);
        }
      }
    }

    // sort mỗi nhóm theo tên
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
    }

    return map;
  }, [state.floors, workerById]);

  const totalRooms = useMemo(
    () => state.floors.reduce((sum, f) => sum + f.rooms.length, 0),
    [state.floors],
  );
  const totalCurrentWorkers = useMemo(() => {
    let n = 0;
    for (const f of state.floors)
      for (const r of f.rooms) n += r.stays.filter((s) => !s.dateOut).length;
    return n;
  }, [state.floors]);

  // ---------------------------
  // Export Excel
  // ---------------------------
  function exportExcel() {
    const roomsSheet = [];
    for (const f of state.floors) {
      for (const r of f.rooms) {
        const current = r.stays.filter((s) => !s.dateOut);
        roomsSheet.push({
          Tầng: f.name,
          Phòng: r.code,
          "Số NLĐ đang ở": current.length,
          "Danh sách NLĐ": current
            .map((s) => workerById.get(s.workerId)?.fullName)
            .filter(Boolean)
            .join(", "),
        });
      }
    }

    const workersSheet = state.workers.map((w) => ({
      "Họ tên": w.fullName,
      "Quê quán": w.hometown,
      "Người tuyển": w.recruiter,
    }));

    const staysSheet = [];
    for (const f of state.floors) {
      for (const r of f.rooms) {
        for (const st of r.stays) {
          const w = workerById.get(st.workerId);
          staysSheet.push({
            Tầng: f.name,
            Phòng: r.code,
            "Họ tên": w?.fullName || "(không rõ)",
            "Quê quán": w?.hometown || "",
            "Người tuyển": w?.recruiter || "",
            "Ngày vào": st.dateIn,
            "Ngày rời": st.dateOut || "",
            "Đang ở": st.dateOut ? "Không" : "Có",
          });
        }
      }
    }

    const statsSheet = stats.map((x) => ({
      "Số người/phòng": x.occupancy,
      "Số phòng": x.rooms,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(roomsSheet),
      "Phong",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(statsSheet),
      "Thong_ke",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(workersSheet),
      "NLD",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(staysSheet),
      "Lich_su_o",
    );

    const fileName = `KTX_${todayISO()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // ---------------------------
  // Views
  // ---------------------------
  const Header = (
    <div className="sticky top-0 z-40 bg-gradient-to-b from-white to-white/80 backdrop-blur">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {state.settings.siteName}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="text-lg font-semibold text-slate-900">
                {tab === "ktx"
                  ? "Sơ đồ phòng"
                  : tab === "stats"
                    ? "Thống kê"
                    : tab === "workers"
                      ? "Danh sách NLĐ"
                      : "Cài đặt"}
              </div>
              {auth.isAdmin ? (
                <Pill icon={Shield} text="Admin" tone="violet" />
              ) : (
                <Pill icon={Home} text="Xem" tone="slate" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab !== "settings" ? (
              <button
                className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                onClick={() => setSettingsModal(true)}
              >
                Cài đặt
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên NLĐ…"
            className="w-full bg-transparent text-sm outline-none"
          />
          {q ? (
            <button
              className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              onClick={() => setQ("")}
            >
              Xóa
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <Pill
                icon={Building2}
                text={`${state.floors.length} tầng`}
                tone="sky"
              />
              <div className="text-xs text-slate-500">Tổng</div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {totalRooms}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">Phòng</div>
          </div>
          <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <Pill icon={Users} text="Đang ở" tone="green" />
              <div className="text-xs text-slate-500">Tổng</div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {totalCurrentWorkers}
            </div>
            <div className="mt-0.5 text-xs text-slate-600">NLĐ</div>
          </div>
        </div>

        <div className="h-3" />
      </div>
    </div>
  );

  function RoomCard({ r, floorId }) {
    const current = r.stays.filter((s) => !s.dateOut);
    const count = current.length;
    const isMatched = q.trim() ? globalMatches.roomIds.has(r.id) : true;

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

        {q.trim() && isMatched ? (
          <div className="mt-2 line-clamp-2 text-xs text-slate-600">
            {current
              .map((s) => workerById.get(s.workerId)?.fullName)
              .filter(Boolean)
              .join(", ")}
          </div>
        ) : null}
      </button>
    );
  }

  function KtxView() {
    const cols = Math.min(4, Math.max(2, state.settings.roomGridCols || 3));

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
              auth.isAdmin
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700",
            )}
            onClick={() =>
              auth.isAdmin ? setAddRoomModal(true) : setLoginModal(true)
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
                onClick={() => setAddFloorModal(true)}
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
                  <button
                    className="text-left"
                    onClick={() => setFloorId(f.id)}
                  >
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
                      setConfirm({
                        open: true,
                        title: "Xóa tầng",
                        message: `Xóa ${f.name}? Tất cả phòng và lịch sử ở trong tầng này sẽ bị xóa.`,
                        confirmText: "Xóa tầng",
                        onConfirm: () => {
                          deleteFloor(f.id);
                          setConfirm({ open: false });
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
  }

  function StatsView() {
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
              onClick={() => exportExcel()}
            >
              <span className="inline-flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                Excel
              </span>
            </button>
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="occupancy"
                  tickFormatter={(value) => `${value} người`}
                />
                <Tooltip />
                <Bar dataKey="rooms" fill="#93c5fd" radius={[10, 10, 0, 0]}>
                  <LabelList dataKey="rooms" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {stats.map((s) => (
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
            <Pill
              icon={Users}
              text={`${recruiterStats.reduce((a, b) => a + b.workers, 0)} NLĐ`}
              tone="green"
            />
          </div>

          {recruiterStats.length ? (
            <div className="mt-3 space-y-2">
              {recruiterStats.map((x) => (
                <button
                  key={x.recruiter}
                  className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() =>
                    setRecruiterModal({ open: true, recruiter: x.recruiter })
                  }
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
            <div className="mt-3 text-sm text-slate-600">
              Chưa có NLĐ đang ở.
            </div>
          )}
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Gợi ý lọc</div>
              <div className="mt-1 text-xs text-slate-600">
                Dùng ô tìm kiếm ở trên để lọc theo tên NLĐ (tự làm mờ phòng
                không khớp).
              </div>
            </div>
            <Pill icon={Filter} text="Tìm nhanh" tone="sky" />
          </div>
        </div>
      </div>
    );
  }

  function WorkersView() {
    const query = q.trim().toLowerCase();
    const list = query
      ? state.workers.filter((w) => w.fullName.toLowerCase().includes(query))
      : state.workers;

    return (
      <div className="mx-auto w-full max-w-md px-4 pb-24">
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm"
            onClick={() => exportExcel()}
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
            onClick={() => requireAdmin(() => setAddWorkerModal(true))}
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
              .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
              .map((w) => (
                <button
                  key={w.id}
                  className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
                  onClick={() =>
                    setWorkerModal({
                      open: true,
                      workerId: w.id,
                      roomCtx: null,
                    })
                  }
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
                  onClick={() => requireAdmin(() => setAddWorkerModal(true))}
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

  // ---------------------------
  // Room modal
  // ---------------------------
  const roomCtx = useMemo(() => {
    if (!roomModal.open) return null;
    const f = state.floors.find((x) => x.id === roomModal.floorId);
    const r = f?.rooms.find((x) => x.id === roomModal.roomId);
    return f && r ? { floor: f, room: r } : null;
  }, [roomModal, state.floors]);

  function RoomModalContent() {
    const ctx = roomCtx;
    const [roomCodeEdit, setRoomCodeEdit] = useState("");
    const [isEditingRoomCode, setIsEditingRoomCode] = useState(false);

    useEffect(() => {
      if (ctx?.room?.code) setRoomCodeEdit(ctx.room.code);
      setIsEditingRoomCode(false);
    }, [ctx?.room?.id]);

    if (!ctx) return null;
    const { floor, room } = ctx;
    const current = room.stays.filter((s) => !s.dateOut);
    const history = room.stays.filter((s) => !!s.dateOut);

    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {floor.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                {!isEditingRoomCode ? (
                  <>
                    <div className="text-xl font-semibold text-slate-900">
                      Phòng {room.code}
                    </div>

                    {auth.isAdmin ? (
                      <button
                        className="grid h-9 w-9 place-items-center rounded-2xl bg-white/70 ring-1 ring-slate-200 hover:bg-white"
                        onClick={() => {
                          setRoomCodeEdit(room.code);
                          setIsEditingRoomCode(true);
                        }}
                        title="Sửa tên phòng"
                      >
                        <Pencil className="h-4 w-4 text-slate-600" />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="flex w-full items-center gap-2">
                    <input
                      value={roomCodeEdit}
                      onChange={(e) => setRoomCodeEdit(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      placeholder="Nhập tên phòng…"
                      autoFocus
                    />

                    <button
                      className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                      onClick={() => {
                        updateRoomCode(floor.id, room.id, roomCodeEdit);
                        setIsEditingRoomCode(false);
                      }}
                    >
                      Lưu
                    </button>

                    <button
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                      onClick={() => {
                        setRoomCodeEdit(room.code);
                        setIsEditingRoomCode(false);
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Pill
              icon={Users}
              text={`${current.length} đang ở`}
              tone={current.length ? "green" : "slate"}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                auth.isAdmin
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200",
              )}
              onClick={() =>
                requireAdmin(() => {
                  setWorkerModal({
                    open: true,
                    workerId: null,
                    roomCtx: { floorId: floor.id, roomId: room.id },
                  });
                })
              }
            >
              <span className="inline-flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                Thêm NLĐ vào phòng
              </span>
            </button>

            <button
              className={clsx(
                "rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                auth.isAdmin
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  : "bg-slate-100 text-slate-500",
              )}
              onClick={() =>
                requireAdmin(() =>
                  setConfirm({
                    open: true,
                    title: "Xóa phòng",
                    message: `Xóa phòng ${room.code}? Toàn bộ lịch sử ở phòng sẽ bị xóa.`,
                    confirmText: "Xóa phòng",
                    onConfirm: () => {
                      deleteRoom(floor.id, room.id);
                      setConfirm({ open: false });
                      setRoomModal({
                        open: false,
                        floorId: null,
                        roomId: null,
                      });
                    },
                  }),
                )
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">NLĐ trong phòng</div>
            <Pill icon={Calendar} text="Click NLĐ để xem" tone="sky" />
          </div>

          {current.length ? (
            current.map((st) => {
              const w = workerById.get(st.workerId);
              const matched = q.trim()
                ? globalMatches.workerIds.has(st.workerId)
                : true;
              return (
                <div
                  key={st.id}
                  className={clsx(
                    "rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100",
                    matched ? "" : "opacity-40",
                  )}
                >
                  <button
                    className="w-full text-left"
                    onClick={() =>
                      setWorkerModal({
                        open: true,
                        workerId: st.workerId,
                        roomCtx: {
                          floorId: floor.id,
                          roomId: room.id,
                          stayId: st.id,
                        },
                      })
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          {w?.fullName || "(không rõ)"}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Ngày vào: {st.dateIn}
                        </div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100">
                        <UserRound className="h-5 w-5 text-slate-600" />
                      </div>
                    </div>
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button
                      className={clsx(
                        "flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold",
                        auth.isAdmin
                          ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                          : "bg-slate-100 text-slate-500",
                      )}
                      onClick={() =>
                        requireAdmin(() =>
                          setConfirm({
                            open: true,
                            title: "Cho NLĐ rời đi",
                            message: `Xác nhận cho ${w?.fullName || "NLĐ"} rời phòng ${room.code} (ngày rời = hôm nay)?`,
                            confirmText: "Rời đi",
                            onConfirm: () => {
                              checkOutStay({
                                floorId: floor.id,
                                roomId: room.id,
                                stayId: st.id,
                                dateOut: todayISO(),
                              });
                              setConfirm({ open: false });
                            },
                          }),
                        )
                      }
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Rời đi
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <Empty
              title="Phòng đang trống"
              hint={
                auth.isAdmin
                  ? "Thêm NLĐ vào phòng bằng nút bên trên."
                  : "Bạn đang ở chế độ xem. Hãy đăng nhập để thay đổi."
              }
              action={
                <button
                  onClick={() =>
                    requireAdmin(() =>
                      setWorkerModal({
                        open: true,
                        workerId: null,
                        roomCtx: { floorId: floor.id, roomId: room.id },
                      }),
                    )
                  }
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Thêm NLĐ
                </button>
              }
            />
          )}
        </div>

        {history.length ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Lịch sử (đã rời đi)</div>
            <div className="space-y-2">
              {history.slice(0, 10).map((st) => {
                const w = workerById.get(st.workerId);
                return (
                  <button
                    key={st.id}
                    className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
                    onClick={() =>
                      setWorkerModal({
                        open: true,
                        workerId: st.workerId,
                        roomCtx: {
                          floorId: floor.id,
                          roomId: room.id,
                          stayId: st.id,
                        },
                      })
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {w?.fullName || "(không rõ)"}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {st.dateIn} → {st.dateOut}
                        </div>
                      </div>
                      <Pill icon={Calendar} text="Đã rời" tone="slate" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-500">
              Hiển thị tối đa 10 bản ghi gần nhất trong phòng.
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ---------------------------
  // Worker modal
  // ---------------------------
  const workerCtx = useMemo(() => {
    if (!workerModal.open) return null;
    const w = workerModal.workerId
      ? workerById.get(workerModal.workerId)
      : null;

    // find current room for worker (if any)
    let currentRoom = null;
    for (const f of state.floors) {
      for (const r of f.rooms) {
        const st = r.stays.find(
          (s) => s.workerId === workerModal.workerId && !s.dateOut,
        );
        if (st) {
          currentRoom = { floor: f, room: r, stay: st };
          break;
        }
      }
      if (currentRoom) break;
    }

    return { worker: w, currentRoom };
  }, [workerModal, workerById, state.floors]);

  function WorkerModalContent() {
    const ctx = workerCtx;
    const roomCtx2 = workerModal.roomCtx;

    const [fullName, setFullName] = useState(ctx?.worker?.fullName || "");
    const [hometown, setHometown] = useState(ctx?.worker?.hometown || "");
    const [recruiter, setRecruiter] = useState(ctx?.worker?.recruiter || "");
    const [dateIn, setDateIn] = useState(todayISO());
    const [pickWorkerId, setPickWorkerId] = useState(ctx?.worker?.id || "");

    // Reset fields when opening for different worker
    const lastIdRef = useRef(null);
    useEffect(() => {
      const id = ctx?.worker?.id || "__new__";
      if (lastIdRef.current !== id) {
        lastIdRef.current = id;
        setFullName(ctx?.worker?.fullName || "");
        setHometown(ctx?.worker?.hometown || "");
        setRecruiter(ctx?.worker?.recruiter || "");
        setPickWorkerId(ctx?.worker?.id || "");
        setDateIn(todayISO());
      }
    }, [ctx?.worker?.id]);

    if (!roomCtx2 && !ctx?.worker) {
      // should not happen
      return <div className="text-sm text-slate-600">Không tìm thấy NLĐ.</div>;
    }

    const isAssigning = !!roomCtx2 && !ctx?.worker; // opened from room to add occupant

    const canEdit = auth.isAdmin;

    const workerOptions = state.workers
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
      .map((w) => ({ value: w.id, label: w.fullName }));

    const assigningRoomLabel = roomCtx2
      ? (() => {
          const f = state.floors.find((x) => x.id === roomCtx2.floorId);
          const r = f?.rooms.find((x) => x.id === roomCtx2.roomId);
          return f && r ? `${f.name} • Phòng ${r.code}` : "";
        })()
      : "";

    return (
      <div className="space-y-4">
        {roomCtx2 ? (
          <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <div className="text-xs font-medium text-sky-700">
              Thao tác trong phòng
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              {assigningRoomLabel}
            </div>
          </div>
        ) : null}

        {isAssigning ? (
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Thêm NLĐ vào phòng</div>
            <div className="mt-2 space-y-3">
              <div className="rounded-2xl border border-dashed border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-600">
                  Hoặc tạo NLĐ mới
                </div>
                <div className="mt-2 space-y-3">
                  <TextField
                    label="Họ tên"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="VD: Nguyễn Văn A"
                  />
                  <TextField
                    label="Quê quán"
                    value={hometown}
                    onChange={setHometown}
                    placeholder="VD: Nghệ An"
                  />
                  <TextField
                    label="Người tuyển"
                    value={recruiter}
                    onChange={setRecruiter}
                    placeholder="VD: Chị Lan"
                  />
                </div>
              </div>

              <TextField
                label="Ngày vào"
                value={dateIn}
                onChange={setDateIn}
                type="date"
              />

              <button
                className={clsx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
                  canEdit
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500",
                )}
                onClick={() =>
                  requireAdmin(() => {
                    if (!fullName.trim()) {
                      alert("Vui lòng nhập Họ tên.");
                      return;
                    }
                    const w = addWorker({
                      fullName: fullName.trim(),
                      hometown: hometown.trim(),
                      recruiter: recruiter.trim(),
                    });
                    checkInWorker({
                      floorId: roomCtx2.floorId,
                      roomId: roomCtx2.roomId,
                      workerId: w.id,
                      dateIn: dateIn || todayISO(),
                    });
                    setWorkerModal({
                      open: false,
                      workerId: null,
                      roomCtx: null,
                    });
                  })
                }
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Thêm vào phòng
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Thông tin NLĐ</div>
                <div className="mt-1 text-xs text-slate-600">
                  Click để xem / (Admin) sửa
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100">
                <UserRound className="h-5 w-5 text-slate-600" />
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <TextField
                label="Họ tên"
                value={fullName}
                onChange={setFullName}
                placeholder=""
              />
              <TextField
                label="Quê quán"
                value={hometown}
                onChange={setHometown}
                placeholder=""
              />
              <TextField
                label="Người tuyển"
                value={recruiter}
                onChange={setRecruiter}
                placeholder=""
              />

              <div className="flex gap-2">
                <button
                  className={clsx(
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                    canEdit
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500",
                  )}
                  onClick={() =>
                    requireAdmin(() => {
                      if (!ctx?.worker?.id) return;
                      updateWorker(ctx.worker.id, {
                        fullName: fullName.trim(),
                        hometown: hometown.trim(),
                        recruiter: recruiter.trim(),
                      });
                      setWorkerModal((m) => ({ ...m }));
                    })
                  }
                >
                  Lưu
                </button>
                <button
                  className={clsx(
                    "rounded-2xl px-4 py-3 text-sm font-semibold",
                    canEdit
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                      : "bg-slate-100 text-slate-500",
                  )}
                  onClick={() =>
                    requireAdmin(() =>
                      setConfirm({
                        open: true,
                        title: "Xóa NLĐ",
                        message:
                          "Xóa NLĐ này? Chỉ xóa được khi NLĐ chưa có lịch sử ở phòng.",
                        confirmText: "Xóa NLĐ",
                        onConfirm: () => {
                          deleteWorker(ctx?.worker?.id);
                          setConfirm({ open: false });
                          setWorkerModal({
                            open: false,
                            workerId: null,
                            roomCtx: null,
                          });
                        },
                      }),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {ctx?.currentRoom ? (
          <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <div className="text-xs font-medium text-emerald-700">Đang ở</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              {ctx.currentRoom.floor.name} • Phòng {ctx.currentRoom.room.code}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Ngày vào: {ctx.currentRoom.stay.dateIn}
            </div>
          </div>
        ) : null}

        {workerModal.roomCtx?.stayId
          ? (() => {
              const f = state.floors.find(
                (x) => x.id === workerModal.roomCtx.floorId,
              );
              const r = f?.rooms.find(
                (x) => x.id === workerModal.roomCtx.roomId,
              );
              const st = r?.stays.find(
                (x) => x.id === workerModal.roomCtx.stayId,
              );
              if (!f || !r || !st) return null;
              return (
                <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="text-sm font-semibold">
                    Thông tin lượt ở (phòng {r.code})
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-xs text-slate-600">Ngày vào</div>
                      <div className="mt-1 text-sm font-semibold">
                        {st.dateIn}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-xs text-slate-600">Ngày rời</div>
                      <div className="mt-1 text-sm font-semibold">
                        {st.dateOut || "(đang ở)"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          : null}
      </div>
    );
  }

  // ---------------------------
  // Add modals
  // ---------------------------
  function AddFloorModal() {
    const [name, setName] = useState("");
    return (
      <Modal
        open={addFloorModal}
        title="Thêm tầng"
        onClose={() => setAddFloorModal(false)}
      >
        <div className="space-y-3">
          <TextField
            label="Tên tầng"
            value={name}
            onChange={setName}
            placeholder="VD: Tầng 3"
          />
          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={() =>
              requireAdmin(() => {
                addFloor(name);
                setAddFloorModal(false);
              })
            }
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Thêm tầng
            </span>
          </button>
        </div>
      </Modal>
    );
  }

  function AddRoomModal() {
    const [code, setCode] = useState("");
    return (
      <Modal
        open={addRoomModal}
        title="Thêm phòng"
        onClose={() => setAddRoomModal(false)}
      >
        <div className="space-y-3">
          <SelectField
            label="Tầng"
            value={floor?.id || ""}
            onChange={(v) => setFloorId(v)}
            options={state.floors.map((f) => ({ value: f.id, label: f.name }))}
          />
          <TextField
            label="Mã phòng"
            value={code}
            onChange={setCode}
            placeholder="VD: 106"
          />
          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={() =>
              requireAdmin(() => {
                addRoom(floor.id, code);
                setAddRoomModal(false);
              })
            }
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Thêm phòng
            </span>
          </button>
        </div>
      </Modal>
    );
  }

  function AddWorkerModal() {
    const [fullName, setFullName] = useState("");
    const [hometown, setHometown] = useState("");
    const [recruiter, setRecruiter] = useState("");

    return (
      <Modal
        open={addWorkerModal}
        title="Thêm NLĐ"
        onClose={() => setAddWorkerModal(false)}
      >
        <div className="space-y-3">
          <TextField
            label="Họ tên"
            value={fullName}
            onChange={setFullName}
            placeholder=""
          />
          <TextField
            label="Quê quán"
            value={hometown}
            onChange={setHometown}
            placeholder=""
          />
          <TextField
            label="Người tuyển"
            value={recruiter}
            onChange={setRecruiter}
            placeholder=""
          />
          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={() =>
              requireAdmin(() => {
                if (!fullName.trim()) {
                  alert("Vui lòng nhập Họ tên.");
                  return;
                }
                addWorker({
                  fullName: fullName.trim(),
                  hometown: hometown.trim(),
                  recruiter: recruiter.trim(),
                });
                setAddWorkerModal(false);
              })
            }
          >
            <span className="inline-flex items-center justify-center gap-2">
              <UserPlus className="h-4 w-4" />
              Thêm NLĐ
            </span>
          </button>
        </div>
      </Modal>
    );
  }

  function LoginModal() {
    const [pw, setPw] = useState("");
    return (
      <Modal
        open={loginModal}
        title="Đăng nhập"
        onClose={() => setLoginModal(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Quyền Admin</div>
            <div className="mt-1 text-xs text-slate-600">
              Đăng nhập để thêm / xóa / chỉnh sửa. Nếu không, bạn chỉ xem được
              dữ liệu.
            </div>
          </div>
          <TextField
            label="Mật khẩu"
            value={pw}
            onChange={setPw}
            placeholder="Nhập mật khẩu"
            type="password"
          />
          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              const ok = pw === state.settings.adminPassword;
              if (!ok) {
                alert("Sai mật khẩu.");
                return;
              }
              setAuth({ isAdmin: true });
              setLoginModal(false);
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </span>
          </button>

          {auth.isAdmin ? (
            <button
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
              onClick={() => {
                setAuth({ isAdmin: false });
                setLoginModal(false);
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </span>
            </button>
          ) : null}
        </div>
      </Modal>
    );
  }

  function SettingsModal() {
    const [siteName, setSiteName] = useState(state.settings.siteName);
    const [adminPassword, setAdminPassword] = useState(
      state.settings.adminPassword,
    );
    const [cols, setCols] = useState(String(state.settings.roomGridCols || 3));

    return (
      <Modal
        open={settingsModal}
        title="Cài đặt"
        onClose={() => setSettingsModal(false)}
      >
        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Giao diện</div>
            <div className="mt-3 space-y-3">
              <TextField
                label="Tên web"
                value={siteName}
                onChange={setSiteName}
                placeholder=""
              />
              <TextField
                label="Số cột ô phòng"
                value={cols}
                onChange={setCols}
                placeholder="2-4"
                type="number"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Bảo mật</div>
                <div className="mt-1 text-xs text-slate-600">
                  (Admin) Có thể đổi mật khẩu.
                </div>
              </div>
              <Pill
                icon={Shield}
                text={auth.isAdmin ? "Admin" : "Xem"}
                tone={auth.isAdmin ? "violet" : "slate"}
              />
            </div>
            <div className="mt-3 space-y-3">
              <TextField
                label="Mật khẩu Admin"
                value={adminPassword}
                onChange={setAdminPassword}
                placeholder=""
                type="password"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
                auth.isAdmin
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500",
              )}
              onClick={() =>
                requireAdmin(() => {
                  const nCols = Math.min(4, Math.max(2, Number(cols || 3)));
                  setState((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      siteName: siteName || "Quản lý KTX",
                      adminPassword: adminPassword || "123456",
                      roomGridCols: nCols,
                    },
                  }));
                  setSettingsModal(false);
                })
              }
            >
              Lưu cài đặt
            </button>

            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
              onClick={() => {
                setAuth({ isAdmin: false });
                setSettingsModal(false);
              }}
            >
              Đăng xuất
            </button>
          </div>

          <div className="rounded-3xl bg-rose-50 p-4 ring-1 ring-rose-100">
            <div className="text-sm font-semibold text-rose-800">Dữ liệu</div>
            <div className="mt-1 text-xs text-rose-700">
              Dữ liệu hiện lưu trong trình duyệt (LocalStorage). Khi đổi máy
              hoặc xóa cache sẽ mất.
            </div>
            <div className="mt-3">
              <button
                className={clsx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
                  auth.isAdmin
                    ? "bg-rose-600 text-white"
                    : "bg-rose-100 text-rose-400",
                )}
                onClick={() =>
                  requireAdmin(() =>
                    setConfirm({
                      open: true,
                      title: "Reset dữ liệu",
                      message:
                        "Reset sẽ xóa toàn bộ dữ liệu hiện tại và tạo dữ liệu mẫu lại từ đầu.",
                      confirmText: "Reset",
                      onConfirm: () => {
                        const s = seed();
                        setState(s);
                        setConfirm({ open: false });
                        setSettingsModal(false);
                      },
                    }),
                  )
                }
              >
                Reset dữ liệu
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {Header}

      {tab === "ktx" ? (
        <KtxView />
      ) : tab === "stats" ? (
        <StatsView />
      ) : tab === "workers" ? (
        <WorkersView />
      ) : (
        <div className="mx-auto w-full max-w-md px-4 pb-24">
          Mở Cài đặt ở góc phải.
        </div>
      )}

      {/* bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-4 pb-4">
          <div className="grid grid-cols-3 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
            <TabButton
              icon={Home}
              label="KTX"
              active={tab === "ktx"}
              onClick={() => setTab("ktx")}
            />
            <TabButton
              icon={BarChart3}
              label="Thống kê"
              active={tab === "stats"}
              onClick={() => setTab("stats")}
            />
            <TabButton
              icon={UserRound}
              label="NLĐ"
              active={tab === "workers"}
              onClick={() => setTab("workers")}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={roomModal.open}
        title="Chi tiết phòng"
        onClose={() =>
          setRoomModal({ open: false, floorId: null, roomId: null })
        }
      >
        <RoomModalContent />
      </Modal>
      <Modal
        open={recruiterModal.open}
        title={`NLĐ theo người tuyển: ${recruiterModal.recruiter || ""}`}
        onClose={() => setRecruiterModal({ open: false, recruiter: null })}
      >
        {(() => {
          const key = recruiterModal.recruiter;
          const list = key ? recruiterWorkersMap.get(key) || [] : [];

          if (!key)
            return (
              <div className="text-sm text-slate-600">Không có dữ liệu.</div>
            );

          if (!list.length)
            return (
              <div className="text-sm text-slate-600">
                Chưa có NLĐ đang ở thuộc người tuyển này.
              </div>
            );

          return (
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
                  onClick={() => {
                    // mở modal NLĐ luôn (xem chi tiết)
                    setWorkerModal({
                      open: true,
                      workerId: it.workerId,
                      roomCtx: null,
                    });
                  }}
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
          );
        })()}
      </Modal>
      <Modal
        open={workerModal.open}
        title={
          workerModal.workerId
            ? "Chi tiết NLĐ"
            : workerModal.roomCtx
              ? "Thêm NLĐ"
              : "NLĐ"
        }
        onClose={() =>
          setWorkerModal({ open: false, workerId: null, roomCtx: null })
        }
      >
        <WorkerModalContent />
      </Modal>

      <AddFloorModal />
      <AddRoomModal />
      <AddWorkerModal />
      <LoginModal />
      <SettingsModal />

      <Confirm
        open={!!confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        onCancel={() => setConfirm({ open: false })}
        onConfirm={() => {
          confirm.onConfirm?.();
        }}
      />

      {/* floating login button (view mode) */}
      {!auth.isAdmin ? (
        <button
          className="fixed right-4 top-[86px] z-40 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
          onClick={() => setLoginModal(true)}
        >
          <span className="inline-flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </span>
        </button>
      ) : null}

      <div className="h-10" />
    </div>
  );
}
