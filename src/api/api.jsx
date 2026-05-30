import { message } from "antd";

const PB_URL = String(
  import.meta.env.DEV
    ? "/pb"
    : import.meta.env.VITE_POCKETBASE_URL ||
        import.meta.env.VITE_HOST ||
        "https://ripple-skyrocket-progeny.ngrok-free.dev",
).replace(/\/$/, "");
const debugMode = import.meta.env.VITE_DEBUGMODE === "development";
const backendHint = "Không kết nối được PocketBase qua Ngrok.";

const abortControllers = {};
const debounceTimers = {};
const DEFAULT_DELAY = 100;

function authHeaders() {
  const token = localStorage.getItem("token");
  if (token?.startsWith("pocketbase-") || token?.startsWith("mock-")) return {};
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearPrevious(url) {
  if (debounceTimers[url]) clearTimeout(debounceTimers[url]);
  if (abortControllers[url]) abortControllers[url].abort();
}

function makeError(status, data) {
  const err = new Error(data?.message || data?.error || `PocketBase error ${status}`);
  err.response = { status, data };
  return err;
}

function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

function pbRecordUrl(collection, suffix = "", params = {}) {
  return `${PB_URL}/api/collections/${collection}/records${suffix}${qs(params)}`;
}

async function pbRequest(collection, suffix = "", options = {}) {
  const res = await fetch(pbRecordUrl(collection, suffix, options.params), {
    method: options.method || "GET",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...authHeaders(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, data);
  return data;
}

function escapeFilter(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function eq(field, value) {
  return `${field} = "${escapeFilter(value)}"`;
}

function dateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function dateValue(value) {
  const d = dateOnly(value);
  return d ? `${d} 00:00:00.000Z` : null;
}

async function pbList(collection, params = {}, signal) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await pbRequest(collection, "", {
      signal,
      params: { page, perPage: 500, ...params },
    });
    out.push(...(data?.items || []));
    totalPages = data?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return out;
}

async function pbFirst(collection, params = {}, signal) {
  const data = await pbRequest(collection, "", {
    signal,
    params: { page: 1, perPage: 1, ...params },
  });
  return data?.items?.[0] || null;
}

const AUTH_COLLECTION = import.meta.env.VITE_POCKETBASE_AUTH_COLLECTION || "users";
const BUILDING_KEY = "ktx_current_building_id";
const AUTH_SETTINGS_KEY = "ktx_auth_require_approval";

function currentBuildingId() {
  return localStorage.getItem(BUILDING_KEY) || "";
}

function combineFilters(...filters) {
  return filters.filter(Boolean).join(" && ");
}

function localRequireApproval() {
  return localStorage.getItem(AUTH_SETTINGS_KEY) !== "false";
}

function saveLocalRequireApproval(value) {
  localStorage.setItem(AUTH_SETTINGS_KEY, value ? "true" : "false");
}

async function getAuthSettings(signal) {
  try {
    const row = await pbFirst("system_settings", { filter: eq("key", "auth") }, signal);
    const requireApproval = row?.require_approval !== false;
    saveLocalRequireApproval(requireApproval);
    return { id: row?.id || null, require_approval: requireApproval };
  } catch {
    return { id: null, require_approval: localRequireApproval() };
  }
}

async function saveAuthSettings(data, signal) {
  const requireApproval = data?.require_approval !== false;
  saveLocalRequireApproval(requireApproval);
  try {
    const current = await pbFirst("system_settings", { filter: eq("key", "auth") }, signal);
    const payload = { key: "auth", require_approval: requireApproval };
    const row = current
      ? await pbRequest("system_settings", `/${current.id}`, { method: "PATCH", body: payload, signal })
      : await pbRequest("system_settings", "", { method: "POST", body: payload, signal });
    return { id: row.id, require_approval: row.require_approval !== false };
  } catch {
    return { id: null, require_approval: requireApproval };
  }
}

function buildingFilter(extra = "") {
  const id = currentBuildingId();
  if (!id) return "__no_building__ = true";
  return combineFilters(eq("building_id", id), extra);
}

async function pbAuthRefresh(signal) {
  const res = await fetch(`${PB_URL}/api/collections/${AUTH_COLLECTION}/auth-refresh`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...authHeaders(),
    },
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, payload);
  return payload;
}

async function currentUser(signal) {
  const token = localStorage.getItem("token");
  if (!token || token.startsWith("mock-") || token.startsWith("pocketbase-")) return null;
  const payload = await pbAuthRefresh(signal);
  return payload?.record || null;
}

function isSystemAdmin(user) {
  return user?.role === "admin" || user?.isAdmin === true;
}

function isExpired(building) {
  const end = dateOnly(building?.end_date);
  return !!end && end < new Date().toISOString().slice(0, 10);
}

function normalizeWorker(row) {
  if (!row) return row;
  return { ...row, employee_code: row.employee_code || null, dob: dateOnly(row.dob) };
}

function workerOut(w) {
  return {
    id: w.id,
    employeeCode: w.employee_code || "",
    fullName: w.full_name || "",
    hometown: w.hometown || "",
    recruiter: w.recruiter || "",
    dob: dateOnly(w.dob) || "",
    phone: w.phone || "",
    note: w.note || "",
  };
}

function stayOut(s) {
  return {
    id: s.id,
    workerId: s.worker_id,
    roomId: s.room_id,
    dateIn: dateOnly(s.date_in),
    dateOut: dateOnly(s.date_out),
  };
}

function normalizeStay(s) {
  return { ...s, date_in: dateOnly(s.date_in), date_out: dateOnly(s.date_out) };
}

function buildingOut(building, accessRole = "viewer") {
  return {
    ...building,
    start_date: dateOnly(building.start_date),
    end_date: dateOnly(building.end_date),
    accessRole,
    expired: isExpired(building),
  };
}

async function loadBuildings(signal) {
  const me = await currentUser(signal);
  if (!me) {
    const publics = await pbList("buildings", { filter: "public_view = true", sort: "+code" }, signal);
    return publics.map((b) => buildingOut(b, "viewer"));
  }
  const all = await pbList("buildings", { sort: "+code" }, signal);
  if (isSystemAdmin(me)) return all.map((b) => buildingOut(b, "admin"));

  const memberships = await pbList("building_members", { filter: combineFilters(eq("user_id", me.id), "active = true") }, signal);
  const roleByBuilding = new Map(memberships.map((m) => [m.building_id, m.role || "viewer"]));
  return all
    .filter((b) => b.public_view || b.owner_id === me.id || roleByBuilding.has(b.id))
    .map((b) => buildingOut(b, b.owner_id === me.id ? "owner" : roleByBuilding.get(b.id) || "viewer"));
}

const DEFAULT_SETTINGS = {
  siteName: "KTX",
  roomGridCols: 3,
  canDeleteStructure: false,
  requirePasswordOnDelete: true,
  electricityPrice: 0,
  billingMonth: "",
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
};

function settingsFromRecord(row) {
  if (!row) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    siteName: row.site_name ?? DEFAULT_SETTINGS.siteName,
    roomGridCols: row.room_grid_cols ?? DEFAULT_SETTINGS.roomGridCols,
    canDeleteStructure: !!row.can_delete_structure,
    requirePasswordOnDelete: row.require_password_on_delete !== false,
    electricityPrice: row.electricity_price ?? 0,
    billingMonth: row.billing_month || "",
    about: { ...DEFAULT_SETTINGS.about, ...(row.about || {}) },
  };
}

function settingsToRecord(data) {
  return {
    key: "default",
    building_id: currentBuildingId(),
    site_name: data.siteName,
    room_grid_cols: Number(data.roomGridCols || 3),
    can_delete_structure: !!data.canDeleteStructure,
    require_password_on_delete: !!data.requirePasswordOnDelete,
    electricity_price: Number(data.electricityPrice || 0),
    billing_month: data.billingMonth || "",
    about: data.about || {},
  };
}

async function getSettingsRecord(signal) {
  return pbFirst(
    "app_settings",
    { filter: combineFilters(eq("key", "default"), buildingFilter()) },
    signal,
  );
}

async function deleteAll(collection, signal) {
  try {
    const rows = await pbList(collection, { sort: "-created" }, signal);
    for (const row of rows) await pbRequest(collection, `/${row.id}`, { method: "DELETE", signal });
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }
}

async function deleteRoomCascade(roomId, signal) {
  for (const collection of ["electricities", "water_records", "stays", "payments"]) {
    try {
      const rows = await pbList(collection, { filter: eq("room_id", roomId) }, signal);
      for (const row of rows) await pbRequest(collection, `/${row.id}`, { method: "DELETE", signal });
    } catch (e) {
      if (e?.response?.status !== 404) throw e;
    }
  }
  await pbRequest("rooms", `/${roomId}`, { method: "DELETE", signal });
}

async function loadAll(signal) {
  if (!currentBuildingId()) return { floors: [], workers: [] };
  const [floorsData, roomsData, workersData, staysData, elecData] = await Promise.all([
    pbList("floors", { filter: buildingFilter(), sort: "+sort" }, signal),
    pbList("rooms", { filter: buildingFilter(), sort: "+sort" }, signal),
    pbList("workers", { filter: buildingFilter(), sort: "+employee_code,+full_name" }, signal),
    pbList("stays", { filter: buildingFilter(), sort: "-date_in" }, signal),
    pbList("electricities", { filter: buildingFilter(), sort: "-month" }, signal),
  ]);

  const staysByRoom = new Map();
  staysData.forEach((s) => {
    if (!staysByRoom.has(s.room_id)) staysByRoom.set(s.room_id, []);
    staysByRoom.get(s.room_id).push(stayOut(s));
  });

  const elecByRoom = new Map();
  elecData.forEach((e) => {
    if (!elecByRoom.has(e.room_id)) elecByRoom.set(e.room_id, []);
    elecByRoom.get(e.room_id).push({ ...e, paid_at: e.paid_at || null });
  });

  const roomsByFloor = new Map();
  roomsData.forEach((r) => {
    if (!roomsByFloor.has(r.floor_id)) roomsByFloor.set(r.floor_id, []);
    roomsByFloor.get(r.floor_id).push({
      id: r.id,
      code: r.code,
      sort: r.sort,
      gender: r.gender || null,
      stays: staysByRoom.get(r.id) || [],
      electricity: elecByRoom.get(r.id) || [],
    });
  });

  return {
    floors: floorsData.map((f) => ({
      id: f.id,
      name: f.name,
      sort: f.sort,
      rooms: roomsByFloor.get(f.id) || [],
    })),
    workers: workersData.map(workerOut),
  };
}

async function handleGet(url, signal) {
  const u = new URL(url, "http://local");
  const path = u.pathname;
  if (path === "/me/") {
    const payload = await pbAuthRefresh(signal);
    return { ...(payload.record || {}), access_token: payload.token };
  }
  if (path === "/auth-settings/") return getAuthSettings(signal);
  if (path === "/users/") return pbList(AUTH_COLLECTION, { sort: "+username,+email" }, signal);
  if (path === "/buildings/") return loadBuildings(signal);
  if (path === "/building-members/") {
    const filters = [];
    if (u.searchParams.get("building_id")) filters.push(eq("building_id", u.searchParams.get("building_id")));
    if (u.searchParams.get("user_id")) filters.push(eq("user_id", u.searchParams.get("user_id")));
    return pbList("building_members", { filter: filters.join(" && "), sort: "+created" }, signal);
  }
  if (path === "/load-all/") return loadAll(signal);
  if (path === "/settings/") {
    const row = await getSettingsRecord(signal);
    if (!row) {
      const created = await pbRequest("app_settings", "", { method: "POST", body: settingsToRecord(DEFAULT_SETTINGS), signal });
      return settingsFromRecord(created);
    }
    return settingsFromRecord(row);
  }
  if (path === "/workers/") return (await pbList("workers", { filter: buildingFilter(), sort: "+employee_code,+full_name" }, signal)).map(normalizeWorker);
  if (path.startsWith("/workers/by-code/")) {
    const code = decodeURIComponent(path.split("/")[3] || "").trim().toUpperCase();
    const row = await pbFirst("workers", { filter: combineFilters(eq("employee_code", code), buildingFilter()) }, signal);
    if (!row) throw makeError(404, { error: "Not found" });
    return normalizeWorker(row);
  }
  if (/^\/workers\/[^/]+\/?$/.test(path)) return normalizeWorker(await pbRequest("workers", `/${path.split("/")[2]}`, { signal }));
  if (path === "/floors/") return pbList("floors", { filter: buildingFilter(), sort: "+sort" }, signal);
  if (/^\/floors\/[^/]+\/?$/.test(path)) return pbRequest("floors", `/${path.split("/")[2]}`, { signal });
  if (path === "/rooms/") return (await pbList("rooms", { filter: buildingFilter(), sort: "+sort" }, signal)).map((r) => ({ ...r, gender: r.gender || null }));
  if (/^\/rooms\/[^/]+\/?$/.test(path)) {
    const row = await pbRequest("rooms", `/${path.split("/")[2]}`, { signal });
    return { ...row, gender: row.gender || null };
  }
  if (path === "/stays/") return (await pbList("stays", { filter: buildingFilter(), sort: "-date_in" }, signal)).map(normalizeStay);
  if (path === "/electricities/") return pbList("electricities", { filter: buildingFilter(), sort: "-month" }, signal);
  if (path.startsWith("/electricities/room/")) {
    const roomId = path.split("/")[3];
    return pbList("electricities", { filter: combineFilters(eq("room_id", roomId), buildingFilter()), sort: "-month" }, signal);
  }
  if (path === "/notes/") {
    const filters = [];
    if (u.searchParams.get("target_id")) filters.push(eq("target_id", u.searchParams.get("target_id")));
    if (u.searchParams.get("target_type")) filters.push(eq("target_type", u.searchParams.get("target_type")));
    return pbList("general_notes", { filter: combineFilters(filters.join(" && "), buildingFilter()), sort: "-created" }, signal);
  }
  throw makeError(404, { error: `Unsupported GET ${path}` });
}

async function pbAuthWithPassword(username, password, signal) {
  const authCollection = import.meta.env.VITE_POCKETBASE_AUTH_COLLECTION || "users";
  const res = await fetch(`${PB_URL}/api/collections/${authCollection}/auth-with-password`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ identity: username, password }),
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, payload);
  const record = payload.record || {};
  if (record.role !== "admin" && record.approved === false) {
    throw makeError(403, { error: "Tài khoản đang chờ admin phê duyệt." });
  }
  return {
    access_token: payload.token,
    expires_in: 604800,
    data: { ...record },
  };
}

