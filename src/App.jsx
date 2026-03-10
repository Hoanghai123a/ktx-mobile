import React, { useEffect, useMemo, useRef, useState } from "react";
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
import * as XLSX from "xlsx";
import { supabase } from "./services/supabaseClient";
// UI (App.jsx thường chỉ còn 2 cái này)
import Confirm from "./components/ui/Confirm";
import TabButton from "./components/ui/TabButton";

// Features
import LoginModal from "./features/auth/LoginModal";
import DeleteGuardModal from "./features/settings/DeleteGuardModal";
import SettingsModal from "./features/settings/SettingsModal";

import KtxView from "./features/ktx/KtxView";
import RoomModal from "./features/ktx/RoomModal";
import WorkerModal from "./features/ktx/WorkerModal";
import AddFloorModal from "./features/ktx/AddFloorModal";
import AddRoomModal from "./features/ktx/AddRoomModal";
import ImportExcelModal from "./features/ktx/ImportExcelModal";
import InitKtxModal from "./features/ktx/InitKtxModal";
import StaysHistoryModal from "./features/ktx/StaysHistoryModal";

import WorkersView from "./features/workers/WorkersView";
import AddWorkerModal from "./features/workers/AddWorkerModal";
import StatsView from "./features/stats/StatsView";
import RecruiterModal from "./features/stats/RecruiterModal";
import ElectricityHistoryModal from "./features/ktx/ElectricityHistoryModal";
import AboutView from "./features/about/AboutView";

// Services
import {
  loadSettingsFromDb,
  saveSettingsToDb,
} from "./services/settingsService";

import {
  loadAllFromDb as loadAllFromDbSvc,
  initKtxFromInputs as initKtxSvc,
  wipeDatabase,
} from "./services/ktxDbService";
import {
  addFloor as addFloorSvc,
  deleteFloor as deleteFloorSvc,
  addRoom as addRoomSvc,
  updateRoomCode as updateRoomCodeSvc,
  deleteRoom as deleteRoomSvc,
  checkInWorker as checkInWorkerSvc,
  checkOutStay as checkOutStaySvc,
  transferWorker as transferWorkerSvc,
  upsertElectricity as upsertElectricitySvc,
  markElectricityPaid as markElectricityPaidSvc,
} from "./services/ktxMutationsService";

import {
  addWorker as addWorkerSvc,
  updateWorker as updateWorkerSvc,
  deleteWorker as deleteWorkerSvc,
} from "./services/workersService";
import { importExcelFileToDb } from "./services/excelImportService";
import { exportExcel as exportExcelSvc } from "./services/excelExportService";
import Pill from "./components/ui/Pill";

// ---------------------------
// Utility Functions
// ---------------------------
function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

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
// ---------------------------
// Inline UI helpers (fallback nếu bạn chưa import từ components/ui)
// ---------------------------
function InlineModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900">
              {title || ""}
            </div>
          </div>
          <button
            className="rounded-xl px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

function InlineTextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      ) : null}
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
    </label>
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

