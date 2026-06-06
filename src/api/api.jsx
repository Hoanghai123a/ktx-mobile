import { message } from "antd";

const PB_URL = String(
  import.meta.env.DEV
    ? "/pb"
    : import.meta.env.VITE_POCKETBASE_URL || "/pb",
).replace(/\/$/, "");
const debugMode = import.meta.env.VITE_DEBUGMODE === "development";
const pocketBaseHint = "Khong ket noi duoc PocketBase local.";

const DEFAULT_DELAY = 0;

function authHeaders() {
  const token = localStorage.getItem("token");
  if (token?.startsWith("pocketbase-") || token?.startsWith("mock-")) return {};
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function pbErrorMessage(status, data) {
  const detail = data?.data || data?.details || data?.detail;
  if (detail && typeof detail === "object" && Object.keys(detail).length) {
    const first = Object.entries(detail)[0];
    const msg = first?.[1]?.message || first?.[1]?.error || first?.[1]?.code;
    if (msg) return `${data?.message || `PocketBase error ${status}`}: ${first[0]} - ${msg}`;
  }
  return data?.message || data?.error || `PocketBase error ${status}`;
}

function makeError(status, data) {
  const err = new Error(pbErrorMessage(status, data));
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
  const url = pbRecordUrl(collection, suffix, options.params);
  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    if (options.method && options.method !== "GET" && !options._retriedNetwork) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return pbRequest(collection, suffix, { ...options, _retriedNetwork: true });
    }
    const detail = `${options.method || "GET"} ${url}`;
    throw makeError(0, { error: `${err?.message || "Failed to fetch"}: ${detail}` });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, data);
  return data;
}

