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
  Settings,
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
  Mars,
  Pin,
  PinOff,
  Venus,
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
import {
  exportExcel as exportExcelSvc,
  exportPaymentExcel as exportPaymentExcelSvc,
} from "./services/excelExportService";
import Pill from "./components/ui/Pill";
import { DEFAULT_SETTINGS } from "./constants/defaultSettings";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { loadPersistedState, savePersistedState } from "./services/persistence";
import { formatDate } from "./services/dateFormat";
import { calculateRoomUtility, calculateUtilityBilling, getBillingPeriod, getUtilityCheckoutBounds } from "./services/utilityBilling";

const AuthScreen = lazy(() => import("./features/auth/AuthScreen"));
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
const AccountView = lazy(() => import("./features/account/AccountView"));
const AdminBuildingsView = lazy(
  () => import("./features/admin/AdminBuildingsView"),
);

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

function nextBillingMonth(month) {
  const text = String(month || "").slice(0, 7);
  const [y, m] = text.split("-").map(Number);
  if (!y || !m) return "";
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
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

function pinnedBuildingKey(user) {
  return `ktx_pinned_buildings_${user?.id || user?.username || "guest"}`;
}

function lastBuildingKey(user) {
  return `ktx_last_building_${user?.id || user?.username || "guest"}`;
}

function readPinnedBuildingIds(user) {
  try {
    const rows = JSON.parse(
      localStorage.getItem(pinnedBuildingKey(user)) || "[]",
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function BuildingsHome({
  buildings,
  selectedBuildingId,
  setSelectedBuildingId,
  setTab,
  user,
}) {
  const storageKey = pinnedBuildingKey(user);
  const [query, setQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const rows = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const rows = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setPinnedIds(Array.isArray(rows) ? rows : []);
    } catch {
      setPinnedIds([]);
    }
  }, [storageKey]);

  function savePins(next) {
    setPinnedIds(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function pinBuilding(id) {
    if (!id || pinnedIds.includes(id)) return;
    savePins([...pinnedIds, id]);
  }

  function unpinBuilding(id) {
    savePins(pinnedIds.filter((x) => x !== id));
  }

  function openBuilding(id) {
    setSelectedBuildingId(id);
    setTab("ktx");
  }

  const pinnedBuildings = useMemo(
    () => buildings.filter((b) => pinnedIds.includes(b.id)),
    [buildings, pinnedIds],
  );
  const searchResults = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    return buildings.filter((b) =>
      `${b.code || ""} ${b.name || ""}`.toLowerCase().includes(text),
    );
  }, [buildings, query]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tòa nhà để ghim"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {query ? (
            <button
              className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              onClick={() => setQuery("")}
            >
              Xóa
            </button>
          ) : null}
        </div>
      </div>

      {query.trim() ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">
            Kết quả tìm kiếm
          </div>
          {searchResults.length ? (
            <div className="grid grid-cols-2 gap-2">
              {searchResults.map((b) => {
                const pinned = pinnedIds.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-sky-100"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {b.code || "-"}
                      </div>
                      <div className="mt-0.5 truncate text-xs font-medium text-slate-700">
                        {b.name}
                      </div>
                    </div>
                    <button
                      disabled={pinned}
                      className={`mt-2 w-full rounded-xl px-2 py-1.5 text-xs font-semibold ${pinned ? "bg-slate-100 text-slate-400" : "bg-[rgb(44_120_159)] text-white"}`}
                      onClick={() => pinBuilding(b.id)}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Pin className="h-3.5 w-3.5" />
                        {pinned ? "Đã ghim" : "Ghim"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
              Không tìm thấy tòa nhà phù hợp.
            </div>
          )}
        </div>
      ) : null}

      {pinnedBuildings.length ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">
            Tòa nhà đã ghim
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pinnedBuildings.map((b) => {
              const active = b.id === selectedBuildingId;
              const canManage =
                b.accessRole === "manager" || b.accessRole === "owner";
              return (
                <div
                  key={b.id}
                  className={`rounded-2xl bg-white p-2.5 text-left shadow-sm ring-1 ${active ? "ring-sky-300" : "ring-slate-100"}`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => openBuilding(b.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {b.code || "-"}
                        </div>
                        <div className="mt-0.5 truncate text-xs font-medium text-slate-700">
                          {b.name}
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${b.expired ? "bg-rose-400" : "bg-emerald-400"}`}
                      />
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-500">
                      Hạn: {formatDate(b.end_date)}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">
                      {canManage ? "Quản lý" : "Chỉ xem"}
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-medium text-slate-400">
                      {b.public_view ? "Công khai" : "Được gán"}
                    </span>
                    <button
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-500"
                      onClick={() => unpinBuilding(b.id)}
                      title="Bỏ ghim"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Empty
          title="Chưa ghim tòa nhà"
          hint="Tìm tòa nhà ở ô phía trên, sau đó bấm Ghim để lưu vào danh sách chính."
        />
      )}
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
  waterService,
  settingsService,
  buildingService,
  authService,
} from "./services/api-services";
import { message } from "antd";

// ... existing imports ...

const ADMIN_USER_CACHE_KEY = "ktx_admin_created_users";

function readAdminUserCache() {
  try {
    const rows = JSON.parse(localStorage.getItem(ADMIN_USER_CACHE_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeAdminUserCache(rows) {
  localStorage.setItem(ADMIN_USER_CACHE_KEY, JSON.stringify(rows || []));
}

function mergeUsers(primary = [], fallback = []) {
  const map = new Map();
  for (const row of [...fallback, ...primary]) {
    const key = row?.id || row?.username;
    if (key) map.set(key, row);
  }
  return [...map.values()].sort((a, b) =>
    String(a.username || a.name || "").localeCompare(
      String(b.username || b.name || ""),
    ),
  );
}

// ---------------------------
// Main App
// ---------------------------
export default function App() {
  const { user, token, logout: authLogout, loading } = useAuth();
  const [state, setState] = useState(() => loadPersistedState());
  const [buildings, setBuildings] = useState([]);
  const [buildingUsers, setBuildingUsers] = useState([]);
  const [buildingMembers, setBuildingMembers] = useState([]);
  const [authSettings, setAuthSettings] = useState({ require_approval: true });
  const [selectedBuildingId, setSelectedBuildingIdState] = useState(
    () => localStorage.getItem("ktx_current_building_id") || "",
  );
  const [auth, setAuth] = useState({
    isAdmin: false,
    systemAdmin: false,
    canWrite: false,
    canView: false,
    user: null,
  });

  const setSelectedBuildingId = useCallback(
    (id) => {
      const next = id || "";
      setSelectedBuildingIdState(next);
      if (next) {
        localStorage.setItem("ktx_current_building_id", next);
        if (user) localStorage.setItem(lastBuildingKey(user), next);
      } else {
        localStorage.removeItem("ktx_current_building_id");
        if (user) localStorage.removeItem(lastBuildingKey(user));
      }
    },
    [user],
  );

  const systemAdmin = !!(user?.role === "admin" || user?.isAdmin === true);
  const currentBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) || null,
    [buildings, selectedBuildingId],
  );
  const currentBuildingExpired = !!currentBuilding?.expired;
  const currentAccessRole = currentBuilding?.accessRole || "viewer";
  const canWriteBuilding = !!(
    currentBuilding &&
    (systemAdmin ||
      (!currentBuildingExpired &&
        ["admin", "owner", "manager"].includes(currentAccessRole)))
  );
  const canViewBuilding = !!currentBuilding;

  useEffect(() => {
    setAuth({
      isAdmin: canWriteBuilding,
      systemAdmin,
      canWrite: canWriteBuilding,
      canView: canViewBuilding,
      building: currentBuilding,
      accessRole: currentAccessRole,
      user: user || null,
    });
  }, [
    canViewBuilding,
    canWriteBuilding,
    currentAccessRole,
    currentBuilding,
    systemAdmin,
    user,
  ]);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [tab, setTab] = useState("ktx"); // ktx | stats | workers | settings
  const lastUserIdRef = useRef(null);
  const lastAutoRouteUserRef = useRef(null);
  useEffect(() => {
    const id = user?.id || "";
    if (!id || lastUserIdRef.current === id) return;
    lastUserIdRef.current = id;
    if (systemAdmin) setTab("admin");
  }, [systemAdmin, user?.id]);

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

  const refreshBuildings = useCallback(async () => {
    try {
      const rows = await buildingService.getAll(token);
      setBuildings(Array.isArray(rows) ? rows : []);
      if (systemAdmin && token) {
        const settings = await buildingService.getAuthSettings(token);
        setAuthSettings({
          require_approval: settings?.require_approval !== false,
        });
        try {
          const users = await buildingService.getUsers(token);
          setBuildingUsers(
            mergeUsers(Array.isArray(users) ? users : [], readAdminUserCache()),
          );
        } catch (err) {
          console.error("Load users error:", err);
          setBuildingUsers(readAdminUserCache());
        }
      } else {
        setBuildingUsers([]);
        setAuthSettings({ require_approval: true });
      }
    } catch (err) {
      console.error("Load buildings error:", err);
      setBuildings([]);
      setBuildingUsers([]);
    }
  }, [systemAdmin, token]);

  useEffect(() => {
    refreshBuildings();
  }, [refreshBuildings]);

  useEffect(() => {
    const userKey = user?.id || user?.username || "";
    if (!userKey || systemAdmin || !buildings.length) return;
    if (lastAutoRouteUserRef.current === userKey) return;

    const accessibleIds = new Set(buildings.map((b) => b.id));
    const lastBuildingId = localStorage.getItem(lastBuildingKey(user)) || "";
    const pinnedIds = readPinnedBuildingIds(user).filter((id) =>
      accessibleIds.has(id),
    );
    const nextBuildingId = accessibleIds.has(lastBuildingId)
      ? lastBuildingId
      : pinnedIds.length === 1
        ? pinnedIds[0]
        : "";

    lastAutoRouteUserRef.current = userKey;
    if (nextBuildingId) {
      setSelectedBuildingId(nextBuildingId);
      setTab("ktx");
    } else {
      setTab("buildings");
    }
  }, [buildings, setSelectedBuildingId, systemAdmin, user]);

  useEffect(() => {
    if (!buildings.length) {
      if (selectedBuildingId) setSelectedBuildingId("");
      return;
    }

    const hasSelectedBuilding = buildings.some(
      (b) => b.id === selectedBuildingId,
    );
    if (selectedBuildingId && !hasSelectedBuilding) {
      if (systemAdmin) setSelectedBuildingId(buildings[0].id);
      else {
        setSelectedBuildingIdState("");
        localStorage.removeItem("ktx_current_building_id");
      }
      return;
    }

    if (systemAdmin && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [buildings, selectedBuildingId, setSelectedBuildingId, systemAdmin]);

  const refreshBuildingMembers = useCallback(async () => {
    try {
      if (!systemAdmin || !selectedBuildingId || !token) {
        setBuildingMembers([]);
        return;
      }
      const rows = await buildingService.getMembers(selectedBuildingId, token);
      setBuildingMembers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Load building members error:", err);
      setBuildingMembers([]);
    }
  }, [selectedBuildingId, systemAdmin, token]);

  useEffect(() => {
    refreshBuildingMembers();
  }, [refreshBuildingMembers]);

  const loadAllFromDb = useCallback(async () => {
    try {
      if (!selectedBuildingId) {
        setState((s) => ({ ...s, floors: [], workers: [] }));
        setFloorId("");
        return;
      }
      console.log("[DATABASE] PocketBase:", selectedBuildingId);
      const data = await dataLoader.loadAll(token);
      if (data) {
        setState((s) => ({ ...s, ...data }));
        setFloorId((prev) =>
          data.floors?.some((f) => f.id === prev)
            ? prev
            : data.floors?.[0]?.id || "",
        );
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        authLogout?.();
      } else {
        console.error("Load KTX data error:", err);
      }
    }
  }, [authLogout, selectedBuildingId, token]);

  useAppBootstrap({
    loadAllFromDb,
    setState,
    defaultSettings: DEFAULT_SETTINGS,
    token,
    selectedBuildingId,
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

      setSettingsModal(false);
      setImportModal({ open: true, busy: true, result: null });
      try {
        const result = await importExcelFileToDb(file, token);
        setImportModal((m) => ({ ...m, busy: false, result }));
        await loadAllFromDb(); // Tải lại dữ liệu sau khi nhập

        setTab("ktx"); // Chuyển về tab KTX
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
    setSettingsModal(false);
    setImportModal((m) => ({ ...m, open: true, busy: true, result: null }));
    try {
      const result = await importExcelFileToDb(file, token);
      setImportModal((m) => ({ ...m, busy: false, result }));
      await loadAllFromDb();

      setTab("ktx");
    } catch (e) {
      setImportModal((m) => ({ ...m, busy: false }));
      alert("Nhập Excel lỗi: " + (e?.message || String(e)));
    }
  }

  // ---------------------------
  // Mutations
  // ---------------------------
  function requireAdmin(action) {
    if (!user || !token) {
      setLoginModal(true);
      return;
    }
    if (!selectedBuildingId) {
      alert("Chưa chọn tòa nhà.");
      return;
    }
    if (currentBuildingExpired && !systemAdmin) {
      alert("Tòa nhà đã hết hạn.");
      return;
    }
    if (!auth.canWrite) {
      alert("Tài khoản này chỉ có quyền xem.");
      return;
    }
    return action?.();
  }

  const handleLogout = useCallback(() => {
    authLogout?.();
    setSelectedBuildingId("");
    setBuildings([]);
    setBuildingUsers([]);
    setBuildingMembers([]);
    setState({
      floors: [],
      workers: [],
      settings: DEFAULT_SETTINGS,
    });
    setFloorId("");
    setTab("ktx");
  }, [authLogout, setSelectedBuildingId]);

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
          gender: worker.gender,
          identity_number: worker.identityNumber,
          electricity_fee: worker.electricityFee,
          water_fee: worker.waterFee,
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
        gender: row.gender || "",
        identityNumber: row.identity_number || row.identityNumber || "",
        electricityFee: Number(row.electricity_fee || row.electricityFee || 0),
        waterFee: Number(row.water_fee || row.waterFee || 0),
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
        gender: "gender",
        identityNumber: "identity_number",
        electricityFee: "electricity_fee",
        waterFee: "water_fee",
        hometown: "hometown",
        phone: "phone",
        dob: "dob",
        recruiter: "recruiter",
        note: "note",
      };

      Object.keys(fieldMap).forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
          mappedPatch[fieldMap[k]] = ["electricityFee", "waterFee"].includes(k)
            ? Number(patch[k] || 0)
            : patch[k] || null;
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

  async function checkInWorker({ roomId, workerId, dateIn, electricityStartReading, waterStartReading }) {
    try {
      const d = dateIn || todayISO();
      if (!token) return setLoginModal(true);
      await stayService.create(
        {
          room_id: roomId,
          worker_id: workerId,
          date_in: d,
          electricity_start_reading: Number(electricityStartReading || 0),
          water_start_reading: Number(waterStartReading || 0),
        },
        token,
      );
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function checkOutStay({
    stayId,
    dateOut,
    electricityStartReading,
    electricityEndReading,
    waterStartReading,
    waterEndReading,
  }) {
    try {
      const d = dateOut || todayISO();
      if (!token) return setLoginModal(true);

      let ctx = null;
      for (const f of state.floors) {
        for (const r of f.rooms) {
          const st = (r.stays || []).find((x) => x.id === stayId);
          if (st) {
            ctx = { room: r, stay: st };
            break;
          }
        }
        if (ctx) break;
      }

      if (!ctx?.stay) throw new Error("Không tìm thấy lượt ở để tính thanh toán.");
      if (Number(electricityEndReading || 0) < Number(electricityStartReading || 0)) {
        throw new Error("Số điện khi rời không được nhỏ hơn số điện đầu.");
      }
      if (Number(waterEndReading || 0) < Number(waterStartReading || 0)) {
        throw new Error("Số nước khi rời không được nhỏ hơn số nước đầu.");
      }

      const patchedStay = {
        ...ctx.stay,
        dateOut: d,
        electricityStartReading: Number(electricityStartReading || 0),
        electricityEndReading: Number(electricityEndReading || 0),
        waterStartReading: Number(waterStartReading || 0),
        waterEndReading: Number(waterEndReading || 0),
      };
      const billingMonth = state.settings.billingMonth || String(d).slice(0, 7);
      const electricityBounds = getUtilityCheckoutBounds({
        room: ctx.room,
        stay: patchedStay,
        type: "electricity",
        billingMonth,
        billingCloseDay: state.settings.billingCloseDay || 1,
        dateOut: d,
      });
      const waterBounds = getUtilityCheckoutBounds({
        room: ctx.room,
        stay: patchedStay,
        type: "water",
        billingMonth,
        billingCloseDay: state.settings.billingCloseDay || 1,
        dateOut: d,
      });
      if (electricityBounds.startReading === "" || electricityBounds.endReading === "") {
        throw new Error("Thiếu chỉ số điện đầu/cuối để tính tiền.");
      }
      if (waterBounds.startReading === "" || waterBounds.endReading === "") {
        throw new Error("Thiếu chỉ số nước đầu/cuối để tính tiền.");
      }
      const calcStay = {
        ...patchedStay,
        dateIn: electricityBounds.effectiveStartDate,
        dateOut: electricityBounds.effectiveEndDate,
        electricityStartReading: Number(electricityBounds.startReading || 0),
        electricityEndReading: Number(electricityBounds.endReading || 0),
        waterStartReading: Number(waterBounds.startReading || 0),
        waterEndReading: Number(waterBounds.endReading || 0),
      };
      const patchedRoom = {
        ...ctx.room,
        stays: (ctx.room.stays || []).map((st) => (st.id === stayId ? calcStay : st)),
      };
      const electricityCalc = calculateRoomUtility({
        room: patchedRoom,
        type: "electricity",
        settings: {
          ...state.settings,
          billingMonth,
          periodStart: electricityBounds.effectiveStartDate,
          periodEnd: electricityBounds.effectiveEndDate,
        },
      });
      const waterCalc = calculateRoomUtility({
        room: patchedRoom,
        type: "water",
        settings: {
          ...state.settings,
          billingMonth,
          periodStart: waterBounds.effectiveStartDate,
          periodEnd: waterBounds.effectiveEndDate,
        },
      });
      const electricityAmount = electricityCalc.amountByWorkerId.get(ctx.stay.workerId) || 0;
      const waterAmount = waterCalc.amountByWorkerId.get(ctx.stay.workerId) || 0;

      await stayService.update(
        stayId,
        {
          date_out: d,
          electricity_start_reading: Number(electricityStartReading || 0),
          electricity_end_reading: Number(electricityEndReading || 0),
          water_start_reading: Number(waterStartReading || 0),
          water_end_reading: Number(waterEndReading || 0),
          electricity_amount: electricityAmount,
          water_amount: waterAmount,
          total_amount: electricityAmount + waterAmount,
          utility_paid_at: new Date().toISOString(),
          utility_paid_month: state.settings.billingMonth || "",
        },
        token,
      );
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
  async function createBuilding(payload) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      const created = await buildingService.create(payload, token);
      await refreshBuildings();
      if (created?.id) setSelectedBuildingId(created.id);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteBuilding(id) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      if (!window.confirm("Xóa tòa nhà này?")) return;
      await buildingService.delete(id, token);
      await refreshBuildings();
      if (selectedBuildingId === id) setSelectedBuildingId("");
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function updateBuilding(id, patch) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.update(id, patch, token);
      await refreshBuildings();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function createAdminUser(payload) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      const created = await buildingService.createUser(payload, token);
      const nextUser = {
        ...created,
        username: created?.username || payload.username,
        name: created?.name || payload.name,
        role: created?.role || payload.role || "user",
      };
      const nextCache = mergeUsers([nextUser], readAdminUserCache());
      writeAdminUserCache(nextCache);
      setBuildingUsers((prev) => mergeUsers([nextUser], prev));
      await refreshBuildings();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function updateAuthApprovalSetting(requireApproval) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      const next = await buildingService.updateAuthSettings(
        { require_approval: !!requireApproval },
        token,
      );
      setAuthSettings({ require_approval: next?.require_approval !== false });
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function updateAdminUser(id, patch) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      const updated = await buildingService.updateUser(id, patch, token);
      const nextCache = readAdminUserCache().map((u) =>
        u.id === id ? { ...u, ...patch, ...updated } : u,
      );
      writeAdminUserCache(nextCache);
      setBuildingUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch, ...updated } : u)),
      );
      await refreshBuildings();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteAdminUser(id) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      if (!window.confirm("Xóa tài khoản này?")) return;
      await buildingService.deleteUser(id, token);
      const nextCache = readAdminUserCache().filter((u) => u.id !== id);
      writeAdminUserCache(nextCache);
      setBuildingUsers((prev) => prev.filter((u) => u.id !== id));
      await refreshBuildings();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function addBuildingMember(payload) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.addMember(payload, token);
      await refreshBuildingMembers();
      await refreshBuildings();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function updateBuildingMember(id, patch) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.updateMember(id, patch, token);
      await refreshBuildingMembers();
      await refreshBuildings();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteBuildingMember(id) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.deleteMember(id, token);
      await refreshBuildingMembers();
      await refreshBuildings();
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

  const utilityBilling = useMemo(
    () => calculateUtilityBilling({ floors: state.floors, settings: state.settings }),
    [state.floors, state.settings],
  );

  const paymentRoomRows = useMemo(() => {
    const month = state.settings.billingMonth || "";
    const rows = [];
    for (const f of state.floors) {
      for (const r of f.rooms) {
        const roomCharge = utilityBilling.byRoom.get(r.id);
        const electricity = (r.electricity || []).find(
          (row) => String(row?.month || "").slice(0, 7) === month,
        );
        const water = (r.water || []).find(
          (row) => String(row?.month || "").slice(0, 7) === month,
        );
        rows.push({
          roomId: r.id,
          floorName: f.name,
          roomCode: r.code,
          electricity,
          water,
          electricityPaid: !!electricity?.paid,
          waterPaid: !!water?.paid,
          electricityAmount: roomCharge?.electricity?.totalAmount || 0,
          waterAmount: roomCharge?.water?.totalAmount || 0,
          electricityEndReading: electricity?.end_reading ?? electricity?.endReading ?? "",
          waterEndReading: water?.end_reading ?? water?.endReading ?? "",
        });
      }
    }
    return rows;
  }, [state.floors, state.settings.billingMonth, utilityBilling]);

  const workerPaymentRows = useMemo(() => {
    const month = state.settings.billingMonth || "";
    const rows = [];
    for (const f of state.floors) {
      for (const r of f.rooms) {
        for (const st of r.stays || []) {
          const w = workerById.get(st.workerId);
          const charge = utilityBilling.byRoom.get(r.id)?.byWorker?.get(st.workerId) || {};
          const active = !st.dateOut;
          const electricityAmount = active
            ? Number(charge.electricityAmount || 0)
            : Number(st.electricityAmount || 0);
          const waterAmount = active
            ? Number(charge.waterAmount || 0)
            : Number(st.waterAmount || 0);
          const total = electricityAmount + waterAmount;
          if (total <= 0) continue;
          const paid = st.utilityPaidMonth === month && !!st.utilityPaidAt;
          rows.push({
            stayId: st.id,
            workerId: st.workerId,
            workerName: w?.fullName || st.workerId,
            employeeCode: w?.employeeCode || "",
            roomId: r.id,
            floorName: f.name,
            roomCode: r.code,
            dateIn: st.dateIn,
            dateOut: st.dateOut,
            active,
            paid,
            paidMonth: st.utilityPaidMonth || "",
            electricityAmount,
            waterAmount,
            totalAmount: total,
            paidAt: st.utilityPaidAt || null,
          });
        }
      }
    }
    return rows.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return String(b.dateOut || b.dateIn || "").localeCompare(String(a.dateOut || a.dateIn || ""));
    });
  }, [state.floors, state.settings.billingMonth, utilityBilling, workerById]);

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

  const electricityHistoryRecords = useMemo(() => {
    const month = state.settings.billingMonth;
    const rows = [];
    for (const x of allElectricity) {
      const list = Array.isArray(x.electricityList) ? x.electricityList : [];
      for (const e of list) {
        if (month && e?.month !== month) continue;
        if (electricityHistoryMode === "paid" && !e?.paid) continue;
        if (electricityHistoryMode === "pending" && e?.paid) continue;
        rows.push({
          roomId: x.roomId,
          roomCode: x.roomCode,
          electricity: e,
          utility: utilityBilling.byRoom.get(x.roomId)?.electricity || null,
        });
      }
    }
    return rows;
  }, [allElectricity, electricityHistoryMode, state.settings.billingMonth, utilityBilling]);

  const pendingElectricityCount = workerPaymentRows.filter((row) => !row.paid).length;
  const pendingElectricityAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? 0 : Number(row.electricityAmount || 0)),
    0,
  );
  const paidElectricityCount = workerPaymentRows.filter((row) => row.paid).length;
  const paidElectricityAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? Number(row.electricityAmount || 0) : 0),
    0,
  );
  const pendingWaterCount = pendingElectricityCount;
  const pendingWaterAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? 0 : Number(row.waterAmount || 0)),
    0,
  );
  const paidWaterCount = paidElectricityCount;
  const paidWaterAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? Number(row.waterAmount || 0) : 0),
    0,
  );

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

  function exportPaymentExcel() {
    exportPaymentExcelSvc({
      floors: state.floors,
      workerById,
      billingMonth: state.settings.billingMonth,
      utilityBilling,
      workerPaymentRows,
      todayISO,
    });
  }

  async function advanceNextMonthReadingsForRoom(roomId) {
    const month = state.settings.billingMonth || "";
    const nextMonth = nextBillingMonth(month);
    if (!nextMonth) return;
    const nextPeriod = getBillingPeriod(nextMonth, state.settings.billingCloseDay || 1);
    const roomRow = paymentRoomRows.find((row) => row.roomId === roomId);
    if (!roomRow) return;
    const jobs = [
      { type: "electricity", service: electricityService, record: roomRow.electricity, end: roomRow.electricityEndReading },
      { type: "water", service: waterService, record: roomRow.water, end: roomRow.waterEndReading },
    ];
    for (const job of jobs) {
      if (job.end === "" || job.end == null) continue;
      if (job.record) {
        await job.service.upsert(
          {
            id: job.record.id,
            room_id: roomId,
            month: job.record.month || month,
            start_reading: job.record.start_reading ?? job.record.startReading ?? 0,
            end_reading: job.record.end_reading ?? job.record.endReading ?? job.end,
            readings: job.record.readings || [],
            paid: true,
          },
          token,
        );
      }
      await job.service.upsert(
        {
          room_id: roomId,
          month: nextMonth,
          start_reading: Number(job.end || 0),
          end_reading: Number(job.end || 0),
          readings: [{ date: nextPeriod.start, reading: Number(job.end || 0) }],
          paid: false,
        },
        token,
      );
    }
  }

  async function markWorkerUtilityPaid(row) {
    try {
      if (!auth.isAdmin) return setLoginModal(true);
      if (!token) return setLoginModal(true);
      const month = state.settings.billingMonth || "";
      if (!row?.stayId) return;
      await stayService.update(
        row.stayId,
        {
          electricity_amount: Number(row.electricityAmount || 0),
          water_amount: Number(row.waterAmount || 0),
          total_amount: Number(row.totalAmount || 0),
          utility_paid_at: new Date().toISOString(),
          utility_paid_month: month,
        },
        token,
      );

      const roomRows = workerPaymentRows.filter((item) => item.roomId === row.roomId);
      const allPaid = roomRows.length > 0 && roomRows.every((item) => item.stayId === row.stayId || item.paid);
      if (allPaid) {
        await advanceNextMonthReadingsForRoom(row.roomId);
      }
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
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
  const showBuildingSelector = tab !== "buildings" && systemAdmin;

  const isUserRole =
    auth.user?.role === "user" || (!systemAdmin && !auth.isAdmin);
  const showSummaryCards =
    tab !== "stats" && tab !== "about" && !(tab === "workers" && isUserRole);

  const Header = (
    <div className="sticky top-0 z-40 bg-gradient-to-b from-white to-white/80 backdrop-blur">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {state.settings.siteName}
              </div>
              <span
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  systemAdmin
                    ? "bg-violet-50 text-violet-700 ring-1 ring-violet-100"
                    : auth.isAdmin
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
                )}
              >
                {systemAdmin ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : auth.isAdmin ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <Home className="h-3 w-3" />
                )}
                {systemAdmin ? "System" : auth.isAdmin ? "Quản lý" : "Xem"}
              </span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold leading-7 text-slate-950">
              {tab === "ktx"
                ? "Sơ đồ phòng"
                : tab === "stats"
                  ? "Thống kê"
                  : tab === "workers"
                    ? "Danh sách NLĐ"
                    : tab === "admin" || tab === "buildings"
                      ? "Quản lý tòa nhà"
                      : tab === "about"
                        ? "Tài khoản"
                        : "Cài đặt"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pt-1">
            {user ? (
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-sky-100"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            ) : (
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgb(44_120_159)] text-white shadow-sm transition hover:bg-[rgb(36_99_132)]"
                onClick={() => setLoginModal(true)}
                title="Đăng nhập"
                aria-label="Đăng nhập"
              >
                <LogIn className="h-4 w-4" />
              </button>
            )}
            {tab !== "settings" ? (
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                onClick={() => setSettingsModal(true)}
                title="Cài đặt"
                aria-label="Cài đặt"
              >
                <Settings className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {tab !== "buildings" ? (
          <>
            {showBuildingSelector ? (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Building2 className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                >
                  {buildings.length ? null : (
                    <option value="">Chưa có tòa nhà</option>
                  )}
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code ? `${b.code} - ` : ""}
                      {b.name}
                    </option>
                  ))}
                </select>
                {currentBuilding?.expired ? (
                  <Pill icon={Clock} text="Hết hạn" tone="rose" />
                ) : currentBuilding ? (
                  <Pill
                    icon={Users}
                    text={auth.isAdmin ? "Sửa" : "Xem"}
                    tone={auth.isAdmin ? "green" : "slate"}
                  />
                ) : systemAdmin ? (
                  <button
                    className="rounded-xl bg-[rgb(44_120_159)] px-2 py-1 text-xs font-semibold text-white"
                    onClick={() => setTab("admin")}
                  >
                    Tạo
                  </button>
                ) : null}
              </div>
            ) : null}

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

            {showSummaryCards ? (
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
            ) : null}
          </>
        ) : null}

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
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <AuthScreen />
      </Suspense>
    );
  }

  if (systemAdmin) {
    return (
      <div className="min-h-screen bg-sky-50 text-slate-900">
        <div className="sticky top-0 z-40 bg-gradient-to-b from-sky-50 to-sky-50/80 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500">
                  Quản trị hệ thống
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="truncate text-lg font-semibold text-slate-900">
                    Tài khoản và tòa nhà
                  </div>
                  <Pill icon={ShieldCheck} text="Admin" tone="violet" />
                </div>
              </div>
              <button
                className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-sky-100"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
        <Suspense fallback={<LazyFallback />}>
          <AdminBuildingsView
            buildings={buildings}
            users={buildingUsers}
            authSettings={authSettings}
            settings={state.settings}
            selectedBuildingId={selectedBuildingId}
            setSelectedBuildingId={setSelectedBuildingId}
            members={buildingMembers}
            actions={{
              createBuilding,
              updateBuilding,
              deleteBuilding,
              createUser: createAdminUser,
              updateUser: updateAdminUser,
              deleteUser: deleteAdminUser,
              updateAuthSettings: updateAuthApprovalSetting,
              updateSettings: async (nextSettings) => {
                setState((prev) => ({ ...prev, settings: nextSettings }));
                await saveSettingsToDb(nextSettings);
              },
              addMember: addBuildingMember,
              updateMember: updateBuildingMember,
              deleteMember: deleteBuildingMember,
            }}
          />
        </Suspense>
      </div>
    );
  }

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
            setTab={setTab}
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
            utilityChargesByWorkerId={utilityBilling.byWorker}
          />
        ) : null}
        {tab === "stats" ? (
          <StatsView
            stats={stats}
            recruiterStats={recruiterStats}
            setRecruiterModal={setRecruiterModal}
            exportExcel={exportExcel}
            exportPaymentExcel={exportPaymentExcel}
            openStaysHistory={() => setStaysHistoryOpen(true)}
            billingMonth={state.settings.billingMonth}
            totalCurrentWorkers={totalCurrentWorkers}
            pendingElectricityCount={pendingElectricityCount}
            pendingElectricityAmount={pendingElectricityAmount}
            paidElectricityCount={paidElectricityCount}
            paidElectricityAmount={paidElectricityAmount}
            pendingWaterCount={pendingWaterCount}
            pendingWaterAmount={pendingWaterAmount}
            paidWaterCount={paidWaterCount}
            paidWaterAmount={paidWaterAmount}
            workerPaymentRows={workerPaymentRows}
            markWorkerUtilityPaid={markWorkerUtilityPaid}
            openElectricityHistory={openHistory}
          />
        ) : null}
        {tab === "about" ? (
          <AccountView
            user={user}
            settings={state.settings}
            onLogout={authLogout}
          />
        ) : null}
        {tab === "buildings" ? (
          <BuildingsHome
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            setSelectedBuildingId={setSelectedBuildingId}
            setTab={setTab}
            user={user}
          />
        ) : null}
        {tab === "admin" && systemAdmin ? (
          <AdminBuildingsView
            buildings={buildings}
            users={buildingUsers}
            authSettings={authSettings}
            selectedBuildingId={selectedBuildingId}
            setSelectedBuildingId={setSelectedBuildingId}
            members={buildingMembers}
            actions={{
              createBuilding,
              updateBuilding,
              deleteBuilding,
              createUser: createAdminUser,
              updateUser: updateAdminUser,
              deleteUser: deleteAdminUser,
              updateAuthSettings: updateAuthApprovalSetting,
              addMember: addBuildingMember,
              updateMember: updateBuildingMember,
              deleteMember: deleteBuildingMember,
            }}
          />
        ) : null}
      </Suspense>
      {/* bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-4 pb-4">
          <div className="grid grid-cols-5 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
            <TabButton
              icon={Building2}
              label="Tòa nhà"
              active={tab === "admin" || tab === "buildings"}
              onClick={() => setTab(systemAdmin ? "admin" : "buildings")}
            />
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
              icon={UserRound}
              label="Tài khoản"
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
              checkOut: async (payload) => {
                await checkOutStay({
                  ...payload,
                  dateOut: payload?.dateOut || todayISO(),
                });
              },
              // new manual check-in actions
              addWorker: async (w) => {
                return await addWorker(w);
              },
              updateWorker: async ({ workerId, patch }) => {
                return await updateWorker(workerId, patch || {});
              },
              checkIn: async (payload) => {
                await checkInWorker(payload || {});
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
              utilityChargesByWorkerId:
                utilityBilling.byRoom.get(roomCtx?.room?.id)?.byWorker || new Map(),
              electricityPrice: state.settings.electricityPrice,
              waterPrice: state.settings.waterPrice,
              waterBillingMode: state.settings.waterBillingMode,
              billingMonth: state.settings.billingMonth,
              billingCloseDay: state.settings.billingCloseDay,
              upsertUtility: async (rec) => {
                try {
                  if (!token) return setLoginModal(true);
                  const service = rec.type === "water" ? waterService : electricityService;
                  await service.upsert(
                    {
                      id: rec.id,
                      room_id: rec.room_id || rec.roomId || roomCtx?.room?.id,
                      month: rec.month,
                      start_reading: rec.start_reading ?? rec.startReading ?? 0,
                      end_reading: rec.end_reading ?? rec.endReading ?? 0,
                      readings: rec.readings || [],
                      paid: !!rec.paid,
                    },
                    token,
                  );
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
            utilityCharge={
              workerModal.workerId ? utilityBilling.byWorker.get(workerModal.workerId) : null
            }
            auth={auth}
            requireAdmin={requireAdmin}
            actions={{
              billingMonth: state.settings.billingMonth,
              billingCloseDay: state.settings.billingCloseDay,
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
                  ? "bg-[rgb(44_120_159)] text-white"
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
            loginUsername={loginUsername}
            setLoginUsername={setLoginUsername}
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
              const identity = auth.user?.username;
              if (!identity) {
                alert("Tài khoản đăng nhập chưa có username.");
                return;
              }
              try {
                await authService.login(identity, deletePass);
                await deletePassModal.onDelete?.();
              } catch (e) {
                alert("Mật khẩu đăng nhập không đúng.");
                return;
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
