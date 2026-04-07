import api from "../../api";

const baseUrl = "/floors/";

export const floorService = {
  getAll: (token) => api.get(baseUrl, token),
  getById: (id, token) => api.get(`${baseUrl}${id}/`, token),
  create: (data, token) => api.post(baseUrl, data, token),
  update: (id, data, token) => api.patch(`${baseUrl}${id}/`, data, token),
  delete: (id, token) => api.delete(`${baseUrl}${id}/`, token),
};

export default floorService;