async function pbRegisterUser(data, signal) {
  const username = String(data?.username || "").trim();
  const password = String(data?.password || "");
  const name = String(data?.name || "").trim();
  if (!username || !password) throw makeError(400, { error: "Nhập username và mật khẩu." });
  const authSettings = await getAuthSettings(signal);
  const approved = authSettings.require_approval === false;
  await pbRequest(AUTH_COLLECTION, "", {
    method: "POST",
    body: {
      username,
      password,
      passwordConfirm: password,
      name,
      role: "user",
      approved,
    },
    signal,
  });
  if (!approved) {
    return { pending_approval: true, message: "Tài khoản đã được tạo và đang chờ admin phê duyệt." };
  }
  return pbAuthWithPassword(username, password, signal);
}

function userPayload(data = {}, includePassword = false) {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(data, "username")) payload.username = String(data.username || "").trim();
  if (Object.prototype.hasOwnProperty.call(data, "name")) payload.name = String(data.name || "").trim();
  if (Object.prototype.hasOwnProperty.call(data, "role")) payload.role = data.role === "admin" ? "admin" : "user";
  if (Object.prototype.hasOwnProperty.call(data, "approved")) payload.approved = data.approved !== false;
  if (includePassword || data.password) {
    payload.password = String(data.password || "");
    payload.passwordConfirm = payload.password;
  }
  return payload;
}