// ---------------------------
// Main App
// ---------------------------
export default function App() {
  const DEFAULT_SETTINGS = useMemo(
    () => ({
      siteName: "KTX",
      roomGridCols: 3,
      adminPassword: "123456",
      canDeleteStructure: false, // bật/tắt xóa tầng/phòng
      requirePasswordOnDelete: true, // bắt nhập mật khẩu trước khi xóa
      // electricity billing
      electricityPrice: 0, // tiền điện / số
      billingMonth: new Date().toISOString().slice(0, 7), // YYYY-MM

      about: {
        companyName: "Ký túc xá",
        address: "",
        hotline: "0343.751.753",
        email: "",
        website: "",
        mapUrl: "",
        workingHours: "",
        services: [],
        rules: "",
        bankInfo: "",
        description: "",
        adminNotice: "",
      },
    }),
    [],
  );
  const [state, setState] = useState(() => ({
    floors: [],
    workers: [],
    settings: DEFAULT_SETTINGS,
  }));

  const [auth, setAuth] = useState({ isAdmin: false });
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
  // ---------------------------
  // Settings persistence (Supabase)
  // Table: app_settings (id=1, data=jsonb)
  // ---------------------------

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setAuth({ isAdmin: !!data.session });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ isAdmin: !!session });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadAllFromDb();
      } catch (e) {
        console.error(e);
        alert(
          "Không tải được dữ liệu từ Supabase: " + (e?.message || String(e)),
        );
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const nextSettings = await loadSettingsFromDb(DEFAULT_SETTINGS);
      setState((s) => ({ ...s, settings: nextSettings }));
    })();
  }, []);

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
  const [electricityHistoryOpen, setElectricityHistoryOpen] = useState(false);
  const [electricityHistoryMode, setElectricityHistoryMode] = useState("all"); // "paid"|"pending"
  const billingMonth = state.settings?.electricityMonth; // hoặc key tháng bạn đang dùng
  // nếu settings bạn tên khác (vd electricityBillingMonth) thì đổi lại cho đúng

  const openHistory = (mode) => {
    setElectricityHistoryMode(mode);
    setElectricityHistoryOpen(true);
  };
  const [electricityHistoryFilter, setElectricityHistoryFilter] =
    useState(null); // 'pending' | 'paid' | null

  // Picker check-in (được RoomModal gọi qua actions.openCheckInPicker)
  const [checkInPicker, setCheckInPicker] = useState({
    open: false,
    floorId: null,
    roomId: null,
    q: "",
    dateIn: todayISO(),
  });

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
  const [confirm, setConfirm] = useState({ open: false });
  const [recruiterModal, setRecruiterModal] = useState({
    open: false,
    recruiter: null,
  });

  useEffect(() => {
    // keep selected floor valid
    if (!state.floors.some((f) => f.id === floorId)) {
      setFloorId(state.floors?.[0]?.id || "");
    }
  }, [state.floors, floorId]);

  async function initKtxFromInputs(payload) {
    try {
      const ok = await initKtxSvc(payload);
      await loadAllFromDb();
      alert("Khởi tạo KTX thành công!");
      return ok;
    } catch (e) {
      alert(e.message || String(e));
      return false;
    }
  }

  const workerById = useMemo(() => {
    const map = new Map();
    for (const w of state.workers) map.set(w.id, w);
    return map;
  }, [state.workers]);

  const floor = useMemo(
    () => state.floors.find((f) => f.id === floorId) || state.floors[0],
    [state.floors, floorId],
  );

  async function handleWipeDatabase() {
    await wipeDatabase(); // gọi service
    await loadAllFromDb(); // refresh UI
  }

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

  async function loadAllFromDb() {
    const { floors, workers } = await loadAllFromDbSvc();
    setState((s) => ({ ...s, floors, workers }));
    if (!floorId && floors[0]?.id) setFloorId(floors[0].id);
  }
  async function importExcelFile(file) {
    if (!file) return;
    if (!auth.isAdmin) return setLoginModal(true);

    // ensure modal visible when starting
    setImportModal((m) => ({ ...m, open: true, busy: true, result: null }));
    try {
      const result = await importExcelFileToDb(file);
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

  async function addFloor(name) {
    try {
      const floorName =
        (name || "").trim() || `Tầng ${state.floors.length + 1}`;
      const sort = state.floors.length + 1;
      const id = await addFloorSvc({ name: floorName, sort });
      await loadAllFromDb();
      setFloorId(id);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteFloor(floorId) {
    try {
      const fl = state.floors.find((f) => f.id === floorId);
      const roomIds = (fl?.rooms || []).map((r) => r.id);
      await deleteFloorSvc({ floorId, roomIds });
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
      await addRoomSvc({ floorId, code: roomCode, sort });
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function updateRoomCode(floorId, roomId, newCode) {
    try {
      const nextCode = (newCode || "").trim();
      if (!nextCode) return alert("Tên phòng không được để trống.");
      await updateRoomCodeSvc({ roomId, code: nextCode });
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteRoom(floorId, roomId) {
    try {
      await deleteRoomSvc({ roomId });
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function resetDb() {
    if (!auth.isAdmin) {
      setLoginModal(true);
      return;
    }

    const ok = confirm("Reset DB? Sẽ xóa toàn bộ tầng/phòng/NLĐ/lịch sử.");
    if (!ok) return;

    // Xóa theo thứ tự an toàn
    const a = await supabase.from("stays").delete().neq("id", ""); // delete all
    if (a.error) return alert("Reset lỗi (stays): " + a.error.message);

    const b = await supabase.from("workers").delete().neq("id", "");
    if (b.error) return alert("Reset lỗi (workers): " + b.error.message);

    const c = await supabase.from("rooms").delete().neq("id", "");
    if (c.error) return alert("Reset lỗi (rooms): " + c.error.message);

    const d = await supabase.from("floors").delete().neq("id", "");
    if (d.error) return alert("Reset lỗi (floors): " + d.error.message);

    alert("Đã reset DB.");
    await loadAllFromDb();

    // đóng settings về trang chủ nếu muốn
    setSettingsModal(false); // nếu bạn có state này
    setTab("ktx");
  }

  async function addWorker(worker) {
    try {
      return await addWorkerSvc(worker);
    } catch (e) {
      alert(e.message || String(e));
      return null;
    }
  }

  async function updateWorker(workerId, patch) {
    try {
      await updateWorkerSvc(workerId, patch);
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function deleteWorker(workerId) {
    try {
      await deleteWorkerSvc(workerId);
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function checkInWorker({ floorId, roomId, workerId, dateIn }) {
    try {
      await checkInWorkerSvc({
        roomId,
        workerId,
        dateIn: dateIn || todayISO(),
      });
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function checkOutStay({ floorId, roomId, stayId, dateOut }) {
    try {
      await checkOutStaySvc({ stayId, dateOut });
      await loadAllFromDb();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function transferWorker({ stayId, workerId, toRoomId, transferDate }) {
    try {
      const d = transferDate || todayISO();
      await transferWorkerSvc({ stayId, workerId, toRoomId, transferDate: d });
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

  const electricityByRoomId = useMemo(() => {
    const m = new Map();
    for (const f of state.floors) {
      for (const r of f.rooms) {
        if (r.electricity) m.set(r.id, r.electricity);
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
      f.rooms.map((r) => ({
        roomId: r.id,
        roomCode: r.code,
        electricity: r.electricity,
      })),
    );
  }, [state.floors]);

  const pendingElectricity = useMemo(() => {
    return allElectricity.filter((x) => {
      const e = x.electricity;
      return (
        e &&
        !e.paid &&
        e.month === state.settings.billingMonth &&
        e.start != null &&
        e.end != null
      );
    });
  }, [allElectricity, state.settings.billingMonth]);

  const paidElectricity = useMemo(() => {
    return allElectricity.filter((x) => {
      const e = x.electricity;
      return e && e.paid && e.month === state.settings.billingMonth;
    });
  }, [allElectricity, state.settings.billingMonth]);

  const pendingElectricityCount = pendingElectricity.length;
  const pendingElectricityAmount = pendingElectricity.reduce((sum, x) => {
    const e = x.electricity;
    const used = Number(e.end || 0) - Number(e.start || 0);
    return sum + Math.max(0, used) * (state.settings.electricityPrice || 0);
  }, 0);

  const paidElectricityCount = paidElectricity.length;
  const paidElectricityAmount = paidElectricity.reduce((sum, x) => {
    const e = x.electricity;
    const used = Number(e.end || 0) - Number(e.start || 0);
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

  // ---------------------------
  // Room modal
  // ---------------------------
  const roomCtx = useMemo(() => {
    if (!roomModal.open) return null;
    const f = state.floors.find((x) => x.id === roomModal.floorId);
    const r = f?.rooms.find((x) => x.id === roomModal.roomId);
    return f && r ? { floor: f, room: r } : null;
  }, [roomModal, state.floors]);

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

  function openElectricityHistory(type) {
    setElectricityHistoryFilter(type); // "paid" | "pending"
    setElectricityHistoryOpen(true);
  }

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {Header}
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
          openElectricityHistory={(filter) => {
            setElectricityHistoryFilter(filter);
            setElectricityHistoryOpen(true);
          }}
        />
      ) : null}
      {tab === "about" ? <AboutView about={state.settings?.about} /> : null}
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
      <RoomModal
        open={roomModal.open}
        onClose={() => setRoomModal({ open: false, floorId: "", roomId: "" })}
        floor={roomCtx?.floor || null}
        room={roomCtx?.room || null}
        workerById={workerById}
        auth={auth}
        requireAdmin={requireAdmin}
        actions={{
          updateRoom: async ({ roomId, patch }) => {
            if (!roomCtx?.floor?.id) return;
            await updateRoomCode(roomCtx.floor.id, roomId, patch?.code || "");
          },
          deleteRoom: async ({ roomId }) => {
            if (!roomCtx?.floor?.id) return;
            await deleteRoom(roomCtx.floor.id, roomId);
            setRoomModal({ open: false, floorId: "", roomId: "" });
          },
          checkOut: async ({ stayId }) => {
            // floorId/roomId không bắt buộc cho service hiện tại
            await checkOutStay({ stayId, dateOut: todayISO() });
          },
          // new manual check-in actions
          addWorker: async (w) => {
            return await addWorker(w);
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
            await upsertElectricitySvc(rec);
            await loadAllFromDb();
          },
          markElectricityPaid: async (rec) => {
            await markElectricityPaidSvc(rec);
            await loadAllFromDb();
          },
        }}
      />

      {/* WorkerModal - component tách file */}
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
            await updateWorker(workerId, patch || {});
          },
          deleteWorker: async ({ workerId }) => {
            await deleteWorker(workerId);
            setWorkerModal({ open: false, workerId: null, roomCtx: null });
          },
        }}
      />

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

      {/* Check-in Picker Modal (inline) */}
      <InlineModal
        open={checkInPicker.open}
        title="Chọn NLĐ để check-in"
        onClose={() =>
          setCheckInPicker((s) => ({
            ...s,
            open: false,
            roomId: null,
            floorId: null,
            q: "",
          }))
        }
      >
        <div className="space-y-3">
          <InlineTextField
            label="Tìm NLĐ"
            value={checkInPicker.q}
            onChange={(v) => setCheckInPicker((s) => ({ ...s, q: v }))}
            placeholder="Nhập tên / SĐT..."
          />
          <InlineTextField
            label="Ngày vào"
            value={checkInPicker.dateIn}
            onChange={(v) => setCheckInPicker((s) => ({ ...s, dateIn: v }))}
            type="date"
          />

          <div className="space-y-2">
            {state.workers
              .filter((w) => {
                const key =
                  `${w.fullName || ""} ${w.phone || ""}`.toLowerCase();
                const qq = (checkInPicker.q || "").trim().toLowerCase();
                if (!qq) return true;
                return key.includes(qq);
              })
              .map((w) => {
                const isOccupied = occupiedWorkerIds.has(w.id);
                return (
                  <button
                    key={w.id}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50"
                    onClick={() =>
                      requireAdmin(async () => {
                        if (!checkInPicker.roomId) return;

                        if (isOccupied) {
                          const ok = confirm(
                            "NLĐ này đang ở phòng khác. Bạn vẫn muốn check-in (có thể bị trùng)?",
                          );
                          if (!ok) return;
                        }

                        await checkInWorker({
                          floorId: checkInPicker.floorId,
                          roomId: checkInPicker.roomId,
                          workerId: w.id,
                          dateIn: checkInPicker.dateIn || todayISO(),
                        });

                        setCheckInPicker((s) => ({
                          ...s,
                          open: false,
                          roomId: null,
                          floorId: null,
                          q: "",
                        }));
                      })
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {w.fullName || "(Chưa có tên)"}
                        </div>
                        <div className="text-xs text-slate-600">
                          {w.phone || "-"}
                        </div>
                      </div>
                      {isOccupied ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          Đang ở
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Trống
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </InlineModal>

      {/* Init KTX */}
      <InitKtxModal
        initModal={initModal}
        setInitModal={setInitModal}
        requireAdmin={requireAdmin}
        initKtxFromInputs={initKtxFromInputs}
      />

      {/* Add/Import modals */}
      <AddFloorModal
        open={addFloorModal}
        onClose={() => setAddFloorModal(false)}
        requireAdmin={requireAdmin}
        addFloor={addFloor}
      />
      <AddRoomModal
        open={addRoomModal}
        onClose={() => setAddRoomModal(false)}
        requireAdmin={requireAdmin}
        state={state}
        floor={floor}
        setFloorId={setFloorId}
        addRoom={addRoom}
      />
      <AddWorkerModal
        open={addWorkerModal}
        onClose={() => setAddWorkerModal(false)}
        requireAdmin={requireAdmin}
        addWorker={addWorker}
      />
      <ImportExcelModal
        importModal={importModal}
        setImportModal={setImportModal}
        importFileRef={importFileRef}
        importExcelFile={importExcelFile}
      />
      <ElectricityHistoryModal
        open={electricityHistoryOpen}
        onClose={() => setElectricityHistoryOpen(false)}
        records={allElectricity
          .filter((x) => x.electricity)
          .filter((x) => {
            const e = x.electricity || {};
            const paid = !!e.paid;

            if (
              !electricityHistoryFilter ||
              electricityHistoryFilter === "all"
            ) {
              return true;
            }

            if (electricityHistoryFilter === "paid") {
              return paid;
            }

            if (electricityHistoryFilter === "pending") {
              return !paid;
            }

            return true;
          })
          .sort((a, b) => {
            const eA = a.electricity || {};
            const eB = b.electricity || {};

            const paidA = !!eA.paid;
            const paidB = !!eB.paid;

            const paidTimeA = eA.paid_at ? new Date(eA.paid_at).getTime() : 0;
            const paidTimeB = eB.paid_at ? new Date(eB.paid_at).getTime() : 0;

            // Filter Đã thu
            if (electricityHistoryFilter === "paid") {
              return paidTimeB - paidTimeA; // mới nhất lên trên
            }

            // Filter Chờ thu
            if (electricityHistoryFilter === "pending") {
              const monthCompare = String(eB.month || "").localeCompare(
                String(eA.month || ""),
              );
              if (monthCompare !== 0) return monthCompare;

              return String(a.roomCode || "").localeCompare(
                String(b.roomCode || ""),
              );
            }

            // Filter Tất cả
            // Ưu tiên record đã thu lên trước
            if (paidA !== paidB) {
              return Number(paidB) - Number(paidA);
            }

            // Nếu đều đã thu thì sort theo paid_at mới nhất
            if (paidA && paidB && paidTimeA !== paidTimeB) {
              return paidTimeB - paidTimeA;
            }

            // Nếu chưa thu hoặc thời gian bằng nhau thì sort theo tháng mới nhất
            const monthCompare = String(eB.month || "").localeCompare(
              String(eA.month || ""),
            );
            if (monthCompare !== 0) return monthCompare;

            // Cuối cùng sort theo mã phòng để ổn định
            return String(a.roomCode || "").localeCompare(
              String(b.roomCode || ""),
            );
          })}
        pricePerUnit={state.settings.electricityPrice}
      />
      <StaysHistoryModal
        open={staysHistoryOpen}
        onClose={() => setStaysHistoryOpen(false)}
        stays={allStays}
        roomById={roomById}
        workerById={workerById}
        onExport={exportExcel}
      />
      <RecruiterModal
        recruiterModal={recruiterModal}
        setRecruiterModal={setRecruiterModal}
        recruiterWorkersMap={recruiterWorkersMap}
        setWorkerModal={setWorkerModal}
      />
      <LoginModal
        open={loginModal}
        onClose={() => setLoginModal(false)}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        authIsAdmin={auth.isAdmin}
      />
      <SettingsModal
        open={settingsModal}
        onClose={() => setSettingsModal(false)}
        state={state}
        setState={setState}
        auth={auth}
        setLoginModal={setLoginModal}
        importModal={importModal}
        setImportModal={setImportModal}
        importFileRef={importFileRef}
        DEFAULT_SETTINGS={DEFAULT_SETTINGS}
        saveSettingsToDb={saveSettingsToDb} // nếu bạn có hàm này ở App.jsx
        requireAdmin={requireAdmin}
      />

      <input
        ref={importFileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = ""; // allow reselect same file
          importExcelFile(file);
        }}
      />
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
      <div className="h-10" />
    </div>
  );
}
