import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Pill from "./components/ui/Pill.jsx";
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
  FileUp,
  Filter,
  Home,
  BarChart3,
  UserRound,
  ChevronDown,
  Calendar,
  UserPlus,
  UserMinus,
  Shield,
  Pencil,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import { supabase } from "./services/supabaseClient";
import TabButton from "./components/ui/TabButton.jsx";
import Modal from "./components/ui/Modal.jsx";
import SelectField from "./components/ui/SelectField.jsx";
import Empty from "./components/ui/Empty.jsx";
import TextField from "./components/ui/TextField.jsx";
import Confirm from "./components/ui/Confirm.jsx";

async function getXLSX() {
  const mod = await import("xlsx");
  return mod;
}

// ---------------------------
// Data model
// ---------------------------
// NLĐ = Worker
// Room stays store check-in/out.
const AboutView = React.lazy(() => import("./features/about/AboutView.jsx"));
const KtxView = React.lazy(() => import("./features/ktx/KtxView.jsx"));
const StatsView = React.lazy(() => import("./features/stats/StatsView.jsx"));
const WorkersView = React.lazy(
  () => import("./features/workers/WorkersView.jsx"),
);
const LoginModal = React.lazy(() => import("./features/auth/LoginModal.jsx"));
const RoomModal = lazy(() => import("./features/ktx/RoomModal.jsx"));

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

