import api from "../../api";

const baseUrl = "/login/";

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function authErrorMessage(status, data) {
  const detail = data?.data || data?.details || data?.detail;
  if (detail && typeof detail === "object" && Object.keys(detail).length) {
    const [field, info] = Object.entries(detail)[0];
    const msg = info?.message || info?.error || info?.code;
    if (msg) return `${data?.message || `PocketBase error ${status}`}: ${field} - ${msg}`;
  }
  const base = data?.message || data?.error || `PocketBase error ${status}`;
  if (base === "Failed to create record.") {
    return "Khong the tao tai khoan. Hay mo Create rule cho collection users trong PocketBase.";
  }
  return base;
}

function makeError(status, data) {
  const err = new Error(authErrorMessage(status, data));
  err.response = { status, data };
  return err;
}

export const authService = {
  login: async (username, password) => {
    try {
      const res = await api.post(baseUrl, { username: normalizeUsername(username), password });
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
      const res = await api.post("/register/", { username: normalizeUsername(username), password, name });
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
    if (!userId) throw makeError(400, { error: "Khong tim thay tai khoan." });
    return api.patch(`/users/${userId}/`, {
      oldPassword: currentPassword,
      password: newPassword,
      passwordConfirm: newPassword,
    });
  },
  updateProfile: async (userId, patch) => {
    if (!userId) throw makeError(400, { error: "Khong tim thay tai khoan." });
    return api.patch(`/users/${userId}/`, patch || {});
  },
  logout: () => {
    api.removeToken();
    api.removeCookie("token");
  },
};

export default authService;
