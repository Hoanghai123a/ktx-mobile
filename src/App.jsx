import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  FileUp,
  FileDown,
  Shield,
  Home,
  BarChart3,
  UserRound,
  Users,
  LogIn,
  LogOut,
  Building2,
  DoorClosed,
  DoorOpen,
  Plus,
  Trash2,
  Filter,
  ChevronDown,
  Calendar,
  UserPlus,
  UserMinus,
  Pencil,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  CreditCard,
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
// UI (App.jsx thường chỉ còn 2 cái này)
import Confirm from "./components/ui/Confirm";
import TabButton from "./components/ui/TabButton";

// Services
import { importExcelFileToDb } from "./services/excelImportService";
import { exportExcel as exportExcelSvc } from "./services/excelExportService";
import Pill from "./components/ui/Pill";
import { DEFAULT_SETTINGS } from "./constants/defaultSettings";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { loadPersistedState, savePersistedState } from "./services/persistence";

const LoginModal = lazy(() => import("./features/auth/LoginModal"));
const DeleteGuardModal = lazy(
  () => import("./features/settings/DeleteGuardModal"),
);
const SettingsModal = lazy(() => import("./features/settings/SettingsModal"));
const KtxView = lazy(() => import("./features/ktx/KtxView"));
const RoomModal = lazy(() => import("./features/ktx/RoomModal"));
const WorkerModal = lazy(() => import("./features/ktx/WorkerModal"));
const AddFloorModal = lazy(() => import("./features/ktx/AddFloorModal"));
const AddRoomModal = lazy(() => import("./features/ktx/AddRoomModal"));
const ImportExcelModal = lazy(() => import("./features/ktx/ImportExcelModal"));
const InitKtxModal = lazy(() => import("./features/ktx/InitKtxModal"));
const ElectricityHistoryModal = lazy(
  () => import("./features/ktx/ElectricityHistoryModal"),
);
const StaysHistoryModal = lazy(
  () => import("./features/ktx/StaysHistoryModal"),
);
const WorkersView = lazy(() => import("./features/workers/WorkersView"));
const AddWorkerModal = lazy(() => import("./features/workers/AddWorkerModal"));
const StatsView = lazy(() => import("./features/stats/StatsView"));
const RecruiterModal = lazy(() => import("./features/stats/RecruiterModal"));
const AboutView = lazy(() => import("./features/about/AboutView"));

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputRef,
  onFocus,
  onBlur,
  onKeyDown,
  disabled = false,
}) {
  return (
    <label className="block space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        ref={inputRef}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
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

function LazyFallback() {
  return <div className="px-4 py-6 text-sm text-slate-500">Đang tải...</div>;
}

import { useAuth } from "./contexts/AuthContext";
import {
  dataLoader,
  workerService,
  roomService,
  floorService,
  stayService,
  electricityService,
  settingsService,
} from "./services/api-services";
import { message } from "antd";

// ... existing imports ...

// ---------------------------
// Main App
// ---------------------------
export default function App() {
  const { user, token, logout: authLogout } = useAuth();
  const [state, setState] = useState(() => loadPersistedState());
  const [auth, setAuth] = useState({ isAdmin: false });

  // Sync auth state with AuthContext
  useEffect(() => {
    if (user) {
      setAuth({ isAdmin: true, user });
    } else {
      setAuth({ isAdmin: false, user: null });
    }
  }, [user]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [tab, setTab] = useState("ktx"); // ktx | stats | workers | settings

  const [q, setQ] = useState("");
  const [floorId, setFloorId] = useState(() => state.floors?.[0]?.id || "");

  const [deletePassModal, setDeletePassModal] = useState({
    open: false,
    title: "",
    message: "",
    onDelete: null,
  });
  const [deletePass, setDeletePass] = useState("");
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Xóa",
    onConfirm: null,
  });

  useEffect(() => {
    const t = setTimeout(() => savePersistedState(state), 150);
    return () => clearTimeout(t);
  }, [state]);
  // ---------------------------
  // Settings persistence (Supabase)
  // Table: app_settings (id=1, data=jsonb)
  // ---------------------------

  const loadAllFromDb = useCallback(async () => {
    try {
      // Ưu tiên gọi API Backend mới
      console.log(
        "🚀 [DATABASE] Đang kết nối tới: BACKEND API (Node.js + Postgres)",
      );
      const data = await dataLoader.loadAll(token);
      if (data) {
        setState((s) => ({ ...s, ...data }));
        setFloorId((prev) => prev || data.floors?.[0]?.id || "");
      }
    } catch (err) {
      // Nếu là lỗi 401 (token hết hạn), xóa token cũ và thử tải lại như khách
      if (err?.response?.status === 401) {
        if (token) {
          dataLoader.removeToken();
          setToken(null);
        }
        console.log("Chế độ khách: Đang chờ đăng nhập hoặc dữ liệu công khai.");
      } else {
        console.error("Lỗi kết nối hệ thống:", err);
      }
    }
  }, [token]);

  useAppBootstrap({
    loadAllFromDb,
    setState,
    setAuth,
    defaultSettings: DEFAULT_SETTINGS,
    token, // Pass token here
  });

  const saveSettingsToDb = useCallback(
    async (nextSettings) => {
      if (!token) throw new Error("Unauthorized");
      return await settingsService.update(nextSettings, token);
    },
    [token],
  );

  const [initModal, setInitModal] = useState({
    open: false,
    floors: 3,
    roomsPerFloor: 7,
    startNo: 101,
  });

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
  const [staysHistoryOpen, setStaysHistoryOpen] = useState(false);
  const [recruiterModal, setRecruiterModal] = useState({
    open: false,
    recruiter: "",
  });
  const [electricityHistoryOpen, setElectricityHistoryOpen] = useState(false);
  const [electricityHistoryMode, setElectricityHistoryMode] = useState("all"); // "paid"|"pending"
  const billingMonth = state.settings?.billingMonth || "";

  const openHistory = (mode) => {
    setElectricityHistoryMode(mode);
    setElectricityHistoryOpen(true);
  };

  // transfer dialog state (mirrors app-gộp logic)
  const [transferModal, setTransferModal] = useState({
    open: false,
    stayId: null,
    workerId: null,
    fromRoomId: null,
    toRoomId: "",
    date: todayISO(),
  });

  const [importModal, setImportModal] = useState({
    open: false,
    busy: false,
    result: null, // { total, workersInserted, workersUpdated, staysInserted, skipped, errors: [] }
  });

  const importFileRef = useRef(null);

  const handleImportExcel = useCallback(
    async (file) => {
      if (!file) return;
      if (!auth.isAdmin) {
        setLoginModal(true);
        return;
      }

      setImportModal({ open: true, busy: true, result: null });
      try {
        const result = await importExcelFileToDb(file, token);
        setImportModal((m) => ({ ...m, busy: false, result }));
        await loadAllFromDb(); // Tải lại dữ liệu sau khi nhập

        setTab("ktx"); // Chuyển về tab KTX
        setSettingsModal(false); // Đóng SettingsModal
        alert("Nhập Excel thành công!");
      } catch (error) {
        console.error("❌ Lỗi khi nhập Excel:", error);
        alert("Lỗi khi nhập Excel. Vui lòng xem console để biết chi tiết.");
        setImportModal((m) => ({ ...m, busy: false, result: null }));
      }
    },
    [auth.isAdmin, token, loadAllFromDb],
  );

  // ...

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
      .filter((w) => {
        const name = (w.fullName || "").toLowerCase();
        const code = (w.employeeCode || "").toLowerCase();
        return name.includes(query) || code.includes(query);
      })
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

  async function importExcelFile(file) {
    if (!file) return;
    if (!auth.isAdmin) return setLoginModal(true);

    // ensure modal visible when starting
    setImportModal((m) => ({ ...m, open: true, busy: true, result: null }));
    try {
      const result = await importExcelFileToDb(file, token);
      setImportModal((m) => ({ ...m, busy: false, result }));
      await loadAllFromDb();

      setTab("ktx");
      setSettingsModal(false);
      setImportModal((m) => ({ ...m, open: false, busy: false, result: null }));

      alert("Nhập Excel thành công!");
    } catch (e) {
      setImportModal((m) => ({ ...m, busy: false }));
      alert("Nhập Excel lỗi: " + (e?.message || String(e)));
    }
  }

  // ---------------------------
  // Mutations
  // ---------------------------
  function requireAdmin(action) {
    if (!auth.isAdmin) {
      setLoginModal(true);
      return;
    }
    // allow async actions too
    action();
  }

  const handleLogout = useCallback(() => {
    authLogout?.();
    setState({
      floors: [],
      workers: [],
      settings: DEFAULT_SETTINGS,
    });
    setFloorId("");
    setTab("ktx");
  }, [authLogout]);

  async function addFloor(name) {
    try {
      const floorName =
        (name || "").trim() || `Tầng ${state.floors.length + 1}`;
      const sort = state.floors.length + 1;

      if (!token) return setLoginModal(true);
      const created = await floorService.create(
        { name: floorName, sort },
        token,
      );
      await loadAllFromDb();
      if (created?.id) setFloorId(created.id);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteFloor(floorId) {
    try {
      if (!token) return setLoginModal(true);
      await floorService.delete(floorId, token);
      await loadAllFromDb();
      setFloorId((prev) => (prev === floorId ? "" : prev));
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function addRoom(floorId, code) {
    try {
      const floor = state.floors.find((f) => f.id === floorId);
      const sort = (floor?.rooms?.length || 0) + 1;
      const roomCode = (code || "").trim() || String(sort);

      if (!token) return setLoginModal(true);
      await roomService.create(
        { floor_id: floorId, code: roomCode, sort },
        token,
      );
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function updateRoomCode(floorId, roomId, newCode) {
    try {
      const nextCode = (newCode || "").trim();
      if (!nextCode) return alert("Tên phòng không được để trống.");

      if (!token) return setLoginModal(true);
      await roomService.update(roomId, { code: nextCode }, token);
      await loadAllFromDb();
      return true;
    } catch (e) {
      if (e?.response?.status === 404) {
        await loadAllFromDb();
        alert("Phòng không còn tồn tại (dữ liệu đã thay đổi). Đã đồng bộ lại.");
        return false;
      }
      alert(e.message || String(e));
      return false;
    }
  }

  async function updateRoom(roomId, patch) {
    try {
      if (!token) return setLoginModal(true);
      const nextPatch = { ...(patch || {}) };

      console.log("updateRoom initiating:", { roomId, nextPatch });

      if (Object.prototype.hasOwnProperty.call(nextPatch, "code")) {
        const c = String(nextPatch.code || "").trim();
        if (!c) return alert("Tên phòng không được để trống.");
        nextPatch.code = c;
      }

      if (Object.prototype.hasOwnProperty.call(nextPatch, "gender")) {
        const g = nextPatch.gender;
        if (g !== null && g !== "male" && g !== "female") {
          return alert("Giới tính phòng không hợp lệ.");
        }
      }

      const res = await roomService.update(roomId, nextPatch, token);
      console.log("updateRoom API success:", res);

      await loadAllFromDb();
      console.log("updateRoom state refreshed");
      return true;
    } catch (e) {
      if (e?.response?.status === 404) {
        await loadAllFromDb();
        alert("Phòng không còn tồn tại (dữ liệu đã thay đổi). Đã đồng bộ lại.");
        return false;
      }
      alert(e.message || String(e));
      return false;
    }
  }

  async function deleteRoom(floorId, roomId) {
    try {
      if (!token) return setLoginModal(true);
      await roomService.delete(roomId, token);
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function addWorker(worker) {
    try {
      if (!token) return null;
      const res = await workerService.create(
        {
          employee_code: worker.employeeCode,
          full_name: worker.fullName,
          hometown: worker.hometown,
          phone: worker.phone,
          dob: worker.dob,
          recruiter: worker.recruiter,
          note: worker.note,
        },
        token,
      );
      await loadAllFromDb();
      message.success("Thêm NLĐ thành công.");
      return res;
    } catch (e) {
      // message error shown by api interceptor
      return null;
    }
  }

  const lookupWorkerByCode = useCallback(
    async (code) => {
      if (!token) throw new Error("Unauthorized");
      const normalized = String(code || "")
        .trim()
        .toUpperCase();
      if (!normalized) return null;
      const row = await workerService.getByEmployeeCode(normalized, token);
      if (!row) return null;
      return {
        id: row.id,
        employeeCode: row.employee_code || row.employeeCode || normalized,
        fullName: row.full_name || row.fullName || "",
        hometown: row.hometown || "",
        recruiter: row.recruiter || "",
        dob: row.dob || "",
        phone: row.phone || "",
        note: row.note || "",
      };
    },
    [token],
  );

  async function updateWorker(workerId, patch) {
    try {
      if (!token) return setLoginModal(true);
      const mappedPatch = {};

      const fieldMap = {
        employeeCode: "employee_code",
        fullName: "full_name",
        hometown: "hometown",
        phone: "phone",
        dob: "dob",
        recruiter: "recruiter",
        note: "note",
      };

      Object.keys(fieldMap).forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
          mappedPatch[fieldMap[k]] = patch[k] || null;
        }
      });

      if (Object.keys(mappedPatch).length === 0) return true;

      // Chờ cập nhật và load lại dữ liệu xong
      await workerService.update(workerId, mappedPatch, token);
      await loadAllFromDb();
      return true;
    } catch (e) {
      console.error("Lỗi updateWorker:", e);
      return false;
    }
  }

  async function deleteWorker(workerId) {
    try {
      if (!token) return setLoginModal(true);
      await workerService.delete(workerId, token);
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function checkInWorker({ roomId, workerId, dateIn }) {
    try {
      const d = dateIn || todayISO();
      if (!token) return setLoginModal(true);
      await stayService.create(
        { room_id: roomId, worker_id: workerId, date_in: d },
        token,
      );
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function checkOutStay({ stayId, dateOut }) {
    try {
      const d = dateOut || todayISO();
      if (!token) return setLoginModal(true);
      await stayService.update(stayId, { date_out: d }, token);
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function transferWorker({ stayId, workerId, toRoomId, transferDate }) {
    try {
      const d = transferDate || todayISO();
      if (!token) return setLoginModal(true);
      await stayService.update(stayId, { date_out: d }, token);
      await stayService.create(
        { room_id: toRoomId, worker_id: workerId, date_in: d },
        token,
      );
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
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

  const roomById = useMemo(() => {
    const m = new Map();
    for (const f of state.floors) {
      for (const r of f.rooms) m.set(r.id, r);
    }
    return m;
  }, [state.floors]);

  const occupiedWorkerIds = useMemo(() => {
    const set = new Set();
    for (const f of state.floors) {
      for (const r of f.rooms) {
        for (const st of r.stays) {
          if (!st.dateOut) set.add(st.workerId);
        }
      }
    }
    return set;
  }, [state.floors]);

  const staysByWorkerId = useMemo(() => {
    const m = new Map();
    for (const f of state.floors) {
      for (const r of f.rooms) {
        for (const st of r.stays) {
          const arr = m.get(st.workerId) || [];
          // Ensure roomId is always set
          arr.push({
            ...st,
            roomId: st.roomId || r.id,
          });
          m.set(st.workerId, arr);
        }
      }
    }
    return m;
  }, [state.floors]);

  const allStays = useMemo(() => {
    return state.floors.flatMap((f) =>
      f.rooms.flatMap((r) =>
        (r.stays || []).map((s) => ({ ...s, roomId: s.roomId || r.id })),
      ),
    );
  }, [state.floors]);

  // electricity records flattened
  const allElectricity = useMemo(() => {
    return state.floors.flatMap((f) =>
      f.rooms.map((r) => {
        const list = Array.isArray(r.electricity) ? r.electricity : [];
        const byMonth = billingMonth
          ? list.find((e) => e?.month === billingMonth)
          : null;
        const latest = list[0] || null;
        return {
          roomId: r.id,
          roomCode: r.code,
          electricity: byMonth || latest,
          electricityList: list,
        };
      }),
    );
  }, [state.floors, billingMonth]);

  const pendingElectricity = useMemo(() => {
    return allElectricity.filter((x) => {
      const e = x.electricity;
      return (
        e &&
        !e.paid &&
        e.month === state.settings.billingMonth &&
        e.start_reading != null &&
        e.end_reading != null
      );
    });
  }, [allElectricity, state.settings.billingMonth]);

  const paidElectricity = useMemo(() => {
    return allElectricity.filter((x) => {
      const e = x.electricity;
      return e && e.paid && e.month === state.settings.billingMonth;
    });
  }, [allElectricity, state.settings.billingMonth]);

  const electricityHistoryRecords = useMemo(() => {
    const month = state.settings.billingMonth;
    const rows = [];
    for (const x of allElectricity) {
      const list = Array.isArray(x.electricityList) ? x.electricityList : [];
      for (const e of list) {
        if (month && e?.month !== month) continue;
        if (electricityHistoryMode === "paid" && !e?.paid) continue;
        if (electricityHistoryMode === "pending" && e?.paid) continue;
        rows.push({ roomId: x.roomId, roomCode: x.roomCode, electricity: e });
      }
    }
    return rows;
  }, [allElectricity, electricityHistoryMode, state.settings.billingMonth]);

  const pendingElectricityCount = pendingElectricity.length;
  const pendingElectricityAmount = pendingElectricity.reduce((sum, x) => {
    const e = x.electricity;
    const used = Number(e.end_reading || 0) - Number(e.start_reading || 0);
    return sum + Math.max(0, used) * (state.settings.electricityPrice || 0);
  }, 0);

  const paidElectricityCount = paidElectricity.length;
  const paidElectricityAmount = paidElectricity.reduce((sum, x) => {
    const e = x.electricity;
    const used = Number(e.end_reading || 0) - Number(e.start_reading || 0);
    return sum + Math.max(0, used) * (state.settings.electricityPrice || 0);
  }, 0);

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
            employeeCode: w.employeeCode || "",
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
    for (const arr of map.values()) {
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
    exportExcelSvc({
      floors: state.floors,
      workers: state.workers,
      workerById,
      stats,
      todayISO,
    });
  }
  function guardDelete({ title, message, onDelete }) {
    if (!auth.isAdmin) return setLoginModal(true);

    if (!state.settings.canDeleteStructure) {
      alert("Chức năng xóa tầng/phòng đang bị tắt trong Cài đặt.");
      return;
    }

    // nếu không bắt password thì đi thẳng Confirm như cũ
    if (!state.settings.requirePasswordOnDelete) {
      setConfirm({
        open: true,
        title,
        message,
        confirmText: "Xóa",
        onConfirm: async () => {
          await onDelete();
          setConfirm({ open: false });
        },
      });
      return;
    }

    // nếu bắt password: mở modal nhập mật khẩu
    setDeletePassModal({
      open: true,
      title,
      message,
      onDelete,
    });
  }

  async function initKtxFromInputs(payload) {
    try {
      if (!token) return false;
      await dataLoader.initKtx(payload, token);
      await loadAllFromDb();
      alert("Khởi tạo KTX thành công!");
      return true;
    } catch (e) {
      alert(e.message || String(e));
      return false;
    }
  }

  async function wipeDatabase() {
    try {
      if (!token) return setLoginModal(true);
      await dataLoader.wipeDatabase(token);
      await loadAllFromDb();
      alert("Đã xóa sạch dữ liệu.");
    } catch (e) {
      alert(e.message || String(e));
    }
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
            {auth.isAdmin ? (
              <button
                className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            ) : (
              <button
                className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                onClick={() => setLoginModal(true)}
              >
                <LogIn className="h-3.5 w-3.5" />
                Đăng nhập
              </button>
            )}
            {tab !== "settings" ? (
              <button
                className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
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

  // ---------------------------
  // Room modal
  // ---------------------------
  const roomCtx = useMemo(() => {
    if (!roomModal.open) return null;
    const f = state.floors.find((x) => x.id === roomModal.floorId);
    const r = f?.rooms.find((x) => x.id === roomModal.roomId);
    return f && r ? { floor: f, room: r } : null;
  }, [roomModal.open, roomModal.floorId, roomModal.roomId, state.floors]);

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

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {Header}
      <Suspense fallback={<LazyFallback />}>
        {tab === "ktx" ? (
          <KtxView
            state={state}
            auth={auth}
            floorId={floorId}
            setFloorId={setFloorId}
            q={q}
            globalMatches={globalMatches}
            workerById={workerById}
            setRoomModal={setRoomModal}
            exportExcel={exportExcel}
            requireAdmin={requireAdmin}
            setInitModal={setInitModal}
            setAddRoomModal={setAddRoomModal}
            setLoginModal={setLoginModal}
            setAddFloorModal={setAddFloorModal}
            guardDelete={guardDelete}
            deleteFloor={deleteFloor}
          />
        ) : null}
        {tab === "workers" ? (
          <WorkersView
            state={state}
            q={q}
            auth={auth}
            exportExcel={exportExcel}
            requireAdmin={requireAdmin}
            setAddWorkerModal={setAddWorkerModal}
            setWorkerModal={setWorkerModal}
            floors={state.floors}
            roomById={roomById}
          />
        ) : null}
        {tab === "stats" ? (
          <StatsView
            stats={stats}
            recruiterStats={recruiterStats}
            setRecruiterModal={setRecruiterModal}
            exportExcel={exportExcel}
            openStaysHistory={() => setStaysHistoryOpen(true)}
            pendingElectricityCount={pendingElectricityCount}
            pendingElectricityAmount={pendingElectricityAmount}
            paidElectricityCount={paidElectricityCount}
            paidElectricityAmount={paidElectricityAmount}
            openElectricityHistory={openHistory}
          />
        ) : null}
        {tab === "about" ? <AboutView about={state.settings?.about} /> : null}
      </Suspense>
      {/* bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-4 pb-4">
          <div className="grid grid-cols-4 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
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
            <TabButton
              icon={Users}
              label="Về chúng tôi"
              active={tab === "about"}
              onClick={() => setTab("about")}
            />
          </div>
        </div>
      </div>
      {/* Modals */}
      {/* RoomModal - component tách file */}
      {roomModal.open ? (
        <Suspense fallback={null}>
          <RoomModal
            key={`room-modal-${roomModal.roomId}-${roomCtx?.room?.gender}`}
            open={roomModal.open}
            onClose={() =>
              setRoomModal({ open: false, floorId: "", roomId: "" })
            }
            floor={roomCtx?.floor || null}
            room={roomCtx?.room || null}
            workerById={workerById}
            workers={state.workers}
            occupiedWorkerIds={occupiedWorkerIds}
            auth={auth}
            requireAdmin={requireAdmin}
            actions={{
              updateRoom: async (roomId, patch) => {
                if (!roomCtx?.floor?.id) return;

                // If the first argument is an object, it's the old style call: { roomId, patch }
                let actualRoomId = roomId;
                let actualPatch = patch;

                if (typeof roomId === "object" && roomId !== null && !patch) {
                  actualRoomId = roomId.roomId;
                  actualPatch = roomId.patch;
                }

                console.log("App actions.updateRoom calling:", {
                  actualRoomId,
                  actualPatch,
                });

                if (
                  Object.prototype.hasOwnProperty.call(
                    actualPatch || {},
                    "code",
                  )
                ) {
                  return await updateRoomCode(
                    roomCtx.floor.id,
                    actualRoomId,
                    actualPatch?.code || "",
                  );
                }
                return await updateRoom(actualRoomId, actualPatch || {});
              },
              deleteRoom: async ({ roomId }) => {
                if (!roomCtx?.floor?.id) return;
                await deleteRoom(roomCtx.floor.id, roomId);
                setRoomModal({ open: false, floorId: "", roomId: "" });
              },
              checkOut: async ({ stayId, dateOut }) => {
                await checkOutStay({ stayId, dateOut: dateOut || todayISO() });
              },
              // new manual check-in actions
              addWorker: async (w) => {
                return await addWorker(w);
              },
              updateWorker: async ({ workerId, patch }) => {
                return await updateWorker(workerId, patch || {});
              },
              checkIn: async ({ floorId, roomId, workerId, dateIn }) => {
                await checkInWorker({ floorId, roomId, workerId, dateIn });
              },
              onViewWorker: (workerId) => {
                setWorkerModal({ open: true, workerId, roomCtx: null });
              },
              guardDelete,
              transfer: ({ stayId, workerId }) => {
                // open transfer modal with current room context
                const fromRoomId = roomCtx?.room?.id || roomModal.roomId;
                setTransferModal({
                  open: true,
                  stayId,
                  workerId,
                  fromRoomId,
                  toRoomId: "",
                  date: todayISO(),
                });
              },
              electricityPrice: state.settings.electricityPrice,
              billingMonth: state.settings.billingMonth,
              upsertElectricity: async (rec) => {
                try {
                  if (!token) return setLoginModal(true);
                  await electricityService.upsert(
                    {
                      id: rec.id,
                      room_id: rec.roomId || roomCtx?.room?.id,
                      month: rec.month,
                      start_reading: rec.start_reading ?? rec.startReading ?? 0,
                      end_reading: rec.end_reading ?? rec.endReading ?? 0,
                      paid: !!rec.paid,
                    },
                    token,
                  );
                  await loadAllFromDb();
                } catch (e) {
                  alert(e.message || String(e));
                }
              },
              markElectricityPaid: async (rec) => {
                try {
                  if (!token) return setLoginModal(true);
                  await electricityService.markPaid(rec.id, token);
                  await loadAllFromDb();
                } catch (e) {
                  alert(e.message || String(e));
                }
              },
            }}
          />
        </Suspense>
      ) : null}

      {/* WorkerModal - component tách file */}
      {workerModal.open ? (
        <Suspense fallback={null}>
          <WorkerModal
            open={workerModal.open}
            onClose={() =>
              setWorkerModal({ open: false, workerId: null, roomCtx: null })
            }
            worker={workerCtx?.worker || null}
            stays={
              workerModal.workerId
                ? staysByWorkerId.get(workerModal.workerId) || []
                : []
            }
            roomById={roomById}
            auth={auth}
            requireAdmin={requireAdmin}
            actions={{
              updateWorker: async ({ workerId, patch }) => {
                return await updateWorker(workerId, patch || {});
              },
              deleteWorker: async ({ workerId }) => {
                await deleteWorker(workerId);
                setWorkerModal({ open: false, workerId: null, roomCtx: null });
              },
            }}
          />
        </Suspense>
      ) : null}

      {/* Transfer modal (pickup from app-gộp) */}
      <Modal
        open={transferModal.open}
        title="Chuyển phòng"
        onClose={() =>
          setTransferModal((m) => ({ ...m, open: false, toRoomId: "" }))
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            Chọn phòng muốn chuyển tới và ngày chuyển.
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Phòng chuyển tới
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={transferModal.toRoomId}
            onChange={(e) =>
              setTransferModal((m) => ({ ...m, toRoomId: e.target.value }))
            }
          >
            <option value="">-- Chọn phòng --</option>
            {allRooms
              .filter((x) => x.id !== transferModal.fromRoomId)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.floorName} - Phòng {x.code}
                </option>
              ))}
          </select>

          <label className="block text-sm font-medium text-slate-700">
            Ngày chuyển
          </label>
          <input
            type="date"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={transferModal.date}
            onChange={(e) =>
              setTransferModal((m) => ({ ...m, date: e.target.value }))
            }
          />

          <div className="flex gap-2 pt-2">
            <button
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
              onClick={() =>
                setTransferModal((m) => ({ ...m, open: false, toRoomId: "" }))
              }
            >
              Hủy
            </button>

            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold",
                auth.isAdmin
                  ? "bg-sky-600 text-white"
                  : "bg-slate-200 text-slate-500",
              )}
              disabled={!auth.isAdmin}
              onClick={async () => {
                if (!transferModal.toRoomId) {
                  alert("Bạn chưa chọn phòng chuyển tới.");
                  return;
                }

                await transferWorker({
                  stayId: transferModal.stayId,
                  workerId: transferModal.workerId,
                  toRoomId: transferModal.toRoomId,
                  transferDate: transferModal.date || todayISO(),
                });

                setTransferModal((m) => ({ ...m, open: false, toRoomId: "" }));
              }}
            >
              Xác nhận chuyển
            </button>
          </div>
        </div>
      </Modal>

      {/* Init KTX */}
      {initModal.open ? (
        <Suspense fallback={null}>
          <InitKtxModal
            initModal={initModal}
            setInitModal={setInitModal}
            requireAdmin={requireAdmin}
            initKtxFromInputs={initKtxFromInputs}
          />
        </Suspense>
      ) : null}

      {/* Add/Import modals */}
      {addFloorModal ? (
        <Suspense fallback={null}>
          <AddFloorModal
            open={addFloorModal}
            onClose={() => setAddFloorModal(false)}
            requireAdmin={requireAdmin}
            addFloor={addFloor}
          />
        </Suspense>
      ) : null}
      {addRoomModal ? (
        <Suspense fallback={null}>
          <AddRoomModal
            open={addRoomModal}
            onClose={() => setAddRoomModal(false)}
            requireAdmin={requireAdmin}
            state={state}
            floor={floor}
            setFloorId={setFloorId}
            addRoom={addRoom}
          />
        </Suspense>
      ) : null}
      {addWorkerModal ? (
        <Suspense fallback={null}>
          <AddWorkerModal
            open={addWorkerModal}
            onClose={() => setAddWorkerModal(false)}
            requireAdmin={requireAdmin}
            addWorker={addWorker}
            lookupWorkerByCode={lookupWorkerByCode}
            existingWorkers={state.workers}
          />
        </Suspense>
      ) : null}
      {importModal.open ? (
        <Suspense fallback={null}>
          <ImportExcelModal
            importModal={importModal}
            setImportModal={setImportModal}
            importFileRef={importFileRef}
            importExcelFile={importExcelFile}
          />
        </Suspense>
      ) : null}

      {staysHistoryOpen ? (
        <Suspense fallback={null}>
          <StaysHistoryModal
            open={staysHistoryOpen}
            onClose={() => setStaysHistoryOpen(false)}
            stays={allStays}
            roomById={roomById}
            workerById={workerById}
            onExport={exportExcel}
          />
        </Suspense>
      ) : null}
      {recruiterModal.open ? (
        <Suspense fallback={null}>
          <RecruiterModal
            recruiterModal={recruiterModal}
            setRecruiterModal={setRecruiterModal}
            recruiterWorkersMap={recruiterWorkersMap}
            setWorkerModal={setWorkerModal}
          />
        </Suspense>
      ) : null}
      {loginModal ? (
        <Suspense fallback={null}>
          <LoginModal
            open={loginModal}
            onClose={() => setLoginModal(false)}
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            authIsAdmin={auth.isAdmin}
          />
        </Suspense>
      ) : null}
      {settingsModal ? (
        <Suspense fallback={null}>
          <SettingsModal
            open={settingsModal}
            onClose={() => setSettingsModal(false)}
            state={state}
            setState={setState}
            auth={auth}
            setLoginModal={setLoginModal}
            onLogout={handleLogout}
            importFileRef={importFileRef}
            DEFAULT_SETTINGS={DEFAULT_SETTINGS}
            saveSettingsToDb={saveSettingsToDb}
            requireAdmin={requireAdmin}
            wipeDatabase={wipeDatabase}
            onImportExcel={handleImportExcel}
          />
        </Suspense>
      ) : null}

      {electricityHistoryOpen ? (
        <Suspense fallback={null}>
          <ElectricityHistoryModal
            open={electricityHistoryOpen}
            onClose={() => setElectricityHistoryOpen(false)}
            records={electricityHistoryRecords}
            pricePerUnit={state.settings.electricityPrice || 0}
            mode={electricityHistoryMode}
            month={state.settings.billingMonth}
          />
        </Suspense>
      ) : null}

      <Confirm
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        onCancel={() =>
          setConfirm({
            open: false,
            title: "",
            message: "",
            confirmText: "Xóa",
            onConfirm: null,
          })
        }
        onConfirm={() => confirm.onConfirm?.()}
      />

      {deletePassModal.open ? (
        <Suspense fallback={null}>
          <DeleteGuardModal
            open={deletePassModal.open}
            title={deletePassModal.title}
            message={deletePassModal.message}
            password={deletePass}
            setPassword={setDeletePass}
            onClose={() => {
              setDeletePass("");
              setDeletePassModal({
                open: false,
                title: "",
                message: "",
                onDelete: null,
              });
            }}
            onConfirm={async () => {
              if (deletePass !== state.settings.adminPassword) {
                alert("Mật khẩu không đúng.");
                return;
              }

              try {
                await deletePassModal.onDelete?.();
              } finally {
                setDeletePass("");
                setDeletePassModal({
                  open: false,
                  title: "",
                  message: "",
                  onDelete: null,
                });
              }
            }}
          />
        </Suspense>
      ) : null}
      <div className="h-10" />
    </div>
  );
}
