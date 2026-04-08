import { message } from "antd";
import axios from "axios";

const key = String(import.meta.env.VITE_KEY || "")
  .replace(/['"]/g, "")
  .trim();
const debugMode = import.meta.env.VITE_DEBUGMODE === "development";
const backendHint = "Hãy đảm bảo Backend đang chạy (cd backend && npm start).";

// Axios instance matching SmartNote's pattern
const api = axios.create({
  baseURL: import.meta.env.VITE_HOST || "/api/",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const abortControllers = {};
const debounceTimers = {};
const DEFAULT_DELAY = 100;

// ----- Interceptors -----
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    if (debugMode) console.error("❌ Request error:", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    const start = response.config.metadata?.startTime;
    const duration = start ? new Date() - start : "N/A";
    if (debugMode) {
      console.log(`✅ [RESPONSE] ${response.config.url} took ${duration} ms`);
    }
    return response;
  },
  (error) => {
    const config = error.config || {};
    const url = config.url || "unknown";
    const start = config.metadata?.startTime;
    const duration = start ? new Date() - start : "N/A";

    if (axios.isCancel(error)) {
      if (debugMode) {
        console.warn(`⚠️ [CANCELLED] ${url} after ${duration} ms`);
      }
    } else {
      if (debugMode) {
        console.error(
          `❌ [ERROR] ${url} failed after ${duration} ms`,
          error.message,
        );
      }
    }
    return Promise.reject(error);
  },
);

function looksLikeProxyConnectionFailure(error) {
  const status = error?.response?.status;
  if (status !== 500) return false;
  const data = error?.response?.data;
  const text =
    typeof data === "string"
      ? data
      : typeof data?.error === "string"
        ? data.error
        : "";
  return /ECONNREFUSED|socket hang up|Proxy error|connect ECONNREFUSED/i.test(
    text,
  );
}

// ----- Helpers -----
function clearPrevious(url) {
  if (debounceTimers[url]) clearTimeout(debounceTimers[url]);
  if (abortControllers[url]) {
    abortControllers[url].abort();
    if (debugMode) console.warn(`🛑 Cancelled previous request to ${url}`);
  }
}

function buildHeaders(token, extraHeaders = {}) {
  const headers = {
    ApplicationKey: key,
    ...extraHeaders,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// ----- Debounce methods -----
export const debounceGet = (url, token, delay = DEFAULT_DELAY) => {
  clearPrevious(url);
  return new Promise((resolve, reject) => {
    debounceTimers[url] = setTimeout(async () => {
      const controller = new AbortController();
      abortControllers[url] = controller;
      try {
        const response = await api.get(url, {
          signal: controller.signal,
          headers: buildHeaders(token),
        });
        resolve(response.data);
      } catch (e) {
        if (debugMode) console.error("Error fetching data", e);
        error(e);
        reject(e);
      } finally {
        delete debounceTimers[url];
        delete abortControllers[url];
      }
    }, delay);
  });
};

export const debouncePost = (url, data, token, delay = DEFAULT_DELAY) => {
  clearPrevious(url);
  return new Promise((resolve, reject) => {
    debounceTimers[url] = setTimeout(async () => {
      const controller = new AbortController();
      abortControllers[url] = controller;
      try {
        const response = await api.post(url, data, {
          signal: controller.signal,
          headers: buildHeaders(token),
        });
        resolve(response.data);
      } catch (e) {
        if (debugMode) console.error("Error posting data", e);
        error(e);
        reject(e);
      } finally {
        delete debounceTimers[url];
        delete abortControllers[url];
      }
    }, delay);
  });
};

export const debouncePatch = (url, data, token, delay = DEFAULT_DELAY) => {
  clearPrevious(url);
  return new Promise((resolve, reject) => {
    debounceTimers[url] = setTimeout(async () => {
      const controller = new AbortController();
      abortControllers[url] = controller;
      try {
        const response = await api.patch(url, data, {
          signal: controller.signal,
          headers: buildHeaders(token),
        });
        resolve(response.data);
      } catch (e) {
        if (debugMode) console.error("Error patching data", e);
        error(e);
        reject(e);
      } finally {
        delete debounceTimers[url];
        delete abortControllers[url];
      }
    }, delay);
  });
};

export const debounceDelete = (url, token, delay = DEFAULT_DELAY) => {
  clearPrevious(url);
  return new Promise((resolve, reject) => {
    debounceTimers[url] = setTimeout(async () => {
      const controller = new AbortController();
      abortControllers[url] = controller;
      try {
        const response = await api.delete(url, {
          signal: controller.signal,
          headers: buildHeaders(token),
        });
        resolve(response.data);
      } catch (e) {
        if (debugMode) console.error("Error deleting data", e);
        error(e);
        reject(e);
      } finally {
        delete debounceTimers[url];
        delete abortControllers[url];
      }
    }, delay);
  });
};

// ----- Error handler -----
function error(e) {
  if (!e?.response) {
    const msg =
      e?.code === "ERR_NETWORK" ||
      /fetch failed/i.test(String(e?.message || ""))
        ? `Không kết nối được Backend. ${backendHint}`
        : e?.message || `Không kết nối được Backend. ${backendHint}`;
    message.error(msg);
    return;
  }

  if (looksLikeProxyConnectionFailure(e)) {
    message.error(`Không kết nối được Backend (proxy lỗi). ${backendHint}`);
    return;
  }

  message.error(
    e?.response?.data?.detail ||
      e?.response?.data?.details ||
      e?.response?.data?.error ||
      e?.response?.data?.errors ||
      `Có lỗi xảy ra! ${backendHint}`,
  );
}

// ----- Cookie & Token utils -----
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

function setCookie(name, value, seconds) {
  let expires = "";
  if (seconds) {
    expires = `; max-age=${seconds}`;
  }
  document.cookie = `${name}=${
    value || ""
  }${expires}; path=/; Secure; SameSite=None`;
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

// ----- Export -----
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
