import api from "../../api";

const baseUrl = "/payments/";

export const paymentService = {
  getAll: (token, params = {}) => api.get(`${baseUrl}?${new URLSearchParams(params)}`, token),
  upsert: (data, token) => api.post(baseUrl, data, token),
  update: (id, data, token) => api.patch(`${baseUrl}${id}/`, data, token),
  delete: (id, token) => api.delete(`${baseUrl}${id}/`, token),
};

export default paymentService;
