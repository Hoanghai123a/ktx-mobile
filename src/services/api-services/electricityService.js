import api from "../../api";

const baseUrl = "/electricities/";

export const electricityService = {
  getAll: (token) => api.get(baseUrl, token),
  getByRoom: (roomId, token) => api.get(`${baseUrl}room/${roomId}/`, token),
  upsert: (data, token) => api.post(baseUrl, data, token),
  markPaid: (id, token) => api.patch(`${baseUrl}${id}/pay/`, {}, token),
  delete: (id, token) => api.delete(`${baseUrl}${id}/`, token),
};

export default electricityService;