function escapeFilter(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function eq(field, value) {
  return `${field} = "${escapeFilter(value)}"`;
}

function anyEq(field, value) {
  return `${field} ?= "${escapeFilter(value)}"`;
}

function dateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function dateValue(value) {
  const d = dateOnly(value);
  return d ? `${d} 00:00:00.000Z` : null;
}

function tokenPayload(token) {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

async function pbList(collection, params = {}, signal) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await pbRequestWithBuildingFilterFallback(collection, "", {
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
  const data = await pbRequestWithBuildingFilterFallback(collection, "", {
    signal,
    params: { page: 1, perPage: 1, ...params },
  });
  return data?.items?.[0] || null;
}

function alternateBuildingFilter(filter) {
  const text = String(filter || "");
  if (text.includes("building_id ?=")) return text.replace(/building_id \?=/g, "building_id =");
  if (text.includes("building_id =")) return text.replace(/building_id =/g, "building_id ?=");
  return "";
}

async function pbRequestWithBuildingFilterFallback(collection, suffix = "", options = {}) {
  try {
    return await pbRequest(collection, suffix, options);
  } catch (e) {
    const altFilter = alternateBuildingFilter(options?.params?.filter);
    if (!altFilter || ![400, 500].includes(e?.response?.status)) throw e;
    return await pbRequest(collection, suffix, {
      ...options,
      params: { ...(options.params || {}), filter: altFilter },
    });
  }
}

const AUTH_COLLECTION = import.meta.env.VITE_POCKETBASE_AUTH_COLLECTION || "users";
const USER_PREFERENCES_COLLECTION = "user_preferences";
const BUILDING_KEY = "ktx_current_building_id";
const AUTH_SETTINGS_KEY = "ktx_auth_require_approval";

function currentBuildingId() {
  return localStorage.getItem(BUILDING_KEY) || "";
}

function combineFilters(...filters) {
  return filters.filter(Boolean).join(" && ");
}

function normalizeIdList(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
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
    if (!row) return { id: null, require_approval: localRequireApproval() };
    const requireApproval = row.require_approval !== false;
    saveLocalRequireApproval(requireApproval);
    return { id: row.id, require_approval: requireApproval };
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

async function loadUserPreferences(signal) {
  const me = await currentUser(signal);
  if (!me?.id) throw makeError(401, { error: "Unauthorized" });
  try {
    const row = await pbFirst(USER_PREFERENCES_COLLECTION, { filter: eq("user_id", me.id) }, signal);
    return {
      synced: true,
      exists: !!row,
      pinnedBuildingIds: normalizeIdList(row?.pinned_building_ids || row?.pinnedBuildingIds),
      lastBuildingId: row?.last_building_id || row?.lastBuildingId || "",
    };
  } catch (e) {
    if (e?.response?.status === 404) {
      return { synced: false, exists: false, pinnedBuildingIds: [], lastBuildingId: "" };
    }
    throw e;
  }
}

async function saveUserPreferences(data, signal) {
  const me = await currentUser(signal);
  if (!me?.id) throw makeError(401, { error: "Unauthorized" });
  const payload = {
    user_id: me.id,
    pinned_building_ids: normalizeIdList(data?.pinnedBuildingIds || data?.pinned_building_ids),
    last_building_id: String(data?.lastBuildingId || data?.last_building_id || "").trim(),
  };
  try {
    const current = await pbFirst(USER_PREFERENCES_COLLECTION, { filter: eq("user_id", me.id) }, signal);
    const row = current
      ? await pbRequest(USER_PREFERENCES_COLLECTION, `/${current.id}`, { method: "PATCH", body: payload, signal })
      : await pbRequest(USER_PREFERENCES_COLLECTION, "", { method: "POST", body: payload, signal });
    return {
      synced: true,
      exists: true,
      pinnedBuildingIds: normalizeIdList(row?.pinned_building_ids || payload.pinned_building_ids),
      lastBuildingId: row?.last_building_id || payload.last_building_id || "",
    };
  } catch (e) {
    if (e?.response?.status === 404) {
      return { synced: false, exists: false, pinnedBuildingIds: payload.pinned_building_ids, lastBuildingId: payload.last_building_id };
    }
    throw e;
  }
}

function buildingFilter(extra = "") {
  const id = currentBuildingId();
  if (!id) return "__no_building__ = true";
  return combineFilters(anyEq("building_id", id), extra);
}

function settingsKey(global = false) {
  return global || !currentBuildingId() ? "global" : "default";
}

function settingsFilter(global = false) {
  const id = global ? "" : currentBuildingId();
  return combineFilters(
    eq("key", settingsKey(global)),
    id ? anyEq("building_id", id) : "",
  );
}

async function currentUser(signal) {
  const token = localStorage.getItem("token");
  if (!token || token.startsWith("mock-") || token.startsWith("pocketbase-")) return null;
  const payload = tokenPayload(token);
  if (!payload?.id || (payload.exp && payload.exp * 1000 <= Date.now())) {
    removeToken();
    removeCookie("token");
    return null;
  }
  try {
    return await pbRequest(AUTH_COLLECTION, `/${payload.id}`, { signal });
  } catch (error) {
    if ([400, 401, 403].includes(error?.response?.status)) {
      removeToken();
      removeCookie("token");
      return null;
    }
    throw error;
  }
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
  return { ...row, employee_code: row.employee_code || null, dob: dateOnly(row.dob), gender: row.gender || null, identity_number: row.identity_number || "", electricity_fee: Number(row.electricity_fee || 0), water_fee: Number(row.water_fee || 0), free_room_days: Math.max(0, Math.floor(Number(row.free_room_days || 0))) };
}

function workerOut(w) {
  return {
    id: w.id,
    employeeCode: w.employee_code || "",
    fullName: w.full_name || "",
    gender: w.gender || "",
    identityNumber: w.identity_number || "",
    electricityFee: Number(w.electricity_fee || 0),
    waterFee: Number(w.water_fee || 0),
    freeRoomDays: Math.max(0, Math.floor(Number(w.free_room_days || 0))),
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
    electricityStartReading: s.electricity_start_reading == null ? null : Number(s.electricity_start_reading),
    waterStartReading: s.water_start_reading == null ? null : Number(s.water_start_reading),
    electricityEndReading: s.electricity_end_reading == null ? null : Number(s.electricity_end_reading),
    waterEndReading: s.water_end_reading == null ? null : Number(s.water_end_reading),
    electricityAmount: Number(s.electricity_amount || 0),
    waterAmount: Number(s.water_amount || 0),
    roomAmount: Math.max(0, Number(s.total_amount || 0) - Number(s.electricity_amount || 0) - Number(s.water_amount || 0)),
    totalAmount: Number(s.total_amount || 0),
    utilityPaidAt: s.utility_paid_at || null,
    utilityPaidMonth: s.utility_paid_month || "",
  };
}

function normalizeStay(s) {
  return {
    ...s,
    date_in: dateOnly(s.date_in),
    date_out: dateOnly(s.date_out),
    electricity_start_reading: s.electricity_start_reading == null ? null : Number(s.electricity_start_reading),
    water_start_reading: s.water_start_reading == null ? null : Number(s.water_start_reading),
    electricity_end_reading: s.electricity_end_reading == null ? null : Number(s.electricity_end_reading),
    water_end_reading: s.water_end_reading == null ? null : Number(s.water_end_reading),
    electricity_amount: Number(s.electricity_amount || 0),
    water_amount: Number(s.water_amount || 0),
    room_amount: Math.max(0, Number(s.total_amount || 0) - Number(s.electricity_amount || 0) - Number(s.water_amount || 0)),
    total_amount: Number(s.total_amount || 0),
    utility_paid_at: s.utility_paid_at || null,
    utility_paid_month: s.utility_paid_month || "",
  };
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
  logoUrl: "/logo.png",
  roomGridCols: 3,
  canDeleteStructure: false,
  requirePasswordOnDelete: true,
  adminContact: {
    name: "",
    phone: "",
    email: "",
    zalo: "",
    note: "",
  },
  electricityPrice: 0,
  waterPrice: 0,
  waterBillingMode: "shared",
  roomMonthlyPrice: 0,
  roomBillingMode: "postpaid",
  billingMonth: "",
  billingCloseDay: 10,
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
    logoUrl: row.logo_url || row.about?.brandLogoUrl || DEFAULT_SETTINGS.logoUrl,
    roomGridCols: row.room_grid_cols ?? DEFAULT_SETTINGS.roomGridCols,
    canDeleteStructure: !!row.can_delete_structure,
    requirePasswordOnDelete: row.require_password_on_delete !== false,
    electricityPrice: row.electricity_price ?? 0,
    waterPrice: row.water_price ?? row.about?.utilitySettings?.waterPrice ?? 0,
    waterBillingMode: row.about?.utilitySettings?.waterBillingMode === "no_split" ? "no_split" : "shared",
    roomMonthlyPrice: row.room_monthly_price ?? row.about?.utilitySettings?.roomMonthlyPrice ?? 0,
    roomBillingMode: row.about?.utilitySettings?.roomBillingMode === "prepaid" ? "prepaid" : "postpaid",
    billingMonth: row.billing_month || "",
    billingCloseDay: row.billing_close_day ?? row.about?.utilitySettings?.billingCloseDay ?? 10,
    about: { ...DEFAULT_SETTINGS.about, ...(row.about || {}) },
    adminContact: { ...DEFAULT_SETTINGS.adminContact, ...(row.admin_contact || row.adminContact || row.about?.adminContact || {}) },
  };
}

function applyGlobalBrand(settings, globalRow) {
  if (!globalRow) return settings;
  const globalSettings = settingsFromRecord(globalRow);
  return {
    ...settings,
    siteName: globalSettings.siteName,
    logoUrl: globalSettings.logoUrl,
    about: {
      ...(settings.about || {}),
      brandLogoUrl: globalSettings.logoUrl,
    },
  };
}

function settingsToRecord(data) {
  const global = data.__globalBrand === true;
  const buildingId = global ? "" : currentBuildingId();
  return {
    key: settingsKey(global),
    ...(buildingId ? { building_id: buildingId } : {}),
    site_name: data.siteName,
    room_grid_cols: Number(data.roomGridCols || 3),
    can_delete_structure: !!data.canDeleteStructure,
    require_password_on_delete: !!data.requirePasswordOnDelete,
    electricity_price: Number(data.electricityPrice || 0),
    water_price: Number(data.waterPrice || 0),
    billing_month: data.billingMonth || "",
    billing_close_day: Math.min(31, Math.max(1, Number(data.billingCloseDay || 10))),
    about: {
      ...(data.about || {}),
      brandLogoUrl: data.logoUrl || DEFAULT_SETTINGS.logoUrl,
      adminContact: data.adminContact || {},
      utilitySettings: {
        ...((data.about || {}).utilitySettings || {}),
        waterPrice: Number(data.waterPrice || 0),
        waterBillingMode: data.waterBillingMode === "no_split" ? "no_split" : "shared",
        roomMonthlyPrice: Number(data.roomMonthlyPrice || 0),
        roomBillingMode: data.roomBillingMode === "prepaid" ? "prepaid" : "postpaid",
        billingCloseDay: Math.min(31, Math.max(1, Number(data.billingCloseDay || 10))),
      },
    },
  };
}

async function safeList(collection, params = {}, signal) {
  try {
    return await pbList(collection, params, signal);
  } catch (e) {
    if (e?.response?.status === 404) return [];
    throw e;
  }
}

async function getSettingsRecord(signal, global = false) {
  return pbFirst(
    "app_settings",
    { filter: settingsFilter(global) },
    signal,
  );
}

async function deleteRowsByFilter(collection, filter, signal) {
  try {
    const rows = await pbList(collection, { filter, sort: "-created" }, signal);
    for (const row of rows) await pbRequest(collection, `/${row.id}`, { method: "DELETE", signal });
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }
}

async function deleteBuildingCascade(buildingId, signal) {
  const filter = anyEq("building_id", buildingId);
  for (const collection of ["general_notes", "water_records", "electricities", "stays", "workers", "rooms", "floors", "app_settings"]) {
    await deleteRowsByFilter(collection, filter, signal);
  }
  await deleteRowsByFilter("building_members", filter, signal);
  await pbRequest("buildings", `/${buildingId}`, { method: "DELETE", signal });
}

async function deleteUserCascade(userId, signal) {
  await deleteRowsByFilter("building_members", eq("user_id", userId), signal);
  await pbRequest(AUTH_COLLECTION, `/${userId}`, { method: "DELETE", signal });
}

async function deleteRoomCascade(roomId, signal) {
  for (const collection of ["electricities", "water_records", "stays"]) {
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
  const [floorsData, roomsData, workersData, staysData, elecData, waterData] = await Promise.all([
    pbList("floors", { filter: buildingFilter(), sort: "+sort" }, signal),
    pbList("rooms", { filter: buildingFilter(), sort: "+sort" }, signal),
    pbList("workers", { filter: buildingFilter(), sort: "+employee_code,+full_name" }, signal),
    pbList("stays", { filter: buildingFilter(), sort: "-date_in" }, signal),
    pbList("electricities", { filter: buildingFilter(), sort: "-month" }, signal),
    safeList("water_records", { filter: buildingFilter(), sort: "-month" }, signal),
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

  const waterByRoom = new Map();
  waterData.forEach((e) => {
    if (!waterByRoom.has(e.room_id)) waterByRoom.set(e.room_id, []);
    waterByRoom.get(e.room_id).push({ ...e, paid_at: e.paid_at || null });
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
      water: waterByRoom.get(r.id) || [],
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
    const user = await currentUser(signal);
    if (!user) throw makeError(401, { error: "Unauthorized" });
    return { ...user, access_token: localStorage.getItem("token") };
  }
  if (path === "/auth-settings/") return getAuthSettings(signal);
  if (path === "/pinned-buildings/") return loadUserPreferences(signal);
  if (path === "/users/") return pbList(AUTH_COLLECTION, { sort: "+username,+name" }, signal);
  if (path === "/buildings/") return loadBuildings(signal);
  if (path === "/building-members/") {
    const filters = [];
    if (u.searchParams.get("building_id")) filters.push(eq("building_id", u.searchParams.get("building_id")));
    if (u.searchParams.get("user_id")) filters.push(eq("user_id", u.searchParams.get("user_id")));
    return pbList("building_members", { filter: filters.join(" && "), sort: "+created" }, signal);
  }
  if (path === "/load-all/") return loadAll(signal);
  if (path === "/settings/") {
    const [row, globalRow] = await Promise.all([
      getSettingsRecord(signal),
      getSettingsRecord(signal, true),
    ]);
    if (!row) {
      if (globalRow) return applyGlobalBrand(settingsFromRecord(globalRow), globalRow);
      const created = await pbRequest("app_settings", "", { method: "POST", body: settingsToRecord(DEFAULT_SETTINGS), signal });
      return applyGlobalBrand(settingsFromRecord(created), globalRow);
    }
    return applyGlobalBrand(settingsFromRecord(row), globalRow);
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
  if (path === "/water-records/") return pbList("water_records", { filter: buildingFilter(), sort: "-month" }, signal);
  if (path.startsWith("/water-records/room/")) {
    const roomId = path.split("/")[3];
    return pbList("water_records", { filter: combineFilters(eq("room_id", roomId), buildingFilter()), sort: "-month" }, signal);
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
  const identity = normalizeUsername(username);
  const res = await fetch(`${PB_URL}/api/collections/${authCollection}/auth-with-password`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identity, password }),
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, payload);
  const record = payload.record || {};
  saveToken(payload.token);
  setCookie("token", payload.token, 604800);
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
  const username = normalizeUsername(data?.username);
  const password = String(data?.password || "");
  const name = String(data?.name || "").trim();
  if (!username || !password) throw makeError(400, { error: "Nhập username và mật khẩu." });
  if (password.length < 8) throw makeError(400, { error: "Mật khẩu đăng ký phải có ít nhất 8 ký tự." });
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
    return { pending_approval: true, approved: false, message: "Tài khoản đã được tạo và đang chờ admin phê duyệt." };
  }
  const auth = await pbAuthWithPassword(username, password, signal);
  return { ...auth, approved: true, message: "Tạo tài khoản thành công." };
}

function userPayload(data = {}, includePassword = false) {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(data, "username")) payload.username = normalizeUsername(data.username);
  if (Object.prototype.hasOwnProperty.call(data, "name")) payload.name = String(data.name || "").trim();
  if (Object.prototype.hasOwnProperty.call(data, "role")) payload.role = data.role === "admin" ? "admin" : "user";
  if (Object.prototype.hasOwnProperty.call(data, "approved")) payload.approved = data.approved !== false;
  if (includePassword || data.password) {
    payload.password = String(data.password || "");
    payload.passwordConfirm = Object.prototype.hasOwnProperty.call(data, "passwordConfirm")
      ? String(data.passwordConfirm || "")
      : payload.password;
  }
  if (Object.prototype.hasOwnProperty.call(data, "oldPassword")) payload.oldPassword = String(data.oldPassword || "");
  return payload;
}

async function handlePost(url, data, signal) {
  const path = new URL(url, "http://local").pathname;
  const building_id = currentBuildingId();
  if (path === "/login/") return pbAuthWithPassword(data?.username, data?.password, signal);
  if (path === "/register/") return pbRegisterUser(data, signal);
  if (path === "/auth-settings/") return saveAuthSettings(data, signal);
  if (path === "/pinned-buildings/") return saveUserPreferences(data, signal);
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
    const useRanges = data.mode === "ranges" && Array.isArray(data.floorRanges);
    const ranges = useRanges
      ? data.floorRanges.map((row, index) => ({
          name: String(row?.name || `Tầng ${index + 1}`).trim(),
          startNo: Math.floor(Number(row?.startNo)),
          endNo: Math.floor(Number(row?.endNo)),
        }))
      : [];

    if (useRanges) {
      if (!ranges.length) throw makeError(400, { error: "Chưa nhập khoảng phòng theo tầng." });
      const roomCodes = new Set();
      for (const [index, row] of ranges.entries()) {
        if (!Number.isInteger(row.startNo) || !Number.isInteger(row.endNo) || row.startNo <= 0 || row.endNo < row.startNo) {
          throw makeError(400, { error: `Khoảng phòng tầng ${index + 1} không hợp lệ.` });
        }
        for (let code = row.startNo; code <= row.endNo; code += 1) {
          if (roomCodes.has(code)) throw makeError(400, { error: `Mã phòng ${code} bị trùng giữa các tầng.` });
          roomCodes.add(code);
        }
      }
    }

    const F = Math.floor(Number(data.floors));
    const R = Math.floor(Number(data.roomsPerFloor));
    const S = Math.floor(Number(data.startNo));
    if (!useRanges && (!Number.isInteger(F) || !Number.isInteger(R) || !Number.isInteger(S) || F <= 0 || R <= 0 || S <= 0)) {
      throw makeError(400, { error: "Số tầng, số phòng và mã bắt đầu không hợp lệ." });
    }
    const existing = await pbFirst("floors", { filter: buildingFilter() }, signal);
    if (existing) throw makeError(400, { error: "KTX đã có tầng/phòng. Hãy reset dữ liệu trước khi khởi tạo lại." });
    if (useRanges) {
      for (const [index, row] of ranges.entries()) {
        const floor = await pbRequest("floors", "", { method: "POST", body: { building_id, name: row.name || `Tầng ${index + 1}`, sort: index + 1 }, signal });
        let sort = 1;
        for (let code = row.startNo; code <= row.endNo; code += 1) {
          await pbRequest("rooms", "", { method: "POST", body: { building_id, floor_id: floor.id, code: String(code), sort }, signal });
          sort += 1;
        }
      }
      return { message: "Initialized successfully" };
    }
    for (let i = 0; i < F; i += 1) {
      const floor = await pbRequest("floors", "", { method: "POST", body: { building_id, name: `Tầng ${i + 1}`, sort: i + 1 }, signal });
      for (let j = 0; j < R; j += 1) {
        await pbRequest("rooms", "", { method: "POST", body: { building_id, floor_id: floor.id, code: String(S + i * R + j), sort: j + 1 }, signal });
      }
    }
    return { message: "Initialized successfully" };
  }
  if (path === "/wipe-database/") {
    if (!building_id) throw makeError(400, { error: "Chưa chọn tòa nhà." });
    const filter = anyEq("building_id", building_id);
    for (const c of ["general_notes", "water_records", "electricities", "stays", "workers", "rooms", "floors"]) {
      const rows = await pbList(c, { filter, sort: "-created" }, signal);
      for (const row of rows) await pbRequest(c, `/${row.id}`, { method: "DELETE", signal });
    }
    return { message: "Database wiped successfully" };
  }
  if (path === "/workers/") {
    const payload = { ...data, building_id, employee_code: data.employee_code ? String(data.employee_code).trim().toUpperCase() : null, dob: dateValue(data.dob), gender: data.gender || null, identity_number: data.identity_number || "", electricity_fee: Number(data.electricity_fee || 0), water_fee: Number(data.water_fee || 0), free_room_days: Math.max(0, Math.floor(Number(data.free_room_days || 0))) };
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
    const payload = { ...data, building_id, start_reading: Number(data.start_reading || 0), end_reading: Number(data.end_reading || 0), readings: data.readings || [], paid: !!data.paid, paid_at: data.paid ? new Date().toISOString() : null };
    if (data.id) return pbRequest("electricities", `/${data.id}`, { method: "PATCH", body: payload, signal });
    const existing = await pbFirst("electricities", { filter: combineFilters(eq("room_id", data.room_id), eq("month", data.month), buildingFilter()) }, signal);
    return existing
      ? pbRequest("electricities", `/${existing.id}`, { method: "PATCH", body: payload, signal })
      : pbRequest("electricities", "", { method: "POST", body: payload, signal });
  }
  if (path === "/water-records/") {
    const payload = { ...data, building_id, start_reading: Number(data.start_reading || 0), end_reading: Number(data.end_reading || 0), readings: data.readings || [], paid: !!data.paid, paid_at: data.paid ? new Date().toISOString() : null };
    if (data.id) return pbRequest("water_records", `/${data.id}`, { method: "PATCH", body: payload, signal });
    const existing = await pbFirst("water_records", { filter: combineFilters(eq("room_id", data.room_id), eq("month", data.month), buildingFilter()) }, signal);
    return existing
      ? pbRequest("water_records", `/${existing.id}`, { method: "PATCH", body: payload, signal })
      : pbRequest("water_records", "", { method: "POST", body: payload, signal });
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
    const payload = settingsToRecord({ ...DEFAULT_SETTINGS, ...data, about: { ...DEFAULT_SETTINGS.about, ...(data.about || {}) }, adminContact: { ...DEFAULT_SETTINGS.adminContact, ...(data.adminContact || {}) } });
    const current = await getSettingsRecord(signal, data.__globalBrand === true);
    const row = current
      ? await pbRequest("app_settings", `/${current.id}`, { method: "PATCH", body: payload, signal })
      : await pbRequest("app_settings", "", { method: "POST", body: payload, signal });
    if (data.__globalBrand === true) return applyGlobalBrand(settingsFromRecord(row), row);
    const globalRow = await getSettingsRecord(signal, true);
    return applyGlobalBrand(settingsFromRecord(row), globalRow);
  }
  if (/^\/workers\/[^/]+\/?$/.test(path)) {
    const payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(payload, "employee_code")) payload.employee_code = payload.employee_code ? String(payload.employee_code).trim().toUpperCase() : null;
    if (Object.prototype.hasOwnProperty.call(payload, "dob")) payload.dob = dateValue(payload.dob);
    if (Object.prototype.hasOwnProperty.call(payload, "gender")) payload.gender = payload.gender || null;
    if (Object.prototype.hasOwnProperty.call(payload, "identity_number")) payload.identity_number = payload.identity_number || "";
    if (Object.prototype.hasOwnProperty.call(payload, "electricity_fee")) payload.electricity_fee = Number(payload.electricity_fee || 0);
    if (Object.prototype.hasOwnProperty.call(payload, "water_fee")) payload.water_fee = Number(payload.water_fee || 0);
    if (Object.prototype.hasOwnProperty.call(payload, "free_room_days")) payload.free_room_days = Math.max(0, Math.floor(Number(payload.free_room_days || 0)));
    return normalizeWorker(await pbRequest("workers", `/${path.split("/")[2]}`, { method: "PATCH", body: payload, signal }));
  }
  if (/^\/floors\/[^/]+\/?$/.test(path)) return pbRequest("floors", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  if (/^\/rooms\/[^/]+\/?$/.test(path)) return pbRequest("rooms", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  if (/^\/stays\/[^/]+\/?$/.test(path)) {
    const payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(payload, "date_in")) payload.date_in = dateValue(payload.date_in);
    if (Object.prototype.hasOwnProperty.call(payload, "date_out")) payload.date_out = dateValue(payload.date_out);
    return normalizeStay(await pbRequest("stays", `/${path.split("/")[2]}`, { method: "PATCH", body: payload, signal }));
  }
  if (/^\/electricities\/[^/]+\/pay\/?$/.test(path)) return pbRequest("electricities", `/${path.split("/")[2]}`, { method: "PATCH", body: { paid: true, paid_at: new Date().toISOString() }, signal });
  if (/^\/water-records\/[^/]+\/pay\/?$/.test(path)) return pbRequest("water_records", `/${path.split("/")[2]}`, { method: "PATCH", body: { paid: true, paid_at: new Date().toISOString() }, signal });
  if (/^\/notes\/[^/]+\/?$/.test(path)) return pbRequest("general_notes", `/${path.split("/")[2]}`, { method: "PATCH", body: data, signal });
  throw makeError(404, { error: `Unsupported PATCH ${path}` });
}

async function handleDelete(url, signal) {
  const path = new URL(url, "http://local").pathname;
  if (/^\/users\/[^/]+\/?$/.test(path)) {
    await deleteUserCascade(path.split("/")[2], signal);
    return { message: "Deleted successfully" };
  }
  if (/^\/buildings\/[^/]+\/?$/.test(path)) {
    await deleteBuildingCascade(path.split("/")[2], signal);
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
  const map = { workers: "workers", stays: "stays", electricities: "electricities", "water-records": "water_records", notes: "general_notes" };
  const [, route, id] = path.split("/");
  if (map[route] && id) {
    await pbRequest(map[route], `/${id}`, { method: "DELETE", signal });
    return { message: "Deleted successfully" };
  }
  throw makeError(404, { error: `Unsupported DELETE ${path}` });
}

async function wrap(url, fn, delay = DEFAULT_DELAY) {
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  const controller = new AbortController();
  try {
    const started = Date.now();
    const data = await fn(controller.signal);
    if (debugMode) console.log(`[PocketBase] ${url} ${Date.now() - started}ms`, PB_URL);
    return data;
  } catch (e) {
    error(e);
    throw e;
  }
}

export const debounceGet = (url, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handleGet(url, signal), delay);
export const debouncePost = (url, data, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handlePost(url, data, signal), delay);
export const debouncePatch = (url, data, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handlePatch(url, data, signal), delay);
export const debounceDelete = (url, _token, delay = DEFAULT_DELAY) => wrap(url, (signal) => handleDelete(url, signal), delay);

function error(e) {
  const data = e?.response?.data;
  message.error(data?.detail || data?.details || data?.error || data?.message || e?.message || pocketBaseHint);
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
