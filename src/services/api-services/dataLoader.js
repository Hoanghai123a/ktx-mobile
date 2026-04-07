import api from "../../api";

const baseUrl = "/load-all/";

export const dataLoader = {
  /**
   * Tương đương với loadAllFromDb trong ktxDbService.js
   * Gọi đến endpoint backend để lấy toàn bộ dữ liệu KTX
   */
  loadAll: async (token) => {
    try {
      const response = await api.get(baseUrl, token);
      // Giả sử backend trả về đúng cấu trúc { floors, workers }
      return response;
    } catch (error) {
      console.error("Load all data error:", error);
      throw error;
    }
  },

  /**
   * Khởi tạo KTX từ backend
   */
  initKtx: (payload, token) => api.post("/init-ktx/", payload, token),

  /**
   * Reset database qua API
   */
  wipeDatabase: (token) => api.post("/wipe-database/", {}, token),
};

export default dataLoader;
