import api from "../../api";

const baseUrl = "/settings/";

export const settingsService = {
  get: (token) => api.get(baseUrl, token),
  update: (data, token) => api.patch(baseUrl, data, token),
};

export default settingsService;