async function handlePost(url, data, signal) {
  const path = new URL(url, "http://local").pathname;
  const building_id = currentBuildingId();
  if (path === "/login/") return pbAuthWithPassword(data?.username, data?.password, signal);
  if (path === "/register/") return pbRegisterUser(data, signal);
  if (path === "/auth-settings/") return saveAuthSettings(data, signal);
  if (path === "/users/") {
    const payload = userPayload(data, true);
    if (!payload.username || !payload.password) throw makeError(400, { error: "Nhập username và mật khẩu." });
    if (!Object.prototype.hasOwnProperty.call(payload, "approved")) payload.approved = true;
    return pbRequest(AUTH_COLLECTION, "", { method: "POST", body: payload, signal });
  }
  if (path === "/buildings/") {
    const payload = {
      code: String(data.code || "").trim().toUpperCase(),
      name: String(data.name || "").trim(),
      owner_id: data.owner_id || null,
      start_date: dateValue(data.start_date),
      end_date: dateValue(data.end_date),
      public_view: !!data.public_view,
      note: data.note || "",
    };
    return buildingOut(await pbRequest("buildings", "", { method: "POST", body: payload, signal }), "admin");
  }
  if (path === "/building-members/") {
    return pbRequest("building_members", "", { method: "POST", body: { ...data, active: data.active !== false }, signal });
  }
  if (path === "/init-ktx/") {
    if (!building_id) throw makeError(400, { error: "Chưa chọn tòa nhà." });
    const F = Number(data.floors);
    const R = Number(data.roomsPerFloor);
    const S = Number(data.startNo);
    const existing = await pbFirst("floors", { filter: buildingFilter() }, signal);
    if (existing) throw makeError(400, { error: "KTX đã có tầng/phòng. Hãy reset dữ liệu trước khi khởi tạo lại." });
    for (let i = 0; i < F; i += 1) {
      const floor = await pbRequest("floors", "", { method: "POST", body: { building_id, name: `Tang ${i + 1}`, sort: i + 1 }, signal });
      for (let j = 0; j < R; j += 1) {
        await pbRequest("rooms", "", { method: "POST", body: { building_id, floor_id: floor.id, code: String(S + i * R + j), sort: j + 1 }, signal });
      }
    }
    return { message: "Initialized successfully" };
  }
  if (path === "/wipe-database/") {
    if (!building_id) throw makeError(400, { error: "Chưa chọn tòa nhà." });
    for (const c of ["general_notes", "payments", "water_records", "electricities", "stays", "workers", "rooms", "floors"]) {
      const rows = await pbList(c, { filter: eq("building_id", building_id), sort: "-created" }, signal);
      for (const row of rows) await pbRequest(c, `/${row.id}`, { method: "DELETE", signal });
    }
    return { message: "Database wiped successfully" };
  }
  if (path === "/workers/") {
    const payload = { ...data, building_id, employee_code: data.employee_code ? String(data.employee_code).trim().toUpperCase() : null, dob: dateValue(data.dob) };
    return normalizeWorker(await pbRequest("workers", "", { method: "POST", body: payload, signal }));
  }
  if (path === "/floors/") return pbRequest("floors", "", { method: "POST", body: { ...data, building_id, sort: Number(data.sort || 0) }, signal });
  if (path === "/rooms/") return pbRequest("rooms", "", { method: "POST", body: { ...data, building_id, sort: Number(data.sort || 0) }, signal });
  if (path === "/stays/") {
    const activeRows = await pbList("stays", { filter: combineFilters(eq("worker_id", data.worker_id), buildingFilter()), sort: "-date_in" }, signal);
    if (!data.date_out && activeRows.some((s) => !s.date_out)) throw makeError(409, { error: "NLĐ đang có lượt ở hiện tại (date_out = null)." });
    return normalizeStay(await pbRequest("stays", "", { method: "POST", body: { ...data, building_id, date_in: dateValue(data.date_in), date_out: dateValue(data.date_out) }, signal }));
  }
  if (path === "/electricities/") {
    const payload = { ...data, building_id, start_reading: Number(data.start_reading || 0), end_reading: Number(data.end_reading || 0), paid: !!data.paid, paid_at: data.paid ? new Date().toISOString() : null };
    if (data.id) return pbRequest("electricities", `/${data.id}`, { method: "PATCH", body: payload, signal });
    const existing = await pbFirst("electricities", { filter: combineFilters(eq("room_id", data.room_id), eq("month", data.month), buildingFilter()) }, signal);
    return existing
      ? pbRequest("electricities", `/${existing.id}`, { method: "PATCH", body: payload, signal })
      : pbRequest("electricities", "", { method: "POST", body: payload, signal });
  }
  if (path === "/notes/") return pbRequest("general_notes", "", { method: "POST", body: { ...data, building_id }, signal });
  throw makeError(404, { error: `Unsupported POST ${path}` });
}
async function handlePatch(url, data, signal) {
  const path = new URL(url, "http://local").pathname;
  if (/^\/users\/[^/]+\/?$/.test(path)) {
    const payload = userPayload(data, false);
    if (Object.prototype.hasOwnProperty.call(payload, "password") && !payload.password) {
      delete payload.password;
      delete payload.passwordConfirm;
    }
    return pbRequest(AUTH_COLLECTION, `/${path.split("/")[2]}`, { method: "PATCH", body: payload, signal });
  }
  if (/^\/buildings\/[^/]+\/?$/.test(path)) {
    const payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(payload, "code")) payload.code = String(payload.code || "").trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(payload, "start_date")) payload.start_date = dateValue(payload.start_date);
    if (Object.prototype.hasOwnProperty.call(payload, "end_date")) payload.end_date = dateValue(payload.end_date);
    return buildingOut(await pbRequest("buildings", `/${path.split("/")[2]}`, { method: "PATCH", body: payload, signal }), "admin");
  }
  if (/^\/building-members\/[^/]+\/?$/.test(path)) {
    return pbRequest("building_members", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  }
  if (path === "/settings/") {
    const payload = settingsToRecord({ ...DEFAULT_SETTINGS, ...data, about: { ...DEFAULT_SETTINGS.about, ...(data.about || {}) } });
    const current = await getSettingsRecord(signal);
    const row = current
      ? await pbRequest("app_settings", `/${current.id}`, { method: "PATCH", body: payload, signal })
      : await pbRequest("app_settings", "", { method: "POST", body: payload, signal });
    return settingsFromRecord(row);
  }
  if (/^\/workers\/[^/]+\/?$/.test(path)) {
    const payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(payload, "employee_code")) payload.employee_code = payload.employee_code ? String(payload.employee_code).trim().toUpperCase() : null;
    if (Object.prototype.hasOwnProperty.call(payload, "dob")) payload.dob = dateValue(payload.dob);
    return normalizeWorker(await pbRequest("workers", `/${path.split("/")[2]}`, { method: "PATCH", body: payload, signal }));
  }
  if (/^\/floors\/[^/]+\/?$/.test(path)) return pbRequest("floors", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  if (/^\/rooms\/[^/]+\/?$/.test(path)) return pbRequest("rooms", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  if (/^\/stays\/[^/]+\/?$/.test(path)) return normalizeStay(await pbRequest("stays", `/${path.split("/")[2]}`, { method: "PATCH", body: { date_out: dateValue(data.date_out) }, signal }));
  if (/^\/electricities\/[^/]+\/pay\/?$/.test(path)) return pbRequest("electricities", `/${path.split("/")[2]}`, { method: "PATCH", body: { paid: true, paid_at: new Date().toISOString() }, signal });
  if (/^\/notes\/[^/]+\/?$/.test(path)) return pbRequest("general_notes", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  throw makeError(404, { error: `Unsupported PATCH ${path}` });
}

async function handleDelete(url, signal) {
  const path = new URL(url, "http://local").pathname;
  if (/^\/users\/[^/]+\/?$/.test(path)) {
    await pbRequest(AUTH_COLLECTION, `/${path.split("/")[2]}`, { method: "DELETE", signal });
    return { message: "Deleted successfully" };
  }
  if (/^\/buildings\/[^/]+\/?$/.test(path)) {
    await pbRequest("buildings", `/${path.split("/")[2]}`, { method: "DELETE", signal });
    return { message: "Deleted successfully" };
  }
  if (/^\/building-members\/[^/]+\/?$/.test(path)) {
    await pbRequest("building_members", `/${path.split("/")[2]}`, { method: "DELETE", signal });
    return { message: "Deleted successfully" };
  }
  if (/^\/floors\/[^/]+\/?$/.test(path)) {
    const floorId = path.split("/")[2];
    const rooms = await pbList("rooms", { filter: eq("floor_id", floorId) }, signal);
    for (const room of rooms) await deleteRoomCascade(room.id, signal);
    await pbRequest("floors", `/${floorId}`, { method: "DELETE", signal });
    return { message: "Deleted successfully" };
  }
  if (/^\/rooms\/[^/]+\/?$/.test(path)) {
    await deleteRoomCascade(path.split("/")[2], signal);
    return { message: "Deleted successfully" };
  }
  const map = { workers: "workers", stays: "stays", electricities: "electricities", notes: "general_notes" };
  const [, route, id] = path.split("/");
  if (map[route] && id) {
    await pbRequest(map[route], `/${id}`, { method: "DELETE", signal });
    return { message: "Deleted successfully" };
  }
  throw makeError(404, { error: `Unsupported DELETE ${path}` });
}

function wrap(url, fn, delay = DEFAULT_DELAY) {
  clearPrevious(url);
  return new Promise((resolve, reject) => {
    debounceTimers[url] = setTimeout(async () => {
      const controller = new AbortController();
      abortControllers[url] = controller;
      try {
        const started = Date.now();
        const data = await fn(controller.signal);
        if (debugMode) console.log(`[PocketBase] ${url} ${Date.now() - started}ms`, PB_URL);
        resolve(data);
      } catch (e) {
        error(e);
        reject(e);
      } finally {
        delete debounceTimers[url];
        delete abortControllers[url];
      }
    }, delay);
  });
}

export const debounceGet = (url, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handleGet(url, signal), delay);
export const debouncePost = (url, data, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handlePost(url, data, signal), delay);
export const debouncePatch = (url, data, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handlePatch(url, data, signal), delay);
export const debounceDelete = (url, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handleDelete(url, signal), delay);

function error(e) {
  const data = e?.response?.data;
  message.error(data?.detail || data?.details || data?.error || data?.message || e?.message || backendHint);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

function setCookie(name, value, seconds) {
  document.cookie = `${name}=${value || ""}${seconds ? `; max-age=${seconds}` : ""}; path=/; SameSite=Lax`;
}

function removeCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

function saveToken(token) {
  localStorage.setItem("token", token);
}

function getToken() {
  return localStorage.getItem("token");
}

function removeToken() {
  localStorage.removeItem("token");
}

export default {
  saveToken,
  getToken,
  removeToken,
  setCookie,
  removeCookie,
  getCookie,
  error,
  get: debounceGet,
  post: debouncePost,
  patch: debouncePatch,
  delete: debounceDelete,
};
