import {
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
  Shield,
  Home,
  BarChart3,
  UserRound,
  Users,
  LogIn,
  LogOut,
  Settings,
  Building2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import BuildingsHome from "./features/ktx/BuildingsHome";
import {
  lastBuildingKey,
  readPinnedBuildingIds,
} from "./lib/buildingPins";
// UI (App.jsx thường chỉ còn 2 cái này)
import Confirm from "./components/ui/Confirm";
import TabButton from "./components/ui/TabButton";

// Services
import { importExcelFileToDb } from "./services/excelImportService";
import {
  exportExcel as exportExcelSvc,
  exportActivityLogExcel as exportActivityLogExcelSvc,
  exportPaymentExcel as exportPaymentExcelSvc,
  exportWorkerInvoice as exportWorkerInvoiceSvc,
  exportRoomInvoice as exportRoomInvoiceSvc,
} from "./services/excelExportService";
import Pill from "./components/ui/Pill";
import { DEFAULT_SETTINGS } from "./constants/defaultSettings";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useBrandManifest } from "./hooks/useBrandManifest";
import { loadPersistedState, savePersistedState } from "./services/persistence";
import { formatDate } from "./services/dateFormat";
import {
  calculateRoomRentForStay,
  calculateRoomUtility,
  calculateStayCheckoutSettlement,
  calculateUtilityBilling,
  findUtilityRecord,
  getBillingPeriod,
  isStayBillingMonthPaid,
  mergeUtilityReadingRows,
} from "./services/utilityBilling";

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

