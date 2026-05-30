require("dotenv").config();

const PB_URL = (
  process.env.POCKETBASE_URL || "https://ripple-skyrocket-progeny.ngrok-free.dev"
).replace(/\/$/, "");

function authHeaders() {
  const token = (process.env.POCKETBASE_TOKEN || "").trim();
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
  request,
  list,
  first,
  eq,
  dateOnly,
  dateValue,
};
