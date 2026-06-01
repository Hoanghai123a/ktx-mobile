require("dotenv").config();

const PB_URL = (
  process.env.POCKETBASE_URL || "https://ripple-skyrocket-progeny.ngrok-free.dev"
).replace(/\/$/, "");

function pocketBaseToken() {
  return (process.env.POCKETBASE_TOKEN || "").trim();
}

function tokenStatus() {
  const token = pocketBaseToken();
  if (!token) return { configured: false, expired: false, exp: null };
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    const exp = Number(payload.exp || 0);
    return {
      configured: true,
      expired: !!exp && exp * 1000 <= Date.now(),
      exp: exp ? new Date(exp * 1000).toISOString() : null,
    };
  } catch {
    return { configured: true, expired: false, exp: null };
  }
}

function authHeaders() {
  const token = pocketBaseToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiUrl(collection, suffix = "") {
  return `${PB_URL}/api/collections/${collection}/records${suffix}`;
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

async function request(collection, suffix = "", options = {}) {
  const res = await fetch(apiUrl(collection, suffix), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.message || `PocketBase request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function escapeFilter(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
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

async function list(collection, params = {}) {
  const page = await request(collection, qs({ page: 1, perPage: 500, ...params }));
  return page?.items || [];
}

async function first(collection, params = {}) {
  const items = await list(collection, { perPage: 1, ...params });
  return items[0] || null;
}

module.exports = {
  PB_URL,
  tokenStatus,
  request,
  list,
  first,
  eq,
  dateOnly,
  dateValue,
};
