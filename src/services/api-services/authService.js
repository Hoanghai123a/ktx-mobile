import api from "../../api";

const baseUrl = "/login/";

export const authService = {
  login: async (username, password) => {
    try {
      const res = await api.post(baseUrl, { username, password });
      if (res?.access_token) {
        api.saveToken(res.access_token);
        // SmartNote sets cookie as well
        api.setCookie("token", res.access_token, res.expires_in || 3600);
      }
      return res;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
  logout: () => {
    api.removeToken();
    api.removeCookie("token");
  },
};

export default authService;