// ---------------------------
// UI helpers
// ---------------------------
function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function DeletePasswordModal({
  open,
  title,
  message,
  password,
  setPassword,
  onClose,
  onConfirm,
}) {
  return (
    <Modal open={open} title={title || "Xác nhận xóa"} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm text-slate-700">{message}</div>

        <label className="block text-sm font-medium text-slate-700">
          Nhập mật khẩu Admin để xác nhận
        </label>
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu Admin"
        />

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            Xóa
          </button>
        </div>
      </div>
    </Modal>
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
  const [tab, setTab] = useState("ktx");

  // ---------------------------
  // Modal state (one place)
  // ---------------------------
  const [modal, setModal] = useState({
    login: false,
    settings: false,
    addFloor: false,
    room: { open: false, floorId: null, roomId: null },
    worker: { open: false, workerId: null, roomCtx: null },
    import: { open: false, busy: false, result: null },
    recruiter: { open: false, recruiter: "" },
    init: { open: false, floors: 3, roomsPerFloor: 7, startNo: 101 },
  });

  const [q, setQ] = useState("");
  const [floorId, setFloorId] = useState(() => state.floors?.[0]?.id || "");

  const [deletePassModal, setDeletePassModal] = useState({
    open: false,
    title: "",
    message: "",
    onDelete: null,
  });
  const [deletePass, setDeletePass] = useState("");

  const workerById = useMemo(() => {
    const m = new Map();
    for (const w of state.workers || []) m.set(w.id, w);
    return m;
  }, [state.workers]);
  // ---------------------------
  // Settings persistence (Supabase)
  // Table: app_settings (id=1, data=jsonb)
  // ---------------------------
  async function loadSettingsFromDb() {
    const res = await supabase
      .from("app_settings")
      .select("id,data")
      .eq("id", 1)
      .maybeSingle();

    if (res.error) {
      console.log("load settings error:", res.error);
      return;
    }

    // Nếu chưa có row settings thì tạo row mặc định
    if (!res.data) {
      const ins = await supabase
        .from("app_settings")
        .insert({ id: 1, data: DEFAULT_SETTINGS });
      if (ins.error) {
        console.log("init settings error:", ins.error);
      }
      setState((s) => ({ ...s, settings: DEFAULT_SETTINGS }));
      return;
    }

    const incoming = res.data?.data || {};

    // ✅ migration: nếu lỡ lưu nhầm trong about (phiên bản cũ) thì kéo lên top-level
    const legacyCanDelete = incoming?.about?.canDeleteStructure;
    const legacyRequirePass = incoming?.about?.requirePasswordOnDelete;

    if (
      typeof incoming.canDeleteStructure !== "boolean" &&
      typeof legacyCanDelete === "boolean"
    ) {
      incoming.canDeleteStructure = legacyCanDelete;
    }
    if (
      typeof incoming.requirePasswordOnDelete !== "boolean" &&
      typeof legacyRequirePass === "boolean"
    ) {
      incoming.requirePasswordOnDelete = legacyRequirePass;
    }

    // Merge để không bị mất default fields
    setState((s) => ({
      ...s,
      settings: {
        ...DEFAULT_SETTINGS,
        ...incoming,
        about: {
          ...DEFAULT_SETTINGS.about,
          ...(incoming.about || {}),
        },
      },
    }));
  }

  async function saveSettingsToDb(nextSettings) {
    const payload = { id: 1, data: nextSettings };
    const res = await supabase.from("app_settings").upsert(payload, {
      onConflict: "id",
    });
    if (res.error) throw new Error(res.error.message);
  }

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
    loadSettingsFromDb();
    loadAllFromDb();
  }, []);

  const open = (key, value = true) => setModal((m) => ({ ...m, [key]: value }));
  const close = (key) => setModal((m) => ({ ...m, [key]: false }));

  const importFileRef = useRef(null);
  const [confirm, setConfirm] = useState({ open: false });
  const importRef = useRef(null);

  useEffect(() => {
    // keep selected floor valid
    if (!state.floors.some((f) => f.id === floorId)) {
      setFloorId(state.floors?.[0]?.id || "");
    }
  }, [state.floors, floorId]);

  async function initKtxFromInputs({ floors, roomsPerFloor, startNo }) {
    const F = Number(floors);
    const R = Number(roomsPerFloor);
    const S = Number(startNo);

    // 0) Validate
    if (!Number.isInteger(F) || F <= 0 || F > 100) {
      alert("Số tầng không hợp lệ.");
      return false;
    }
    if (!Number.isInteger(R) || R <= 0 || R > 300) {
      alert("Số phòng/tầng không hợp lệ.");
      return false;
    }
    if (!Number.isInteger(S) || S <= 0) {
      alert("Số bắt đầu không hợp lệ.");
      return false;
    }

    // 1) Chặn tạo trùng nếu DB đã có dữ liệu
    // (Nếu bạn muốn cho phép tạo lại thì dùng Reset DB trước)
    const floorsCheck = await supabase.from("floors").select("id").limit(1);
    if (floorsCheck.error) {
      alert(
        "Không kiểm tra được dữ liệu hiện có: " + floorsCheck.error.message,
      );
      return false;
    }
    if ((floorsCheck.data || []).length > 0) {
      alert("KTX đã có tầng/phòng. Hãy Reset DB trước khi khởi tạo lại.");
      return false;
    }

    // 2) Tạo floors
    const floorsPayload = Array.from({ length: F }, (_, i) => ({
      name: `Tầng ${i + 1}`,
      sort: i + 1,
    }));

    const insFloors = await supabase
      .from("floors")
      .insert(floorsPayload)
      .select("id,sort");

    if (insFloors.error) {
      alert("Tạo tầng lỗi: " + insFloors.error.message);
      return false;
    }

    const floorIdBySort = new Map(
      (insFloors.data || []).map((x) => [x.sort, x.id]),
    );

    // 3) Tạo rooms theo thứ tự tăng dần
    const totalRooms = F * R;
    const roomsPayload = [];
    for (let i = 0; i < totalRooms; i++) {
      const floorSort = Math.floor(i / R) + 1; // 1..F
      const sort = (i % R) + 1; // 1..R
      const code = String(S + i); // tăng 1 mỗi phòng

      roomsPayload.push({
        floor_id: floorIdBySort.get(floorSort),
        code,
        sort,
      });
    }

    // 4) Insert rooms (chia lô để tránh payload quá lớn)
    const BATCH = 500;
    for (let i = 0; i < roomsPayload.length; i += BATCH) {
      const batch = roomsPayload.slice(i, i + BATCH);
      const insRooms = await supabase.from("rooms").insert(batch);
      if (insRooms.error) {
        alert("Tạo phòng lỗi: " + insRooms.error.message);
        return false;
      }
    }

    // 5) Load lại để UI cập nhật + đóng modal ở nơi gọi
    await loadAllFromDb();
    alert("Khởi tạo KTX thành công!");
    return true;
  }

  const floor = useMemo(
    () => state.floors.find((f) => f.id === floorId) || state.floors[0],
    [state.floors, floorId],
  );

  async function wipeDatabase() {
    // Xóa theo thứ tự tránh lỗi khóa ngoại
    const a = await supabase.from("stays").delete().not("id", "is", null);
    if (a.error) throw new Error("stays: " + a.error.message);

    const b = await supabase.from("workers").delete().not("id", "is", null);
    if (b.error) throw new Error("workers: " + b.error.message);

    const c = await supabase.from("rooms").delete().not("id", "is", null);
    if (c.error) throw new Error("rooms: " + c.error.message);

    const d = await supabase.from("floors").delete().not("id", "is", null);
    if (d.error) throw new Error("floors: " + d.error.message);
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
    const floorsRes = await supabase
      .from("floors")
      .select("id,name,sort")
      .order("sort", { ascending: true });

    if (floorsRes.error) {
      console.log("load floors error:", floorsRes.error);
      return;
    }

    const roomsRes = await supabase
      .from("rooms")
      .select("id,floor_id,code,sort")
      .order("sort", { ascending: true });

    if (roomsRes.error) {
      console.log("load rooms error:", roomsRes.error);
      return;
    }

    const workersRes = await supabase
      .from("workers")
      .select("id,full_name,hometown,recruiter,dob,phone")
      .order("full_name", { ascending: true });

    if (workersRes.error) {
      console.log("load workers error:", workersRes.error);
      return;
    }

    const staysRes = await supabase
      .from("stays")
      .select("id,room_id,worker_id,date_in,date_out")
      .order("date_in", { ascending: false });

    if (staysRes.error) {
      console.log("load stays error:", staysRes.error);
      return;
    }

    const roomsByFloor = new Map();
    for (const r of roomsRes.data || []) {
      if (!roomsByFloor.has(r.floor_id)) roomsByFloor.set(r.floor_id, []);
      roomsByFloor.get(r.floor_id).push({
        id: r.id,
        code: r.code,
        stays: [],
      });
    }

    const staysByRoom = new Map();
    for (const st of staysRes.data || []) {
      if (!staysByRoom.has(st.room_id)) staysByRoom.set(st.room_id, []);
      staysByRoom.get(st.room_id).push({
        id: st.id,
        workerId: st.worker_id,
        dateIn: st.date_in,
        dateOut: st.date_out,
      });
    }

    const floors = (floorsRes.data || []).map((f) => {
      const rooms = (roomsByFloor.get(f.id) || []).map((r) => ({
        ...r,
        stays: staysByRoom.get(r.id) || [],
      }));
      return { id: f.id, name: f.name, rooms };
    });

    const workers = (workersRes.data || []).map((w) => ({
      id: w.id,
      fullName: w.full_name,
      hometown: w.hometown || "",
      recruiter: w.recruiter || "",
      dob: w.dob || "",
      phone: w.phone || "",
    }));

    setState((s) => ({ ...s, floors, workers }));
    if (!floorId && floors[0]?.id) setFloorId(floors[0].id);
  }

  // ---------------------------
  // Excel Import (Admin)
  // ---------------------------
  function normHeader(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[._-]/g, " ");
  }

  function excelSerialToISO(n) {
    // Excel serial date -> JS date (Excel epoch 1899-12-30)
    const utc = new Date(Math.round((n - 25569) * 86400 * 1000));
    const y = utc.getUTCFullYear();
    const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
    const d = String(utc.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateToISO(v) {
    if (!v && v !== 0) return "";
    if (typeof v === "number") {
      // likely excel serial
      if (v > 20000 && v < 60000) return excelSerialToISO(v);
      return "";
    }
    const s = String(v).trim();
    if (!s) return "";
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY or D/M/YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, "0");
      const mm = String(m[2]).padStart(2, "0");
      return `${m[3]}-${mm}-${dd}`;
    }
    // Try Date.parse
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      const y = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }
    return "";
  }

  function normalizePhone(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.replace(/\s+/g, "");
  }

  async function importExcelFile(file) {
    const XLSX = await getXLSX();
    if (!file) return;
    if (!auth.isAdmin) {
      open("login");
      return;
    }

    setModal((m) => ({
      ...m,
      import: { ...m.import, busy: true, result: null },
    }));

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Build header map (supports Vietnamese variations)
      const pick = (row, keys) => {
        for (const k of keys) {
          const kk = normHeader(k);
          for (const col of Object.keys(row)) {
            if (normHeader(col) === kk) return row[col];
          }
        }
        return "";
      };

      const total = rows.length;

      // Preload rooms & workers & stays
      const roomsRes = await supabase.from("rooms").select("id,code");
      if (roomsRes.error) throw new Error(roomsRes.error.message);
      const roomIdByCode = new Map(
        (roomsRes.data || []).map((r) => [String(r.code).trim(), r.id]),
      );

      const workersRes = await supabase
        .from("workers")
        .select("id,full_name,dob,phone,hometown,recruiter");
      if (workersRes.error) throw new Error(workersRes.error.message);

      const keyOfWorker = (fullName, dob, phone) =>
        `${String(fullName || "")
          .trim()
          .toLowerCase()}|${String(dob || "").trim()}|${String(phone || "").trim()}`;

      const existing = new Map();
      for (const w of workersRes.data || []) {
        existing.set(keyOfWorker(w.full_name, w.dob || "", w.phone || ""), w);
      }

      const staysRes = await supabase
        .from("stays")
        .select("id,worker_id,room_id,date_out");
      if (staysRes.error) throw new Error(staysRes.error.message);

      const activeStayByWorker = new Map();
      for (const st of staysRes.data || []) {
        if (!st.date_out) activeStayByWorker.set(st.worker_id, st);
      }

      let workersInserted = 0;
      let workersUpdated = 0;
      let staysInserted = 0;
      let skipped = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const line = i + 2; // header is row 1

        const fullName = String(
          pick(row, ["Họ tên", "Ho ten", "Full name", "Tên", "Name"]),
        ).trim();

        if (!fullName) {
          skipped++;
          continue;
        }

        const dob = parseDateToISO(
          pick(row, ["Ngày sinh", "Ngay sinh", "DOB", "Birth", "Birthdate"]),
        );

        const phone = normalizePhone(
          pick(row, ["Số điện thoại", "So dien thoai", "Phone", "SDT", "Sdt"]),
        );

        const hometown = String(
          pick(row, ["Quê quán", "Que quan", "Hometown", "Que"]),
        ).trim();

        const recruiter = String(
          pick(row, ["Người tuyển", "Nguoi tuyen", "Recruiter", "Tuyen"]),
        ).trim();

        const roomCode = String(
          pick(row, ["Phòng", "Phong", "Room", "Room code"]),
        ).trim();

        const dateIn = parseDateToISO(
          pick(row, ["Ngày vào", "Ngay vao", "Date in", "Check in"]),
        );

        const dateOut = parseDateToISO(
          pick(row, [
            "Ngày rời",
            "Ngay roi",
            "Ngày ra",
            "Ngay ra",
            "Date out",
            "Check out",
          ]),
        );

        // 1) Upsert worker
        const k = keyOfWorker(fullName, dob, phone);
        let worker = existing.get(k);
        let workerId = worker?.id || null;

        if (!workerId) {
          const ins = await supabase
            .from("workers")
            .insert([
              {
                full_name: fullName,
                dob: dob || null,
                phone: phone || null,
                hometown: hometown || null,
                recruiter: recruiter || null,
              },
            ])
            .select("id")
            .single();

          if (ins.error) {
            errors.push({
              line,
              reason: `Tạo NLĐ lỗi: ${ins.error.message}`,
              fullName,
            });
            continue;
          }
          workerId = ins.data.id;
          workersInserted++;
          worker = {
            id: workerId,
            full_name: fullName,
            dob,
            phone,
            hometown,
            recruiter,
          };
          existing.set(k, worker);
        } else {
          // update missing fields (don't overwrite if excel empty)
          const patch = {};
          if (hometown && !worker.hometown) patch.hometown = hometown;
          if (recruiter && !worker.recruiter) patch.recruiter = recruiter;
          if (dob && !worker.dob) patch.dob = dob;
          if (phone && !worker.phone) patch.phone = phone;

          if (Object.keys(patch).length) {
            const up = await supabase
              .from("workers")
              .update(patch)
              .eq("id", workerId);
            if (!up.error) workersUpdated++;
          }
        }

        // 2) stays (optional)
        if (roomCode && dateIn) {
          const roomId = roomIdByCode.get(roomCode);
          if (!roomId) {
            errors.push({
              line,
              reason: `Phòng không tồn tại: ${roomCode}`,
              fullName,
            });
            continue;
          }

          const active = activeStayByWorker.get(workerId);
          if (active) {
            // If already staying somewhere, do not auto-move
            errors.push({
              line,
              reason: `NLĐ đang ở phòng khác (không tự chuyển)`,
              fullName,
            });
            continue;
          }

          const insStay = await supabase.from("stays").insert([
            {
              room_id: roomId,
              worker_id: workerId,
              date_in: dateIn,
              date_out: dateOut || null,
            },
          ]);

          if (insStay.error) {
            errors.push({
              line,
              reason: `Tạo lịch sử ở lỗi: ${insStay.error.message}`,
              fullName,
            });
            continue;
          }
          staysInserted++;
          if (!dateOut)
            activeStayByWorker.set(workerId, {
              worker_id: workerId,
              room_id: roomId,
              date_out: null,
            });
        }
      }

      setImportModal((m) => ({
        ...m,
        busy: false,
        result: {
          total,
          workersInserted,
          workersUpdated,
          staysInserted,
          skipped,
          errors,
        },
      }));
      await loadAllFromDb();
      alert("Nhập Excel thành công!");
      setImportModal((m) => ({ ...m, open: false })); // nếu bạn có modal import riêng
      close("settings"); // nếu import nằm trong settings
      setTab("ktx"); // hoặc "home" theo tên tab của bạn
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
      open("login");
      return;
    }
    // allow async actions too
    action();
  }

  async function addFloor(name) {
    const floorName = (name || "").trim() || `Tầng ${state.floors.length + 1}`;
    const sort = state.floors.length + 1;

    const res = await supabase
      .from("floors")
      .insert([{ name: floorName, sort }])
      .select("id")
      .single();

    if (res.error) {
      alert("Tạo tầng lỗi: " + res.error.message);
      return;
    }

    await loadAllFromDb();
    setFloorId(res.data.id);
  }

  async function deleteFloor(floorId) {
    // lấy rooms của floor
    const floor = state.floors.find((f) => f.id === floorId);
    const roomIds = (floor?.rooms || []).map((r) => r.id);

    if (roomIds.length) {
      const a = await supabase.from("stays").delete().in("room_id", roomIds);
      if (a.error) return alert("Xóa tầng lỗi (stays): " + a.error.message);

      const b = await supabase.from("rooms").delete().in("id", roomIds);
      if (b.error) return alert("Xóa tầng lỗi (rooms): " + b.error.message);
    }

    const c = await supabase.from("floors").delete().eq("id", floorId);
    if (c.error) return alert("Xóa tầng lỗi (floor): " + c.error.message);

    await loadAllFromDb();
    setFloorId((prev) => (prev === floorId ? "" : prev));
  }

  async function addRoom(floorId, code) {
    const floor = state.floors.find((f) => f.id === floorId);
    const sort = (floor?.rooms?.length || 0) + 1;
    const roomCode = (code || "").trim() || String(sort);

    const res = await supabase
      .from("rooms")
      .insert([{ floor_id: floorId, code: roomCode, sort }]);

    if (res.error) {
      alert("Tạo phòng lỗi: " + res.error.message);
      return;
    }

    await loadAllFromDb();
  }

  // Rename room code/name
  async function updateRoomCode(floorId, roomId, newCode) {
    const nextCode = (newCode || "").trim();
    if (!nextCode) return alert("Tên phòng không được để trống.");

    const res = await supabase
      .from("rooms")
      .update({ code: nextCode })
      .eq("id", roomId);
    if (res.error) {
      alert("Sửa tên phòng lỗi: " + res.error.message);
      return;
    }
    await loadAllFromDb();
  }

  async function deleteRoom(floorId, roomId) {
    // xóa stays trước
    const a = await supabase.from("stays").delete().eq("room_id", roomId);
    if (a.error) return alert("Xóa phòng lỗi (stays): " + a.error.message);

    const b = await supabase.from("rooms").delete().eq("id", roomId);
    if (b.error) return alert("Xóa phòng lỗi (room): " + b.error.message);

    await loadAllFromDb();
  }

  async function resetDb() {
    if (!auth.isAdmin) {
      open("login");
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
    close("settings"); // nếu bạn có state này
    setTab("ktx");
  }

  async function addWorker(worker) {
    const payload = {
      full_name: (worker.fullName || "").trim(),
      hometown: (worker.hometown || "").trim(),
      recruiter: (worker.recruiter || "").trim(),
      dob: worker.dob ? worker.dob : null,
      phone: (worker.phone || "").trim(),
    };

    const res = await supabase
      .from("workers")
      .insert([payload])
      .select("id")
      .single();
    if (res.error) {
      alert("Tạo NLĐ lỗi: " + res.error.message);
      return null;
    }
    return { id: res.data.id, ...worker };
  }

  async function updateWorker(workerId, patch) {
    const payload = {};
    if (patch.fullName != null) payload.full_name = patch.fullName.trim();
    if (patch.hometown != null) payload.hometown = patch.hometown.trim();
    if (patch.recruiter != null) payload.recruiter = patch.recruiter.trim();
    if (patch.dob !== undefined) payload.dob = patch.dob ? patch.dob : null;
    if (patch.phone !== undefined) payload.phone = (patch.phone || "").trim();

    const res = await supabase
      .from("workers")
      .update(payload)
      .eq("id", workerId);
    if (res.error) {
      alert("Cập nhật NLĐ lỗi: " + res.error.message);
      return;
    }
    await loadAllFromDb();
  }

  async function deleteWorker(workerId) {
    const res = await supabase.from("workers").delete().eq("id", workerId);
    if (res.error) {
      alert("Xóa NLĐ lỗi: " + res.error.message);
      return;
    }
    await loadAllFromDb();
  }

  async function checkInWorker({ floorId, roomId, workerId, dateIn }) {
    const payload = {
      room_id: roomId,
      worker_id: workerId,
      date_in: dateIn || todayISO(),
      date_out: null,
    };

    const res = await supabase.from("stays").insert([payload]);
    if (res.error) {
      alert("Thêm NLĐ vào phòng lỗi: " + res.error.message);
      return;
    }

    await loadAllFromDb();
  }
  async function checkOutStay({ floorId, roomId, stayId, dateOut }) {
    const res = await supabase
      .from("stays")
      .update({ date_out: dateOut })
      .eq("id", stayId);

    if (res.error) {
      alert("Cho NLĐ rời đi lỗi: " + res.error.message);
      return;
    }

    await loadAllFromDb();
  }

  async function transferWorker({ stayId, workerId, toRoomId, transferDate }) {
    const d = transferDate || todayISO();

    // 1) đóng stay hiện tại
    const closeRes = await supabase
      .from("stays")
      .update({ date_out: d })
      .eq("id", stayId);

    if (closeRes.error) {
      alert("Chuyển phòng lỗi (đóng phòng cũ): " + closeRes.error.message);
      return;
    }

    // 2) tạo stay mới
    const insRes = await supabase.from("stays").insert([
      {
        room_id: toRoomId,
        worker_id: workerId,
        date_in: d,
        date_out: null,
      },
    ]);

    if (insRes.error) {
      alert("Chuyển phòng lỗi (tạo phòng mới): " + insRes.error.message);
      // (tùy chọn) rollback: mở lại stay cũ nếu muốn
      return;
    }

    await loadAllFromDb();
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
  async function exportExcel() {
    try {
      const roomsSheet = [];
      // ... (phần bạn đang build sheet giữ nguyên)

      const statsSheet = (Array.isArray(stats) ? stats : []).map((x) => ({
        "Số người/phòng": x.occupancy,
        "Số phòng": x.rooms,
      }));

      const XLSX = await getXLSX();
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
    } catch (e) {
      console.error("Export Excel failed:", e);
      alert("Xuất Excel thất bại. Mở Console để xem lỗi chi tiết.");
    }
  }
  function guardDelete({ title, message, onDelete }) {
    if (!auth.isAdmin) return open("login");

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
                onClick={() => open("settings")}
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
        onClick={() => open("room", { open: true, floorId, roomId: r.id })}
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
    if (!modal.room.open) return null;

    const f = state.floors.find((x) => x.id === modal.room.floorId);
    const r = f?.rooms.find((x) => x.id === modal.room.roomId);

    return f && r ? { floor: f, room: r } : null;
  }, [modal.room.open, modal.room.floorId, modal.room.roomId, state.floors]);

  function RoomModalContent() {
    const ctx = roomCtx;
    const [roomCodeEdit, setRoomCodeEdit] = useState("");
    const [isEditingRoomCode, setIsEditingRoomCode] = useState(false);
    const [transferModal, setTransferModal] = useState({
      open: false,
      stayId: null,
      workerId: null,
      fromRoomId: null,
      toRoomId: "",
      date: todayISO(),
    });
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
                      onClick={async () => {
                        await updateRoomCode(floor.id, room.id, roomCodeEdit);
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
                requireAdmin(async () => {
                  open("worker", {
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
                guardDelete({
                  title: "Xóa phòng",
                  message: `Xóa ${f.name}? Tất cả phòng và lịch sử ở trong phòng này sẽ bị xóa.`,
                  onDelete: async () => {
                    await deleteFloor(f.id);
                  },
                })
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
            <>
              {current.map((st) => {
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
                        open("worker", {
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
                      {/* ✅ Chuyển phòng */}
                      <button
                        className={clsx(
                          "flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold",
                          auth.isAdmin
                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                            : "bg-slate-100 text-slate-500",
                        )}
                        onClick={() =>
                          requireAdmin(() => {
                            setTransferModal({
                              open: true,
                              stayId: st.id,
                              workerId: st.workerId,
                              fromRoomId: room.id,
                              toRoomId: "",
                              date: todayISO(),
                            });
                          })
                        }
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <UserMinus className="h-4 w-4" />
                          Chuyển phòng
                        </span>
                      </button>

                      {/* ✅ Rời đi */}
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
                              onConfirm: async () => {
                                await checkOutStay({
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
              })}

              {/* ✅ Modal chuyển phòng: đặt OUTSIDE map */}
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
                      setTransferModal((m) => ({
                        ...m,
                        toRoomId: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- Chọn phòng --</option>
                    {allRooms
                      .filter((x) => x.id !== room.id)
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
                        setTransferModal((m) => ({
                          ...m,
                          open: false,
                          toRoomId: "",
                        }))
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

                        setTransferModal((m) => ({
                          ...m,
                          open: false,
                          toRoomId: "",
                        }));
                      }}
                    >
                      Xác nhận chuyển
                    </button>
                  </div>
                </div>
              </Modal>
            </>
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
                      open("worker", {
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
                      open("worker", {
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
    if (!modal.worker.open) return null;

    const workerId = modal.worker.workerId;
    const w = workerId ? workerById.get(workerId) : null;

    // find current room for worker (if any)
    let currentRoom = null;
    if (workerId) {
      for (const f of state.floors) {
        for (const r of f.rooms) {
          const st = r.stays.find((s) => s.workerId === workerId && !s.dateOut);
          if (st) {
            currentRoom = { floor: f, room: r, stay: st };
            break;
          }
        }
        if (currentRoom) break;
      }
    }

    return { worker: w, currentRoom };
  }, [modal.worker.open, modal.worker.workerId, workerById, state.floors]);

  function WorkerModalContent() {
    const ctx = workerCtx;
    const roomCtx2 = modal.roomCtx;

    const [fullName, setFullName] = useState("");
    const [dob, setDob] = useState("");
    const [hometown, setHometown] = useState("");
    const [phone, setPhone] = useState("");
    const [recruiter, setRecruiter] = useState("");
    const [dateIn, setDateIn] = useState(todayISO());
    const [pickWorkerId, setPickWorkerId] = useState("");

    // Reset fields when opening for different worker
    useEffect(() => {
      // Khi modal mở ở chế độ xem/sửa NLĐ
      if (ctx?.worker) {
        setFullName(ctx.worker.fullName || "");
        setDob(ctx.worker.dob || "");
        setHometown(ctx.worker.hometown || "");
        setPhone(ctx.worker.phone || "");
        setRecruiter(ctx.worker.recruiter || "");
        setPickWorkerId(ctx.worker.id || "");
        return;
      }

      // Khi modal mở để "Thêm NLĐ" vào phòng (roomCtx2 có dữ liệu)
      // hoặc mở rỗng
      setFullName("");
      setDob("");
      setHometown("");
      setPhone("");
      setRecruiter("");
      setPickWorkerId("");
      setDateIn(todayISO());
    }, [ctx?.worker?.id, modal.worker.open]);

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
                    label="Ngày sinh"
                    value={dob}
                    onChange={setDob}
                    type="date"
                  />
                  <TextField
                    label="Quê quán"
                    value={hometown}
                    onChange={setHometown}
                    placeholder="VD: Nghệ An"
                  />
                  <TextField
                    label="Số điện thoại"
                    value={phone}
                    onChange={setPhone}
                    placeholder="VD: 0987654321"
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
                  requireAdmin(async () => {
                    if (!fullName.trim()) {
                      alert("Vui lòng nhập Họ tên.");
                      return;
                    }
                    const w = await addWorker({
                      fullName: fullName.trim(),
                      hometown: hometown.trim(),
                      phone: phone.trim(),
                      recruiter: recruiter.trim(),
                      dob,
                    });
                    await checkInWorker({
                      floorId: roomCtx2.floorId,
                      roomId: roomCtx2.roomId,
                      workerId: w.id,
                      dateIn: dateIn || todayISO(),
                    });
                    open("worker", {
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
                label="Ngày sinh"
                value={dob}
                onChange={setDob}
                type="date"
              />
              <TextField
                label="Quê quán"
                value={hometown}
                onChange={setHometown}
                placeholder=""
              />
              <TextField
                label="Số điện thoại"
                value={phone}
                onChange={setPhone}
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
                    requireAdmin(async () => {
                      if (!ctx?.worker?.id) return;
                      await updateWorker(ctx.worker.id, {
                        fullName: fullName.trim(),
                        dob,
                        hometown: hometown.trim(),
                        phone: phone.trim(),
                        recruiter: recruiter.trim(),
                      });
                      open("worker", (m) => ({ ...m, open: false }));
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
                          open("worker", {
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

        {modal.worker.roomCtx?.stayId
          ? (() => {
              const f = state.floors.find(
                (x) => x.id === modal.worker.roomCtx.floorId,
              );
              const r = f?.rooms.find(
                (x) => x.id === modal.worker.roomCtx.roomId,
              );
              const st = r?.stays.find(
                (x) => x.id === modal.worker.roomCtx.stayId,
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
        open={modal.addFloor}
        title="Thêm tầng"
        onClose={() => close("addFloor")}
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
              requireAdmin(async () => {
                addFloor(name);
                close("addFloor");
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

    // đóng modal + reset input cho gọn
    const closeAddRoom = () => {
      close("addRoom");
      setCode("");
    };

    return (
      <Modal open={modal.addRoom} title="Thêm phòng" onClose={closeAddRoom}>
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
              requireAdmin(async () => {
                addRoom(floor.id, code);
                closeAddRoom();
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
        open={modal.addWorker}
        title="Thêm NLĐ"
        onClose={() => close("addWorker")}
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
              requireAdmin(async () => {
                if (!fullName.trim()) {
                  alert("Vui lòng nhập Họ tên.");
                  return;
                }

                addWorker({
                  fullName: fullName.trim(),
                  hometown: hometown.trim(),
                  recruiter: recruiter.trim(),
                });

                // đóng modal
                close("addWorker");

                // (khuyên) reset input để lần sau mở modal không bị dính dữ liệu cũ
                setFullName("");
                setHometown("");
                setRecruiter("");
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

  function ImportExcelModal() {
    const result = modal.import?.result;

    const closeImport = () => {
      setModal((m) => ({
        ...m,
        import: { ...(m.import || {}), open: false, busy: false, result: null },
      }));
    };

    return (
      <Modal
        open={!!modal.import?.open}
        title="Nhập Excel"
        onClose={closeImport}
      >
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="text-sm font-semibold">Hướng dẫn</div>
            <div className="mt-1 text-xs text-slate-600">
              File Excel (sheet đầu tiên) nên có các cột: Họ tên, Ngày sinh, Số
              điện thoại, Quê quán, Người tuyển, Phòng, Ngày vào, Ngày rời.
              <br />
              Nếu không có Phòng/Ngày vào thì chỉ tạo NLĐ.
            </div>
          </div>

          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="block w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importExcelFile(f);
              e.target.value = "";
            }}
            disabled={!!modal.import?.busy}
          />

          {modal.import?.busy ? (
            <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-100">
              Đang nhập dữ liệu…
            </div>
          ) : null}

          {result ? (
            <div className="space-y-2">
              <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="text-sm font-semibold">Kết quả</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
                  <div>
                    Tổng dòng: <b>{result.total}</b>
                  </div>
                  <div>
                    Bỏ qua: <b>{result.skipped}</b>
                  </div>
                  <div>
                    NLĐ tạo mới: <b>{result.workersInserted}</b>
                  </div>
                  <div>
                    NLĐ cập nhật: <b>{result.workersUpdated}</b>
                  </div>
                  <div>
                    Lịch sử ở tạo: <b>{result.staysInserted}</b>
                  </div>
                  <div>
                    Lỗi: <b>{result.errors.length}</b>
                  </div>
                </div>
              </div>

              {result.errors.length ? (
                <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="text-sm font-semibold">
                    Danh sách lỗi (tối đa 50)
                  </div>
                  <div className="mt-2 space-y-2">
                    {result.errors.slice(0, 50).map((er, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-100"
                      >
                        <div className="font-semibold">
                          Dòng {er.line}: {er.fullName}
                        </div>
                        <div className="mt-1">{er.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }

  function InitKtxModal() {
    const [busy, setBusy] = useState(false);

    return (
      <Modal
        open={modal.init.open}
        title="Khởi tạo cấu trúc KTX"
        onClose={() => {
          if (busy) return;
          setModal((m) => ({ ...m, init: { ...(m.init || {}), open: false } }));
        }}
      >
        <div className="space-y-3">
          <TextField
            label="Số tầng"
            type="number"
            value={String(modal.init.floors ?? 0)}
            onChange={(v) =>
              setModal((m) => ({
                ...m,
                init: { ...(m.init || {}), floors: Number(v || 0) },
              }))
            }
            placeholder="VD: 3"
          />

          <TextField
            label="Số phòng / tầng"
            type="number"
            value={String(modal.init.roomsPerFloor ?? 0)}
            onChange={(v) =>
              setModal((m) => ({
                ...m,
                init: { ...(m.init || {}), roomsPerFloor: Number(v || 0) },
              }))
            }
            placeholder="VD: 7"
          />

          <TextField
            label="Số bắt đầu"
            type="number"
            value={String(modal.init.startNo ?? 0)}
            onChange={(v) =>
              setModal((m) => ({
                ...m,
                init: { ...(m.init || {}), startNo: Number(v || 0) },
              }))
            }
            placeholder="VD: 101"
          />

          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              requireAdmin(async () => {
                try {
                  setBusy(true);

                  if (state.floors.length > 0) {
                    alert(
                      "KTX đã có tầng/phòng. Hãy Reset DB trước khi khởi tạo lại.",
                    );
                    return;
                  }

                  const ok = await initKtxFromInputs(modal.init);
                  if (ok) {
                    setModal((m) => ({
                      ...m,
                      init: { ...(m.init || {}), open: false },
                    }));
                  }
                } finally {
                  setBusy(false);
                }
              })
            }
          >
            {busy ? "Đang tạo..." : "Tạo tầng & phòng"}
          </button>

          <div className="text-xs text-slate-500">
            Mã phòng sẽ tăng dần: start, start+1, start+2...
          </div>
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

    const [canDeleteStructure, setCanDeleteStructure] = useState(
      !!state.settings.canDeleteStructure,
    );
    const [requirePasswordOnDelete, setRequirePasswordOnDelete] = useState(
      state.settings.requirePasswordOnDelete !== false, // mặc định true
    );

    const [aboutDraft, setAboutDraft] = useState(() => ({
      ...DEFAULT_SETTINGS.about,
      ...(state.settings.about || {}),
    }));

    // Khi mở modal, đồng bộ draft theo state hiện tại (tránh bị stale)
    useEffect(() => {
      if (!modal.settings) return;

      setAboutDraft({
        ...DEFAULT_SETTINGS.about,
        ...(state.settings.about || {}),
      });

      setSiteName(state.settings.siteName || "");
      setAdminPassword(state.settings.adminPassword || "");
      setCols(String(state.settings.roomGridCols || 3));
      setCanDeleteStructure(!!state.settings.canDeleteStructure);
      setRequirePasswordOnDelete(
        state.settings.requirePasswordOnDelete !== false,
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modal.settings]);

    return (
      <Modal
        open={modal.settings}
        title="Cài đặt"
        onClose={() => close("settings")}
      >
        <div className="space-y-4">
          <div className="w-full flex justify-end">
            {!auth.isAdmin ? (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
                onClick={() => {
                  close("settings");
                  open("login");
                }}
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-lg"
                onClick={async () => {
                  await supabase.auth.signOut();
                  close("settings");
                }}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            )}
          </div>

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

              <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Về chúng tôi</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {auth.isAdmin
                        ? "Admin có thể cập nhật thông tin hiển thị ở tab Về chúng tôi."
                        : "Bạn đang ở chế độ xem. Đăng nhập Admin để chỉnh sửa."}
                    </div>
                  </div>
                  <Pill
                    icon={Pencil}
                    text={auth.isAdmin ? "Chỉnh sửa" : "Xem"}
                    tone={auth.isAdmin ? "violet" : "slate"}
                  />
                </div>

                <div className="mt-3 space-y-3">
                  <TextField
                    label="Tên đơn vị / KTX"
                    value={aboutDraft.companyName || ""}
                    onChange={(v) =>
                      setAboutDraft((a) => ({ ...a, companyName: v }))
                    }
                    placeholder="VD: KTX ABC"
                    disabled={!auth.isAdmin}
                  />

                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-slate-600">
                      Mô tả
                    </div>
                    <textarea
                      value={aboutDraft.description || ""}
                      onChange={(e) =>
                        setAboutDraft((a) => ({
                          ...a,
                          description: e.target.value,
                        }))
                      }
                      disabled={!auth.isAdmin}
                      rows={4}
                      placeholder="Giới thiệu ngắn về ký túc xá..."
                      className={clsx(
                        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400",
                        !auth.isAdmin ? "opacity-70" : "",
                      )}
                    />
                  </label>

                  <TextField
                    label="Địa chỉ"
                    value={aboutDraft.address || ""}
                    onChange={(v) =>
                      setAboutDraft((a) => ({ ...a, address: v }))
                    }
                    placeholder=""
                    disabled={!auth.isAdmin}
                  />

                  <TextField
                    label="Link bản đồ (Google Maps)"
                    value={aboutDraft.mapUrl || ""}
                    onChange={(v) =>
                      setAboutDraft((a) => ({ ...a, mapUrl: v }))
                    }
                    placeholder="https://maps.google.com/..."
                    disabled={!auth.isAdmin}
                  />

                  <TextField
                    label="Hotline"
                    value={aboutDraft.hotline || ""}
                    onChange={(v) =>
                      setAboutDraft((a) => ({ ...a, hotline: v }))
                    }
                    placeholder="VD: 0343 751 753"
                    disabled={!auth.isAdmin}
                  />

                  <TextField
                    label="Email"
                    value={aboutDraft.email || ""}
                    onChange={(v) => setAboutDraft((a) => ({ ...a, email: v }))}
                    placeholder=""
                    disabled={!auth.isAdmin}
                  />

                  <TextField
                    label="Website"
                    value={aboutDraft.website || ""}
                    onChange={(v) =>
                      setAboutDraft((a) => ({ ...a, website: v }))
                    }
                    placeholder="ktx-abc.com"
                    disabled={!auth.isAdmin}
                  />

                  <TextField
                    label="Giờ làm việc"
                    value={aboutDraft.workingHours || ""}
                    onChange={(v) =>
                      setAboutDraft((a) => ({ ...a, workingHours: v }))
                    }
                    placeholder="VD: 08:00 - 17:00 (T2-T7)"
                    disabled={!auth.isAdmin}
                  />

                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-slate-600">
                      Tiện ích (ngăn cách bằng dấu phẩy)
                    </div>
                    <input
                      value={(aboutDraft.services || []).join(", ")}
                      onChange={(e) =>
                        setAboutDraft((a) => ({
                          ...a,
                          services: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        }))
                      }
                      disabled={!auth.isAdmin}
                      placeholder="WiFi, Giặt sấy, Căn tin..."
                      className={clsx(
                        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400",
                        !auth.isAdmin ? "opacity-70" : "",
                      )}
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-slate-600">
                      Nội quy
                    </div>
                    <textarea
                      value={aboutDraft.rules || ""}
                      onChange={(e) =>
                        setAboutDraft((a) => ({ ...a, rules: e.target.value }))
                      }
                      disabled={!auth.isAdmin}
                      rows={4}
                      placeholder="Nội quy ký túc xá..."
                      className={clsx(
                        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400",
                        !auth.isAdmin ? "opacity-70" : "",
                      )}
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-slate-600">
                      Thông tin thanh toán
                    </div>
                    <textarea
                      value={aboutDraft.bankInfo || ""}
                      onChange={(e) =>
                        setAboutDraft((a) => ({
                          ...a,
                          bankInfo: e.target.value,
                        }))
                      }
                      disabled={!auth.isAdmin}
                      rows={3}
                      placeholder="Số tài khoản / QR / ghi chú..."
                      className={clsx(
                        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400",
                        !auth.isAdmin ? "opacity-70" : "",
                      )}
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="text-xs font-medium text-slate-600">
                      Thông báo Admin (hiển thị nổi bật)
                    </div>
                    <textarea
                      value={aboutDraft.adminNotice || ""}
                      onChange={(e) =>
                        setAboutDraft((a) => ({
                          ...a,
                          adminNotice: e.target.value,
                        }))
                      }
                      disabled={!auth.isAdmin}
                      rows={3}
                      placeholder="VD: Tuần này sửa chữa khu A..."
                      className={clsx(
                        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400",
                        !auth.isAdmin ? "opacity-70" : "",
                      )}
                    />
                  </label>
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!state.settings.canDeleteStructure}
                onChange={(e) =>
                  auth.isAdmin &&
                  setState((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      canDeleteStructure: e.target.checked,
                    },
                  }))
                }
                disabled={!auth.isAdmin}
              />
              Cho phép xóa tầng/phòng
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!state.settings.requirePasswordOnDelete}
                onChange={(e) =>
                  auth.isAdmin &&
                  setState((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      requirePasswordOnDelete: e.target.checked,
                    },
                  }))
                }
                disabled={!auth.isAdmin || !state.settings.canDeleteStructure}
              />
              Bắt nhập mật khẩu trước khi xóa
            </label>
          </div>
          <button
            className={clsx(
              "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
              auth.isAdmin
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500",
            )}
            onClick={() =>
              requireAdmin(async () => {
                try {
                  const nCols = Math.min(4, Math.max(2, Number(cols || 3)));
                  const nextSettings = {
                    ...state.settings,
                    siteName: siteName || "Quản lý KTX",
                    adminPassword: adminPassword || "123456",
                    roomGridCols: nCols,

                    canDeleteStructure,
                    requirePasswordOnDelete,

                    about: {
                      ...DEFAULT_SETTINGS.about,
                      ...(aboutDraft || {}),
                    },
                  };

                  await saveSettingsToDb(nextSettings);
                  setState((s) => ({ ...s, settings: nextSettings }));
                  close("settings");
                  alert("Đã lưu cài đặt.");
                } catch (e) {
                  console.error(e);
                  alert("Lưu cài đặt lỗi: " + (e?.message || e));
                }
              })
            }
          >
            Lưu cài đặt
          </button>

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

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Dữ liệu</div>
                <div className="mt-1 text-xs text-slate-600">
                  (Admin) Nhập dữ liệu NLĐ từ Excel.
                </div>
              </div>
              <Pill icon={FileUp} text="Excel" tone="sky" />
            </div>

            <div className="mt-3">
              <button
                className={clsx(
                  "w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                  auth.isAdmin
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500",
                )}
                onClick={() =>
                  requireAdmin(() => {
                    importFileRef.current?.click();
                  })
                }
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <FileUp className="h-4 w-4" />
                  Nhập Excel
                </span>
              </button>
            </div>
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
                      onConfirm: async () => {
                        try {
                          await wipeDatabase();
                          await loadAllFromDb(); // ✅ cập nhật UI sau reset
                          setConfirm({ open: false });
                          close("settings");
                          alert("Đã reset dữ liệu.");
                        } catch (e) {
                          console.error(e);
                          alert("Reset lỗi: " + (e?.message || e));
                        }
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

      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-md px-4 pb-24">Đang tải…</div>
        }
      >
        {tab === "ktx" ? (
          <KtxView
            state={state}
            floor={floor}
            setFloorId={setFloorId}
            auth={auth}
            exportExcel={exportExcel}
            requireAdmin={requireAdmin}
            onOpenInit={() => open("init", { open: true })}
            onOpenAddRoom={() => setAddRoomModal(true)}
            onOpenLogin={() => open("login")}
            onOpenAddFloor={() => setAddFloorModal(true)}
            guardDelete={guardDelete}
            deleteFloor={deleteFloor}
            RoomCard={RoomCard}
          />
        ) : tab === "stats" ? (
          <StatsView
            stats={stats}
            recruiterStats={recruiterStats}
            onExportExcel={exportExcel}
            onOpenRecruiter={(recruiter) =>
              setRecruiterModal({ open: true, recruiter })
            }
          />
        ) : tab === "workers" ? (
          <WorkersView
            workers={state.workers}
            q={q}
            auth={auth}
            onExportExcel={exportExcel}
            requireAdmin={requireAdmin}
            onOpenAddWorker={() => setAddWorkerModal(true)}
            onOpenWorker={(workerId) =>
              open("worker", { open: true, workerId, roomCtx: null })
            }
          />
        ) : tab === "about" ? (
          <AboutView
            state={state}
            DEFAULT_SETTINGS={DEFAULT_SETTINGS}
            auth={auth}
            onOpenSettings={() => open("settings")}
          />
        ) : (
          <div className="mx-auto w-full max-w-md px-4 pb-24">
            Mở Cài đặt ở góc phải.
          </div>
        )}
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
      <Suspense fallback={null}>
        <RoomModal
          open={modal.room.open}
          onClose={() =>
            open("room", { open: false, floorId: null, roomId: null })
          }
          state={state}
          workerById={workerById}
          floorId={modal.room.floorId}
          roomId={modal.room.roomId}
          isAdmin={auth.isAdmin}
          onOpenWorker={(workerId) =>
            open("worker", { open: true, workerId, roomCtx: null })
          }
          // 3 cái dưới nếu bạn chưa làm thì để null vẫn chạy
          onAddStay={null}
          onCheckoutStay={null}
          onTransfer={null}
        />
      </Suspense>
      <Modal
        open={modal.recruiter.open}
        title={`NLĐ theo người tuyển: ${modal.recruiter.recruiter || ""}`}
        onClose={() => open("recruiter", { open: false, recruiter: "" })}
      >
        {(() => {
          const key = modal.recruiter.recruiter;
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
                    open("worker", {
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
        open={modal.worker.open}
        title={
          modal.worker.workerId
            ? "Chi tiết NLĐ"
            : modal.worker.roomCtx
              ? "Thêm NLĐ"
              : "NLĐ"
        }
        onClose={() =>
          open("worker", { open: false, workerId: null, roomCtx: null })
        }
      >
        <WorkerModalContent />
      </Modal>

      <Modal
        open={modal.init.open}
        title="Khởi tạo cấu trúc KTX"
        onClose={() => open("init", { ...modal.init, open: false })}
      >
        <div className="space-y-3">
          <TextField
            label="Số tầng"
            type="number"
            value={String(modal.init.floors ?? 0)}
            onChange={(v) =>
              setModal((m) => ({
                ...m,
                init: { ...(m.init || {}), floors: Number(v) },
              }))
            }
            placeholder="VD: 3"
          />

          <TextField
            label="Số phòng / tầng"
            type="number"
            value={String(modal.init.roomsPerFloor ?? 0)}
            onChange={(v) =>
              setModal((m) => ({
                ...m,
                init: { ...(m.init || {}), roomsPerFloor: Number(v) },
              }))
            }
            placeholder="VD: 7"
          />

          <TextField
            label="Số bắt đầu"
            type="number"
            value={String(modal.init.startNo ?? 0)}
            onChange={(v) =>
              setModal((m) => ({
                ...m,
                init: { ...(m.init || {}), startNo: Number(v) },
              }))
            }
            placeholder="VD: 101"
          />

          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => initKtxFromInputs(modal.init)}
          >
            Tạo tầng & phòng
          </button>

          <div className="text-xs text-slate-500">
            Mã phòng sẽ tăng dần: start, start+1, start+2...
          </div>
        </div>
      </Modal>

      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          // để chọn lại cùng 1 file vẫn trigger
          e.target.value = "";

          console.log("Excel selected:", file.name, file.size);

          await importExcelFile(file); // <- hàm import của bạn
        }}
      />
      <Suspense fallback={null}>
        <LoginModal
          open={modal.login}
          onClose={() => close("login")}
          onLogin={async ({ email, password }) => {
            const res = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (res.error) throw new Error(res.error.message);
            close("login");
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <RoomModal
          open={modal.room.open}
          onClose={() =>
            open("room", { open: false, floorId: null, roomId: null })
          }
          state={state}
          workerById={workerById}
          floorId={modal.room.floorId}
          roomId={modal.room.roomId}
          isAdmin={auth.isAdmin}
          onOpenWorker={(workerId) => {
            open("worker", { open: true, workerId, roomCtx: null });
          }}
          onAddStay={null}
          onCheckoutStay={null}
          onTransfer={null}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LoginModal
          open={modal.login}
          onClose={() => close("login")}
          onLogin={async ({ email, password }) => {
            // bạn đang dùng supabase session để xác định isAdmin
            const res = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (res.error) throw new Error(res.error.message);

            // login xong đóng modal
            close("login");
          }}
        />
      </Suspense>

      <AddFloorModal />
      <AddRoomModal />
      <AddWorkerModal />
      <InitKtxModal />
      <LoginModal
        open={modal.login}
        onClose={() => close("login")}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        authIsAdmin={auth.isAdmin}
      />
      <ImportExcelModal />
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
      <DeletePasswordModal
        open={!!deletePassModal.open}
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