function earlierBillingMonth(month, monthsBack = 0) {
  const text = String(month || "").slice(0, 7);
  const [y, m] = text.split("-").map(Number);
  if (!y || !m) return "";
  const prev = new Date(y, m - 1 - Number(monthsBack || 0), 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function utilitySnapshot(calculation) {
  return {
    rows: (calculation?.rows || []).map((row) => ({
      date: row.date,
      label: row.label,
      reading: row.reading,
    })),
    segments: (calculation?.segments || []).map((segment) => ({
      startDate: segment.startDate,
      endDate: segment.endDate,
      startReading: segment.startReading,
      endReading: segment.endReading,
      used: segment.used,
      occupantCount: segment.occupantCount,
      workerIds: (segment.occupants || []).map((item) => item.workerId),
      unitsPerOccupant: segment.unitsPerOccupant,
      amountPerOccupant: segment.amountPerOccupant,
    })),
    pricePerUnit: calculation?.pricePerUnit || 0,
  };
}

function settlementUtilityRecords(room, duePeriods) {
  const updates = [];
  for (const item of duePeriods || []) {
    for (const [type, collection] of [["electricity", "electricities"], ["water", "water_records"]]) {
      const calculation = item[type];
      const existing = findUtilityRecord(room, type, item.billingMonth);
      const readings = mergeUtilityReadingRows(existing?.readings, calculation?.rows)
        .filter((row) => row.date >= item.period.start && row.date <= item.period.end);
      const readingMap = new Map(readings.map((row) => [row.date, Number(row.reading)]));
      const fallbackStart = readings[0]?.reading ?? existing?.start_reading ?? existing?.startReading ?? 0;
      const fallbackEnd = readings.at(-1)?.reading ?? fallbackStart;
      updates.push({
        id: existing?.id,
        collection,
        data: {
          room_id: room.id,
          month: item.billingMonth,
          start_reading: readingMap.get(item.period.start) ?? Number(fallbackStart || 0),
          end_reading: readingMap.get(item.period.end) ?? Number(fallbackEnd || 0),
          readings,
          paid: !!existing?.paid,
        },
      });
    }
  }
  return updates;
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
        <div className="max-h-[78vh] overflow-auto px-4 py-5">{children}</div>
        <div className="h-2" />
      </div>
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
  activityLogService,
  paymentService,
} from "./services/api-services";
import { message } from "antd";
import InstallFloatingBanner from "./components/layout/InstallFloatingBanner";
import IosInstallGuideDialog from "./components/layout/IosInstallGuideDialog";
import { usePwaInstall } from "./lib/pwa-install";

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
  const installApp = usePwaInstall();
  const [state, setState] = useState(() => loadPersistedState());
  const [buildings, setBuildings] = useState([]);
  const [buildingUsers, setBuildingUsers] = useState([]);
  const [buildingMembers, setBuildingMembers] = useState([]);
  const [authSettings, setAuthSettings] = useState({ require_approval: true });
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
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

  const [expiredBuildingNoticeOpen, setExpiredBuildingNoticeOpen] =
    useState(false);

  useEffect(() => {
    const t = setTimeout(() => savePersistedState(state), 150);
    return () => clearTimeout(t);
  }, [state]);

  useBrandManifest(state.settings, DEFAULT_SETTINGS);
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

  const loadActivityLogs = useCallback(async () => {
    if (!token || !selectedBuildingId) {
      setActivityLogs([]);
      return;
    }
    try {
      setActivityLogLoading(true);
      const rows = await activityLogService.getAll(token, { limit: 50 });
      setActivityLogs(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn("Load activity logs error:", err);
      setActivityLogs([]);
    } finally {
      setActivityLogLoading(false);
    }
  }, [selectedBuildingId, token]);

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
    const targetBuildingId = selectedBuildingId;
    try {
      if (!targetBuildingId) {
        setState((s) => ({ ...s, floors: [], workers: [] }));
        setFloorId("");
        return;
      }
      const data = await dataLoader.loadAll(token);
      if (localStorage.getItem("ktx_current_building_id") !== targetBuildingId) {
        return;
      }
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

  useEffect(() => {
    if (token) return;
    let alive = true;
    (async () => {
      try {
        const data = await settingsService.get(null);
        if (!alive || !data) return;
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            siteName:
              data.siteName ||
              s.settings?.siteName ||
              DEFAULT_SETTINGS.siteName,
            logoUrl:
              data.logoUrl ||
              data.about?.brandLogoUrl ||
              s.settings?.logoUrl ||
              DEFAULT_SETTINGS.logoUrl,
            about: {
              ...(s.settings?.about || {}),
              ...(data.about || {}),
              brandLogoUrl:
                data.logoUrl ||
                data.about?.brandLogoUrl ||
                s.settings?.about?.brandLogoUrl ||
                DEFAULT_SETTINGS.logoUrl,
            },
          },
        }));
      } catch (e) {
        console.error("Load public brand settings error:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const saveSettingsToDb = useCallback(
    async (nextSettings) => {
      if (!token) throw new Error("Unauthorized");
      return await settingsService.update(nextSettings, token);
    },
    [token],
  );

  const [initModal, setInitModal] = useState({
    open: false,
    mode: "uniform",
    floors: 3,
    roomsPerFloor: 7,
    startNo: 101,
    floorRanges: [],
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
    fromElectricityReading: "",
    fromWaterReading: "",
    toElectricityReading: "",
    toWaterReading: "",
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
        message.error("Lỗi khi nhập Excel. Vui lòng xem console để biết chi tiết.");
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
      message.error("Nhập Excel lỗi: " + (e?.message || String(e)));
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
      message.warning("Chưa chọn tòa nhà.");
      return;
    }
    if (currentBuildingExpired && !systemAdmin) {
      setExpiredBuildingNoticeOpen(true);
      return;
    }
    if (!auth.canWrite) {
      message.warning("Tài khoản này chỉ có quyền xem.");
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

  async function addFloor(name, options = {}) {
    try {
      const floorName =
        (name || "").trim() || `Tầng ${state.floors.length + 1}`;
      const sort = state.floors.length + 1;
      const startNo = Math.floor(Number(options.startNo || 0));
      const endNo = Math.floor(Number(options.endNo || 0));
      const createRooms = options.createRooms === true;
      const roomCount =
        createRooms && startNo > 0 && endNo >= startNo ? endNo - startNo + 1 : 0;

      if (createRooms) {
        if (!startNo || !endNo || endNo < startNo) {
          message.warning("Khoảng phòng không hợp lệ.");
          return false;
        }
        const existingRoomCodes = new Set(
          state.floors.flatMap((floor) =>
            floor.rooms.map((room) => String(room.code || "").trim()),
          ),
        );
        for (let code = startNo; code <= endNo; code += 1) {
          if (existingRoomCodes.has(String(code))) {
            message.warning(`Mã phòng ${code} đã tồn tại.`);
            return false;
          }
        }
        if (!assertRoomLimit(roomCount)) return false;
      }

      if (!token) return setLoginModal(true);
      const created = await floorService.create(
        { name: floorName, sort },
        token,
      );
      if (created?.id && roomCount > 0) {
        for (let code = startNo; code <= endNo; code += 1) {
          await roomService.create(
            { floor_id: created.id, code: String(code), sort: code - startNo + 1 },
            token,
          );
        }
      }
      await loadAllFromDb();
      if (created?.id) setFloorId(created.id);
      return true;
    } catch (e) {
      message.error(e.message || String(e));
      return false;
    }
  }

  async function deleteFloor(floorId) {
    try {
      if (!token) return setLoginModal(true);
      await floorService.delete(floorId, token);
      await loadAllFromDb();
      setFloorId((prev) => (prev === floorId ? "" : prev));
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  async function addRoom(floorId, code) {
    try {
      if (!assertRoomLimit(1)) return false;
      const floor = state.floors.find((f) => f.id === floorId);
      const sort = (floor?.rooms?.length || 0) + 1;
      const roomCode = (code || "").trim() || String(sort);

      if (!token) return setLoginModal(true);
      await roomService.create(
        { floor_id: floorId, code: roomCode, sort },
        token,
      );
      await loadAllFromDb();
      return true;
    } catch (e) {
      message.error(e.message || String(e));
      return false;
    }
  }

  async function updateRoomCode(floorId, roomId, newCode) {
    try {
      const nextCode = (newCode || "").trim();
      if (!nextCode) {
        message.warning("Tên phòng không được để trống.");
        return;
      }

      if (!token) return setLoginModal(true);
      await roomService.update(roomId, { code: nextCode }, token);
      await loadAllFromDb();
      return true;
    } catch (e) {
      if (e?.response?.status === 404) {
        await loadAllFromDb();
        message.warning("Phòng không còn tồn tại (dữ liệu đã thay đổi). Đã đồng bộ lại.");
        return false;
      }
      message.error(e.message || String(e));
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
        if (!c) {
          message.warning("Tên phòng không được để trống.");
          return;
        }
        nextPatch.code = c;
      }

      if (Object.prototype.hasOwnProperty.call(nextPatch, "gender")) {
        const g = nextPatch.gender;
        if (g !== null && g !== "male" && g !== "female") {
          message.warning("Giới tính phòng không hợp lệ.");
          return;
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
        message.warning("Phòng không còn tồn tại (dữ liệu đã thay đổi). Đã đồng bộ lại.");
        return false;
      }
      message.error(e.message || String(e));
      return false;
    }
  }

  async function deleteRoom(floorId, roomId) {
    try {
      if (!token) return setLoginModal(true);
      await roomService.delete(roomId, token);
      await loadAllFromDb();
    } catch (e) {
      message.error(e.message || String(e));
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
          free_room_days: worker.freeRoomDays,
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
    } catch {
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
        freeRoomDays: Math.max(
          0,
          Math.floor(Number(row.free_room_days || row.freeRoomDays || 0)),
        ),
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
        freeRoomDays: "free_room_days",
        hometown: "hometown",
        phone: "phone",
        dob: "dob",
        recruiter: "recruiter",
        note: "note",
      };

      Object.keys(fieldMap).forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
          if (k === "freeRoomDays") {
            mappedPatch[fieldMap[k]] = Math.max(
              0,
              Math.floor(Number(patch[k] || 0)),
            );
          } else {
            mappedPatch[fieldMap[k]] = ["electricityFee", "waterFee"].includes(
              k,
            )
              ? Number(patch[k] || 0)
              : patch[k] || null;
          }
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
      message.error(e.message || String(e));
    }
  }

  async function checkInWorker({
    roomId,
    workerId,
    dateIn,
    electricityStartReading,
    waterStartReading,
  }) {
    try {
      const d = dateIn || todayISO();
      if (!token) return setLoginModal(true);
      await stayService.create(
        {
          room_id: roomId,
          worker_id: workerId,
          date_in: d,
          initial_date_in: d,
          transfer_date: null,
          electricity_start_reading: Number(electricityStartReading || 0),
          water_start_reading: Number(waterStartReading || 0),
        },
        token,
      );
      await loadAllFromDb();
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  async function checkOutStay({
    stayId,
    dateOut,
    electricityStartReading,
    electricityEndReading,
    waterStartReading,
    waterEndReading,
    readingOverrides = {},
    editing = false,
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

      if (!ctx?.stay)
        throw new Error("Không tìm thấy lượt ở để tính thanh toán.");
      if (
        Number(electricityEndReading || 0) <
        Number(electricityStartReading || 0)
      ) {
        throw new Error("Số điện khi rời không được nhỏ hơn số điện đầu.");
      }
      if (Number(waterEndReading || 0) < Number(waterStartReading || 0)) {
        throw new Error("Số nước khi rời không được nhỏ hơn số nước đầu.");
      }

      const stayPayments = (state.payments || []).filter((row) => row.stayId === stayId);
      const settlement = calculateStayCheckoutSettlement({
        room: ctx.room,
        stay: ctx.stay,
        dateOut: d,
        payments: stayPayments,
        settings: state.settings,
        workerById,
        electricityEndReading,
        waterEndReading,
        readingOverrides,
      });
      if (settlement.missingReadings.length) {
        const first = settlement.missingReadings[0];
        throw new Error(`Thiếu chỉ số ${first.type === "water" ? "nước" : "điện"} ngày ${first.date}.`);
      }
      if (settlement.negativeReadings.length) {
        const first = settlement.negativeReadings[0];
        throw new Error(`Chỉ số ngày ${first.endDate} nhỏ hơn ngày ${first.startDate}.`);
      }
      const dueMonths = new Set(settlement.duePeriods.map((item) => item.billingMonth));
      const checkoutByMonth = new Map(
        stayPayments
          .filter((row) => row.source === "checkout")
          .map((row) => [row.billingMonth, row]),
      );
      const paymentRecords = settlement.duePeriods.map((item) => {
        const existing = checkoutByMonth.get(item.billingMonth);
        return {
          id: existing?.id,
          data: {
            room_id: ctx.room.id,
            worker_id: ctx.stay.workerId,
            billing_month: item.billingMonth,
            period_start: item.startDate,
            period_end: item.endDate,
            electricity_amount: item.electricityAmount,
            water_amount: item.waterAmount,
            room_amount: item.roomAmount,
            amount: item.totalAmount,
            source: "checkout",
            breakdown: {
              electricity: utilitySnapshot(item.electricity),
              water: utilitySnapshot(item.water),
              room: {
                period: item.rent?.period,
                days: item.rent?.days || 0,
                chargedDays: item.rent?.chargedDays || 0,
                freeDays: item.rent?.freeDays || 0,
                monthlyAmount: item.rent?.monthlyAmount || 0,
              },
            },
          },
        };
      });
      if (!stayPayments.length && ctx.stay.utilityPaidAt && ctx.stay.utilityPaidMonth) {
        const legacyPeriod = getBillingPeriod(ctx.stay.utilityPaidMonth, state.settings.billingCloseDay || 1);
        paymentRecords.unshift({
          data: {
            room_id: ctx.room.id,
            worker_id: ctx.stay.workerId,
            billing_month: ctx.stay.utilityPaidMonth,
            period_start: legacyPeriod.start,
            period_end: legacyPeriod.end,
            electricity_amount: Number(ctx.stay.electricityAmount || 0),
            water_amount: Number(ctx.stay.waterAmount || 0),
            room_amount: Number(ctx.stay.roomAmount || 0),
            amount: Number(ctx.stay.totalAmount || 0),
            source: "legacy_watermark",
            paid_at: ctx.stay.utilityPaidAt,
            note: "Mốc thanh toán được chuyển từ dữ liệu cũ",
          },
        });
      }
      const deletePaymentIds = stayPayments
        .filter((row) => row.source === "checkout" && !dueMonths.has(row.billingMonth))
        .map((row) => row.id);
      const billingMonth = settlement.periods.at(-1)?.billingMonth || String(d).slice(0, 7);

      await stayService.checkout(
        {
          stay_id: stayId,
          date_out: d,
          electricity_start_reading: Number(electricityStartReading || 0),
          electricity_end_reading: Number(electricityEndReading || 0),
          water_start_reading: Number(waterStartReading || 0),
          water_end_reading: Number(waterEndReading || 0),
          electricity_amount: settlement.electricityAmount,
          water_amount: settlement.waterAmount,
          total_amount: settlement.totalAmount,
          utility_paid_month: billingMonth,
          utility_records: settlementUtilityRecords(ctx.room, settlement.duePeriods),
          payment_records: paymentRecords,
          delete_payment_ids: deletePaymentIds,
          editing,
        },
        token,
      );
      await loadAllFromDb();
      return true;
    } catch (e) {
      message.error(e.message || String(e));
      return false;
    }
  }

  async function undoDeparture({ stayId }) {
    try {
      if (!token) return setLoginModal(true);
      if (!stayId) throw new Error("Thiếu stayId.");

      let ctx = null;
      for (const f of state.floors) {
        for (const r of f.rooms) {
          const st = (r.stays || []).find((x) => x.id === stayId);
          if (st) { ctx = { room: r, stay: st }; break; }
        }
        if (ctx) break;
      }
      if (!ctx?.stay) throw new Error("Không tìm thấy lượt ở để hoàn tác.");
      if (!ctx.stay.dateOut) throw new Error("Lượt ở này chưa rời phòng.");

      const workerId = ctx.stay.workerId;
      const dateOutOfTarget = String(ctx.stay.dateOut || "");

      let otherOpen = false;
      let isTransfer = false;
      for (const f of state.floors) {
        for (const r of f.rooms) {
          for (const st of r.stays || []) {
            if (st.id === stayId) continue;
            if (st.workerId !== workerId) continue;
            if (!st.dateOut) {
              otherOpen = true;
              if (r.id !== ctx.room.id && String(st.dateIn || "") <= dateOutOfTarget) {
                isTransfer = true;
              }
            }
          }
        }
      }
      if (isTransfer) {
        throw new Error(
          "NLĐ đã chuyển sang phòng khác. Vui lòng cho rời phòng hiện tại trước khi hoàn tác.",
        );
      }
      if (otherOpen) {
        throw new Error("NLĐ này đã có lượt ở đang mở ở phòng khác, không thể hoàn tác.");
      }

      await stayService.undoCheckout(
        {
          stay_id: stayId,
          payment_ids: (state.payments || [])
            .filter((row) => row.stayId === stayId && row.source === "checkout")
            .map((row) => row.id),
        },
        token,
      );

      const targetMonth = String(ctx.stay.utilityPaidMonth || "").trim();
      if (targetMonth) {
        const patchedRoom = {
          ...ctx.room,
          stays: (ctx.room.stays || []).map((st) =>
            st.id === stayId
              ? {
                  ...st,
                  dateOut: null,
                  electricityEndReading: null,
                  waterEndReading: null,
                  electricityAmount: 0,
                  waterAmount: 0,
                  totalAmount: 0,
                  utilityPaidMonth: "",
                  utilityPaidAt: null,
                }
              : st,
          ),
        };

        const period = getBillingPeriod(targetMonth, state.settings.billingCloseDay || 1);
        const settingsForPeriod = {
          ...state.settings,
          billingMonth: targetMonth,
          periodStart: period.start,
          periodEnd: period.end,
        };
        const eCalc = calculateRoomUtility({ room: patchedRoom, type: "electricity", settings: settingsForPeriod });
        const wCalc = calculateRoomUtility({ room: patchedRoom, type: "water", settings: settingsForPeriod });

        for (const st of patchedRoom.stays) {
          if (st.id === stayId) continue;
          if (!st.dateOut) continue;
          if (String(st.utilityPaidMonth || "") !== targetMonth) continue;

          const eAmount = eCalc.amountByWorkerId.get(st.workerId) || 0;
          const wAmount = wCalc.amountByWorkerId.get(st.workerId) || 0;
          const rentAmount = calculateRoomRentForStay({
            stay: st,
            worker: workerById.get(st.workerId),
            settings: settingsForPeriod,
          }).amount;
          const newTotal = eAmount + wAmount + rentAmount;

          if (
            Number(st.electricityAmount || 0) === Number(eAmount) &&
            Number(st.waterAmount || 0) === Number(wAmount) &&
            Number(st.totalAmount || 0) === Number(newTotal)
          ) continue;

          await stayService.update(
            st.id,
            {
              electricity_amount: Number(eAmount || 0),
              water_amount: Number(wAmount || 0),
              total_amount: Number(newTotal || 0),
            },
            token,
          );
        }
      }

      await loadAllFromDb();
      message.success("Đã hoàn tác rời phòng.");
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  async function transferWorker({
    stayId,
    workerId,
    toRoomId,
    transferDate,
    fromElectricityReading,
    fromWaterReading,
    toElectricityReading,
    toWaterReading,
  }) {
    const d = transferDate || todayISO();
    if (!token) {
      setLoginModal(true);
      return false;
    }

    const fromElec = Number(fromElectricityReading);
    const fromWater = Number(fromWaterReading);
    const toElec = Number(toElectricityReading);
    const toWater = Number(toWaterReading);
    if (
      !Number.isFinite(fromElec) ||
      !Number.isFinite(fromWater) ||
      !Number.isFinite(toElec) ||
      !Number.isFinite(toWater)
    ) {
      message.warning("Vui lòng nhập đủ chỉ số điện/nước phòng cũ và phòng mới.");
      return false;
    }

    try {
      await stayService.transfer(
        {
          stay_id: stayId,
          worker_id: workerId,
          to_room_id: toRoomId,
          transfer_date: d,
          from_electricity_reading: fromElec,
          from_water_reading: fromWater,
          to_electricity_reading: toElec,
          to_water_reading: toWater,
        },
        token,
      );
      await loadAllFromDb();
      return true;
    } catch (e) {
      message.error(e.message || String(e));
      return false;
    }
  }
  async function createBuilding(payload) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      const created = await buildingService.create(payload, token);
      await refreshBuildings();
      if (created?.id) setSelectedBuildingId(created.id);
    } catch (e) {
      message.error(e.message || String(e));
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
      message.error(e.message || String(e));
    }
  }

  async function updateBuilding(id, patch) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.update(id, patch, token);
      await refreshBuildings();
    } catch (e) {
      message.error(e.message || String(e));
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
      message.error(e.message || String(e));
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
      message.error(e.message || String(e));
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
      message.error(e.message || String(e));
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
      message.error(e.message || String(e));
    }
  }

  async function addBuildingMember(payload) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.addMember(payload, token);
      await refreshBuildingMembers();
      await refreshBuildings();
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  async function updateBuildingMember(id, patch) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.updateMember(id, patch, token);
      await refreshBuildingMembers();
      await refreshBuildings();
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  async function deleteBuildingMember(id) {
    try {
      if (!systemAdmin || !token) return setLoginModal(true);
      await buildingService.deleteMember(id, token);
      await refreshBuildingMembers();
      await refreshBuildings();
    } catch (e) {
      message.error(e.message || String(e));
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

  const currentRoomReadings = useCallback(
    (room) => {
      if (!room) return { electricity: "", water: "" };
      const month = String(state.settings.billingMonth || "").slice(0, 7);
      const pickReading = (list) => {
        if (!Array.isArray(list) || !list.length) return "";
        const byMonth = month
          ? list.find((row) => String(row?.month || "").slice(0, 7) === month)
          : null;
        const record = byMonth || list[0];
        const candidates = [
          record?.end_reading,
          record?.endReading,
          record?.start_reading,
          record?.startReading,
        ];
        for (const value of candidates) {
          if (value == null || value === "") continue;
          const n = Number(value);
          if (Number.isFinite(n)) return n;
        }
        return "";
      };
      return {
        electricity: pickReading(room.electricity),
        water: pickReading(room.water),
      };
    },
    [state.settings.billingMonth],
  );

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

  const activityLogLookup = useMemo(() => {
    const workers = new Map();
    const rooms = new Map();
    const floors = new Map();
    const stays = new Map();

    for (const w of state.workers || []) {
      workers.set(w.id, {
        id: w.id,
        name: w.fullName || w.employeeCode || "",
        label: [w.employeeCode, w.fullName].filter(Boolean).join(" - ") || w.id,
      });
    }

    for (const f of state.floors || []) {
      floors.set(f.id, { id: f.id, name: f.name || "", label: f.name || f.id });
      for (const r of f.rooms || []) {
        rooms.set(r.id, {
          id: r.id,
          code: r.code || "",
          floorName: f.name || "",
          label: `${f.name ? `${f.name} · ` : ""}Phòng ${r.code || r.id}`,
        });
        for (const st of r.stays || []) {
          const worker = workers.get(st.workerId);
          const room = rooms.get(r.id);
          stays.set(st.id, {
            id: st.id,
            workerId: st.workerId,
            roomId: r.id,
            workerLabel: worker?.label || worker?.name || "",
            roomLabel: room?.label || "",
            label: [worker?.label || worker?.name, room?.label].filter(Boolean).join(" · "),
          });
        }
      }
    }

    return { workers, rooms, floors, stays };
  }, [state.floors, state.workers]);

  const utilityBilling = useMemo(
    () =>
      calculateUtilityBilling({
        floors: state.floors,
        workers: state.workers,
        settings: state.settings,
      }),
    [state.floors, state.settings, state.workers],
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
          electricityEndReading:
            electricity?.end_reading ?? electricity?.endReading ?? "",
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
          const charge =
            utilityBilling.byRoom.get(r.id)?.byWorker?.get(st.workerId) || {};
          const rent = utilityBilling.byStay?.get?.(st.id) || {};
          const active = !st.dateOut;
          const electricityAmount = active
            ? Number(charge.electricityAmount || 0)
            : Number(st.electricityAmount || 0);
          const waterAmount = active
            ? Number(charge.waterAmount || 0)
            : Number(st.waterAmount || 0);
          const storedTotal = Number(st.totalAmount || 0);
          const storedRoomAmount = Math.max(
            0,
            storedTotal -
              Number(st.electricityAmount || 0) -
              Number(st.waterAmount || 0),
          );
          const roomAmount = active
            ? Number(rent.amount || 0)
            : Math.max(storedRoomAmount, Number(rent.amount || 0));
          const calculatedTotal = electricityAmount + waterAmount + roomAmount;
          const total = active
            ? calculatedTotal
            : Math.max(storedTotal, calculatedTotal);
          if (total <= 0) continue;
          const paid = isStayBillingMonthPaid({
            stay: st,
            payments: state.payments || [],
            billingMonth: month,
          });
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
            initialDateIn: st.initialDateIn || st.dateIn,
            transferDate: st.transferDate || "",
            freeRoomDays: Number(w?.freeRoomDays || 0),
            active,
            paid,
            paidMonth: st.utilityPaidMonth || "",
            electricityAmount,
            waterAmount,
            roomAmount,
            roomDays: Number(rent.days || 0),
            totalAmount: total,
            paidAt: st.utilityPaidAt || null,
          });
        }
      }
    }
    return rows.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return String(b.dateOut || b.dateIn || "").localeCompare(
        String(a.dateOut || a.dateIn || ""),
      );
    });
  }, [state.floors, state.payments, state.settings.billingMonth, utilityBilling, workerById]);

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
    const month = String(state.settings.billingMonth || "").slice(0, 7);
    // Hi???n th??? t???i ??a 12 th??ng g???n nh???t t??nh ?????n k??? ??ang ch??n.
    const minMonth = month ? earlierBillingMonth(month, 11) : "";
    const rows = [];
    for (const x of allElectricity) {
      const list = Array.isArray(x.electricityList) ? x.electricityList : [];
      for (const e of list) {
        const em = String(e?.month || "").slice(0, 7);
        if (month && em && (em > month || (minMonth && em < minMonth))) continue;
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
  }, [
    allElectricity,
    electricityHistoryMode,
    state.settings.billingMonth,
    utilityBilling,
  ]);

  const pendingElectricityCount = workerPaymentRows.filter(
    (row) => !row.paid,
  ).length;
  const pendingElectricityAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? 0 : Number(row.electricityAmount || 0)),
    0,
  );
  const paidElectricityCount = workerPaymentRows.filter(
    (row) => row.paid,
  ).length;
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
  const pendingRoomAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? 0 : Number(row.roomAmount || 0)),
    0,
  );
  const paidRoomAmount = workerPaymentRows.reduce(
    (sum, row) => sum + (row.paid ? Number(row.roomAmount || 0) : 0),
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
  const currentRoomLimit = Math.max(0, Math.floor(Number(currentBuilding?.room_limit ?? currentBuilding?.roomLimit ?? 0)));
  const roomLimitReached = currentRoomLimit > 0 && totalRooms >= currentRoomLimit;

  function requestedRoomCount(payload = {}) {
    if (payload.mode === "ranges" && Array.isArray(payload.floorRanges)) {
      return payload.floorRanges.reduce((sum, row) => {
        const start = Math.floor(Number(row?.startNo));
        const end = Math.floor(Number(row?.endNo));
        return sum + (Number.isInteger(start) && Number.isInteger(end) && end >= start ? end - start + 1 : 0);
      }, 0);
    }
    return Math.max(0, Math.floor(Number(payload.floors || 0))) * Math.max(0, Math.floor(Number(payload.roomsPerFloor || 0)));
  }

  function assertRoomLimit(extraRooms = 1) {
    if (currentRoomLimit <= 0) return true;
    const nextTotal = totalRooms + Number(extraRooms || 0);
    if (nextTotal <= currentRoomLimit) return true;
    message.warning(`Tòa nhà giới hạn ${currentRoomLimit} phòng. Hiện có ${totalRooms}, thao tác này sẽ thành ${nextTotal}.`);
    return false;
  }
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
      billingCloseDay: state.settings.billingCloseDay,
      utilityBilling,
      workerPaymentRows,
      todayISO,
    });
  }

  function exportWorkerInvoice(row) {
    if (!row?.stayId) return;
    const worker = workerById.get(row.workerId) || {
      id: row.workerId,
      employeeCode: row.employeeCode,
      fullName: row.workerName,
    };
    const stay = state.floors
      .flatMap((floor) => floor.rooms)
      .flatMap((room) => room.stays || [])
      .find((item) => item.id === row.stayId) || row;
    exportWorkerInvoiceSvc({
      building: currentBuilding,
      billingMonth: state.settings.billingMonth,
      billingCloseDay: state.settings.billingCloseDay,
      floorName: row.floorName,
      roomCode: row.roomCode,
      worker,
      stay,
      charge: {
        roomAmount: row.roomAmount,
        electricityAmount: row.electricityAmount,
        waterAmount: row.waterAmount,
      },
      paid: !!row.paid,
      paidAt: row.paidAt || "",
      adminContact: state.settings.adminContact || {},
    });
  }

  function exportRoomInvoice(roomId) {
    if (!roomId) return;
    let targetFloor = null;
    let targetRoom = null;
    for (const f of state.floors) {
      const found = f.rooms.find((r) => r.id === roomId);
      if (found) {
        targetFloor = f;
        targetRoom = found;
        break;
      }
    }
    if (!targetRoom) return;
    const roomBilling = utilityBilling.byRoom.get(roomId);
    const workerCharges = roomBilling?.byWorker || new Map();
    const paymentRowByStayId = new Map(
      workerPaymentRows.map((row) => [row.stayId, row]),
    );
    exportRoomInvoiceSvc({
      building: currentBuilding,
      billingMonth: state.settings.billingMonth,
      billingCloseDay: state.settings.billingCloseDay,
      floorName: targetFloor?.name || "",
      room: targetRoom,
      workers: state.workers,
      workerCharges,
      paymentRowByStayId,
      adminContact: state.settings.adminContact || {},
      electricity: roomBilling?.electricity || null,
      water: roomBilling?.water || null,
    });
  }

  async function exportActivityLogs({ dateFrom, dateTo, resolveDetail }) {
    if (!dateFrom || !dateTo) {
      message.warning("Chọn khoảng ngày cần xuất log.");
      return;
    }
    try {
      const rows = await activityLogService.getAll(token, {
        dateFrom,
        dateTo,
        limit: 5000,
      });
      exportActivityLogExcelSvc({
        rows: (Array.isArray(rows) ? rows : []).map((row) => ({
          ...row,
          detail: resolveDetail?.(row) || "",
        })),
        dateFrom,
        dateTo,
        todayISO,
      });
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  async function advanceNextMonthReadingsForRoom(roomId) {
    const month = state.settings.billingMonth || "";
    const nextMonth = nextBillingMonth(month);
    if (!nextMonth) return;
    const nextPeriod = getBillingPeriod(
      nextMonth,
      state.settings.billingCloseDay || 1,
    );
    const roomRow = paymentRoomRows.find((row) => row.roomId === roomId);
    if (!roomRow) return;
    const jobs = [
      {
        type: "electricity",
        service: electricityService,
        record: roomRow.electricity,
        end: roomRow.electricityEndReading,
      },
      {
        type: "water",
        service: waterService,
        record: roomRow.water,
        end: roomRow.waterEndReading,
      },
    ];
    for (const job of jobs) {
      if (job.end === "" || job.end == null) continue;
      if (job.record) {
        await job.service.upsert(
          {
            id: job.record.id,
            room_id: roomId,
            month: job.record.month || month,
            start_reading:
              job.record.start_reading ?? job.record.startReading ?? 0,
            end_reading:
              job.record.end_reading ?? job.record.endReading ?? job.end,
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
      const period = getBillingPeriod(month, state.settings.billingCloseDay || 1);
      const paidAt = new Date().toISOString();
      const stay = state.floors
        .flatMap((floor) => floor.rooms)
        .flatMap((room) => room.stays || [])
        .find((item) => item.id === row.stayId);
      const existingPayments = (state.payments || []).filter((item) => item.stayId === row.stayId);
      const legacyMonth = !existingPayments.length && stay?.utilityPaidAt
        ? String(stay.utilityPaidMonth || "").slice(0, 7)
        : "";
      const legacyPeriod = legacyMonth ? getBillingPeriod(legacyMonth, state.settings.billingCloseDay || 1) : null;
      await paymentService.upsert(
        {
          stay_id: row.stayId,
          room_id: row.roomId,
          worker_id: row.workerId,
          type: "stay_billing",
          billing_month: month,
          period_start: period.start,
          period_end: period.end,
          electricity_amount: Number(row.electricityAmount || 0),
          water_amount: Number(row.waterAmount || 0),
          room_amount: Number(row.roomAmount || 0),
          amount: Number(row.totalAmount || 0),
          source: legacyMonth === month ? "legacy_watermark" : "monthly",
          paid_at: paidAt,
          breakdown: { billingMonth: month, period },
          ...(legacyMonth && legacyMonth < month ? {
            legacy_payment: {
              room_id: row.roomId,
              worker_id: row.workerId,
              billing_month: legacyMonth,
              period_start: legacyPeriod.start,
              period_end: legacyPeriod.end,
              electricity_amount: Number(stay.electricityAmount || 0),
              water_amount: Number(stay.waterAmount || 0),
              room_amount: Number(stay.roomAmount || 0),
              amount: Number(stay.totalAmount || 0),
              source: "legacy_watermark",
              paid_at: stay.utilityPaidAt,
              note: "Mốc thanh toán được chuyển từ dữ liệu cũ",
            },
          } : {}),
          stay_patch: {
            electricity_amount: Number(row.electricityAmount || 0),
            water_amount: Number(row.waterAmount || 0),
            total_amount: Number(row.totalAmount || 0),
            utility_paid_at: paidAt,
            utility_paid_month: month,
          },
        },
        token,
      );

      const roomRows = workerPaymentRows.filter(
        (item) => item.roomId === row.roomId,
      );
      const allPaid =
        roomRows.length > 0 &&
        roomRows.every((item) => item.stayId === row.stayId || item.paid);
      if (allPaid) {
        await advanceNextMonthReadingsForRoom(row.roomId);
      }
      await loadAllFromDb();
    } catch (e) {
      message.error(e.message || String(e));
    }
  }

  function guardDelete({ title, message, onDelete }) {
    if (!auth.isAdmin) return setLoginModal(true);

    if (!state.settings.canDeleteStructure) {
      message.warning("Chức năng xóa tầng/phòng đang bị tắt trong Cài đặt.");
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
      if (!assertRoomLimit(requestedRoomCount(payload))) return false;
      await dataLoader.initKtx(payload, token);
      await loadAllFromDb();
      message.success("Khởi tạo KTX thành công!");
      return true;
    } catch (e) {
      message.error(e.message || String(e));
      return false;
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
      <div className="mx-auto w-full max-w-md px-4 pt-4 app-safe-top">
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
      <div
        className={clsx(
          "app-shell grid place-items-center bg-slate-50 text-sm text-slate-500",
          installApp?.isStandalone && "app-shell--standalone",
        )}
      >
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <AuthScreen settings={state.settings} />
      </Suspense>
    );
  }

  if (systemAdmin) {
    return (
      <div
        className={clsx(
          "app-shell min-h-screen bg-sky-50 text-slate-900",
          installApp?.isStandalone && "app-shell--standalone",
        )}
      >
        <div className="sticky top-0 z-40 bg-gradient-to-b from-sky-50 to-sky-50/80 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-4 app-safe-top">
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
            installApp={installApp}
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
              updateBrandSettings: async (nextSettings) => {
                const brandSettings = {
                  ...nextSettings,
                  __globalBrand: true,
                };
                setState((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    siteName: nextSettings.siteName,
                    logoUrl: nextSettings.logoUrl,
                    about: {
                      ...(prev.settings?.about || {}),
                      brandLogoUrl: nextSettings.logoUrl,
                    },
                  },
                }));
                await saveSettingsToDb(brandSettings);
              },
              addMember: addBuildingMember,
              updateMember: updateBuildingMember,
              deleteMember: deleteBuildingMember,
            }}
          />
        </Suspense>
        <InstallFloatingBanner installApp={installApp} settings={state.settings} />
        <IosInstallGuideDialog
          open={installApp.guideOpen}
          onClose={() => installApp.setGuideOpen(false)}
          settings={state.settings}
          platform={installApp.guideMode}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "app-shell min-h-screen bg-slate-50 text-slate-900",
        installApp?.isStandalone && "app-shell--standalone",
      )}
    >
      {Header}
      <Suspense fallback={<LazyFallback />}>
        {tab === "ktx" ? (
          <KtxView
            state={state}
            auth={auth}
            currentBuilding={currentBuilding}
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
            pendingRoomAmount={pendingRoomAmount}
            paidRoomAmount={paidRoomAmount}
            workerPaymentRows={workerPaymentRows}
            markWorkerUtilityPaid={markWorkerUtilityPaid}
            exportWorkerInvoice={exportWorkerInvoice}
            openElectricityHistory={openHistory}
            activityLogs={activityLogs}
            activityLogLoading={activityLogLoading}
            loadActivityLogs={loadActivityLogs}
            activityLogLookup={activityLogLookup}
            exportActivityLogs={exportActivityLogs}
          />
        ) : null}
        {tab === "about" ? (
          <AccountView user={user} settings={state.settings} />
        ) : null}
        {tab === "buildings" ? (
          <BuildingsHome
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            setSelectedBuildingId={setSelectedBuildingId}
            setTab={setTab}
            user={user}
            token={token}
          />
        ) : null}
        {tab === "admin" && systemAdmin ? (
          <AdminBuildingsView
            buildings={buildings}
            users={buildingUsers}
            authSettings={authSettings}
            settings={state.settings}
            installApp={installApp}
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
        ) : null}
      </Suspense>
      {/* bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-4 pb-4 app-safe-bottom app-no-select">
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
      <InstallFloatingBanner installApp={installApp} settings={state.settings} />
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
                return await checkOutStay({
                  ...payload,
                  dateOut: payload?.dateOut || todayISO(),
                });
              },
              undoDeparture: async (payload) => {
                await undoDeparture(payload || {});
              },
              updateDeparture: async (payload) => {
                return await checkOutStay({
                  ...payload,
                  dateOut: payload?.dateOut || todayISO(),
                  editing: true,
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
                const fromRoomId = roomCtx?.room?.id || roomModal.roomId;
                const fromReadings = currentRoomReadings(roomCtx?.room);
                const currentStay = (roomCtx?.room?.stays || []).find((item) => item.id === stayId);
                const currentWorker = workerById.get(workerId);
                setTransferModal({
                  open: true,
                  stayId,
                  workerId,
                  fromRoomId,
                  toRoomId: "",
                  date: todayISO(),
                  initialDateIn: currentStay?.initialDateIn || currentStay?.dateIn || "",
                  freeRoomDays: Number(currentWorker?.freeRoomDays || 0),
                  fromElectricityReading: fromReadings.electricity,
                  fromWaterReading: fromReadings.water,
                  toElectricityReading: "",
                  toWaterReading: "",
                });
              },
              utilityChargesByWorkerId:
                utilityBilling.byRoom.get(roomCtx?.room?.id)?.byWorker ||
                new Map(),
              exportRoomInvoice: () => exportRoomInvoice(roomCtx?.room?.id),
              exportWorkerInvoice: (workerId) => {
                const stay = (roomCtx?.room?.stays || []).find(
                  (s) => s.workerId === workerId && !s.dateOut,
                );
                if (!stay) return;
                const row = workerPaymentRows.find((r) => r.stayId === stay.id);
                if (row) exportWorkerInvoice(row);
              },
              electricityPrice: state.settings.electricityPrice,
              waterPrice: state.settings.waterPrice,
              waterBillingMode: state.settings.waterBillingMode,
              roomMonthlyPrice: state.settings.roomMonthlyPrice,
              roomBillingMode: state.settings.roomBillingMode,
              payments: state.payments || [],
              billingMonth: state.settings.billingMonth,
              billingCloseDay: state.settings.billingCloseDay,
              upsertUtility: async (rec) => {
                try {
                  if (!token) return setLoginModal(true);
                  const service =
                    rec.type === "water" ? waterService : electricityService;
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
                  message.error(e.message || String(e));
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
              billingMonth: state.settings.billingMonth,
              billingCloseDay: state.settings.billingCloseDay,
              updateWorker: async ({ workerId, patch }) => {
                return await updateWorker(workerId, patch || {});
              },
              updateStayReadings: async ({
                stayId,
                electricityStartReading,
                waterStartReading,
              }) => {
                try {
                  if (!token) {
                    setLoginModal(true);
                    return false;
                  }
                  await stayService.update(
                    stayId,
                    {
                      electricity_start_reading: Number(electricityStartReading || 0),
                      water_start_reading: Number(waterStartReading || 0),
                    },
                    token,
                  );
                  await loadAllFromDb();
                  return true;
                } catch (e) {
                  message.error(e.message || String(e));
                  return false;
                }
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
          setTransferModal((m) => ({
            ...m,
            open: false,
            toRoomId: "",
            toElectricityReading: "",
            toWaterReading: "",
          }))
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            Nhập chỉ số điện/nước phòng cũ (lúc rời) và phòng mới (lúc vào) để
            chia tiền cho đúng.
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Phòng chuyển tới
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={transferModal.toRoomId}
            onChange={(e) => {
              const nextRoomId = e.target.value;
              const nextRoom = nextRoomId ? roomById.get(nextRoomId) : null;
              const toReadings = currentRoomReadings(nextRoom);
              setTransferModal((m) => ({
                ...m,
                toRoomId: nextRoomId,
                toElectricityReading: toReadings.electricity,
                toWaterReading: toReadings.water,
              }));
            }}
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

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <div>
              <div className="text-xs font-semibold text-emerald-800">
                Ngày vào KTX
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(transferModal.initialDateIn, "—")}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-800">
                Số ngày ở miễn phí
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {Number(transferModal.freeRoomDays || 0)} ngày
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              Chỉ số phòng cũ (lúc rời)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <div className="text-xs font-medium text-slate-600">
                  Số điện
                </div>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={transferModal.fromElectricityReading}
                  onChange={(e) =>
                    setTransferModal((m) => ({
                      ...m,
                      fromElectricityReading: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <div className="text-xs font-medium text-slate-600">
                  Số nước
                </div>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={transferModal.fromWaterReading}
                  onChange={(e) =>
                    setTransferModal((m) => ({
                      ...m,
                      fromWaterReading: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
            <div className="text-xs font-semibold text-sky-700">
              Chỉ số phòng mới (lúc vào)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <div className="text-xs font-medium text-slate-600">
                  Số điện
                </div>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={transferModal.toElectricityReading}
                  onChange={(e) =>
                    setTransferModal((m) => ({
                      ...m,
                      toElectricityReading: e.target.value,
                    }))
                  }
                  disabled={!transferModal.toRoomId}
                />
              </label>
              <label className="block space-y-1">
                <div className="text-xs font-medium text-slate-600">
                  Số nước
                </div>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={transferModal.toWaterReading}
                  onChange={(e) =>
                    setTransferModal((m) => ({
                      ...m,
                      toWaterReading: e.target.value,
                    }))
                  }
                  disabled={!transferModal.toRoomId}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
              onClick={() =>
                setTransferModal((m) => ({
                  ...m,
                  open: false,
                  toRoomId: "",
                  toElectricityReading: "",
                  toWaterReading: "",
                }))
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
                  message.warning("Bạn chưa chọn phòng chuyển tới.");
                  return;
                }
                if (
                  transferModal.fromElectricityReading === "" ||
                  transferModal.fromWaterReading === "" ||
                  transferModal.toElectricityReading === "" ||
                  transferModal.toWaterReading === ""
                ) {
                  message.warning("Vui lòng nhập đủ chỉ số điện/nước phòng cũ và phòng mới.");
                  return;
                }

                const ok = await transferWorker({
                  stayId: transferModal.stayId,
                  workerId: transferModal.workerId,
                  toRoomId: transferModal.toRoomId,
                  transferDate: transferModal.date || todayISO(),
                  fromElectricityReading: transferModal.fromElectricityReading,
                  fromWaterReading: transferModal.fromWaterReading,
                  toElectricityReading: transferModal.toElectricityReading,
                  toWaterReading: transferModal.toWaterReading,
                });

                if (ok) {
                  setTransferModal((m) => ({
                    ...m,
                    open: false,
                    toRoomId: "",
                    toElectricityReading: "",
                    toWaterReading: "",
                  }));
                }
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
            roomLimit={currentRoomLimit}
            currentRoomCount={totalRooms}
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
            roomLimit={currentRoomLimit}
            currentRoomCount={totalRooms}
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
            roomLimit={currentRoomLimit}
            currentRoomCount={totalRooms}
            roomLimitReached={roomLimitReached}
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
      <IosInstallGuideDialog
        open={installApp.guideOpen}
        onClose={() => installApp.setGuideOpen(false)}
        settings={state.settings}
        platform={installApp.guideMode}
      />

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
            installApp={installApp}
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
          />
        </Suspense>
      ) : null}

      <Modal
        open={expiredBuildingNoticeOpen}
        title="Tòa nhà đã hết hạn"
        onClose={() => setExpiredBuildingNoticeOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-100">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-rose-800">
                  Không thể thực hiện thao tác
                </div>
                <div className="mt-1 text-sm leading-5 text-rose-700">
                  Tòa nhà hiện tại đã hết hạn. Vui lòng liên hệ admin để gia hạn
                  hoặc chọn tòa nhà khác còn hiệu lực.
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm"
            onClick={() => setExpiredBuildingNoticeOpen(false)}
          >
            Đã hiểu
          </button>
        </div>
      </Modal>

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
                message.warning("Tài khoản đăng nhập chưa có username.");
                return;
              }
              try {
                await authService.login(identity, deletePass);
                await deletePassModal.onDelete?.();
              } catch {
                message.error("Mật khẩu đăng nhập không đúng.");
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
