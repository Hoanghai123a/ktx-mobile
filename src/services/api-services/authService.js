import api from "../../api";

const baseUrl = "/login/";
const backendBaseUrl = String(import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const appKey = String(import.meta.env.VITE_KEY || "").replace(/["']/g, "").trim();

function authErrorMessage(status, data) {
  const detail = data?.data || data?.details || data?.detail;
  if (detail && typeof detail === "object" && Object.keys(detail).length) {
    const [field, info] = Object.entries(detail)[0];
    const msg = info?.message || info?.error || info?.code;
    if (msg) return `${data?.message || `Backend error ${status}`}: ${field} - ${msg}`;
  }
  const base = data?.message || data?.error || `Backend error ${status}`;
  if (base === "Failed to create record.") {
    return "Không thể tạo tài khoản. Backend/PocketBase chưa cho phép tạo user đăng ký. Cần cấu hình quyền tạo user hoặc POCKETBASE_TOKEN cho backend.";
  }
  return base;
}

function makeError(status, data) {
  const err = new Error(authErrorMessage(status, data));
  err.response = { status, data };
  return err;
}

function shouldFallbackToDirect(error) {
  const status = error?.response?.status;
  return !status || status === 404 || status === 405;
}

async function postBackend(path, data) {
  const res = await fetch(`${backendBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(appKey ? { applicationkey: appKey } : {}),
    },
    body: JSON.stringify(data || {}),
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, payload);
  return payload;
}

export const authService = {
  login: async (username, password) => {
    try {
      const res = await api.post(baseUrl, { username, password });
      if (res?.access_token) {
        api.saveToken(res.access_token);
        api.setCookie("token", res.access_token, res.expires_in || 3600);
      }
      return res;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
  register: async ({ username, password, name }) => {
    try {
      let res;
      try {
        res = await postBackend("/register/", { username, password, name });
      } catch (error) {
        if (!shouldFallbackToDirect(error)) throw error;
        res = await api.post("/register/", { username, password, name });
      }
      if (res?.access_token) {
        api.saveToken(res.access_token);
        api.setCookie("token", res.access_token, res.expires_in || 604800);
      }
      return res;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  },
  changePassword: async (userId, { currentPassword, newPassword }) => {
    if (!userId) throw makeError(400, { error: "Không tìm thấy tài khoản." });
    return api.patch(`/users/${userId}/`, {
      oldPassword: currentPassword,
      password: newPassword,
      passwordConfirm: newPassword,
    });
  },
  logout: () => {
    api.removeToken();
    api.removeCookie("token");
  },
};

export default authService;
