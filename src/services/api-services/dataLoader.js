import api from "../../api";

const baseUrl = "/load-all/";

export const dataLoader = {
  loadAll: async (token) => {
    try {
      return await api.get(baseUrl, token);
    } catch (error) {
      console.error("Load all data error:", error);
      throw error;
    }
  },

  initKtx: (payload, token) => api.post("/init-ktx/", payload, token),

  wipeDatabase: (token) => api.post("/wipe-database/", {}, token),
};

export default dataLoader;
