import api from "../../api";

const baseUrl = "/notes/";

export const noteService = {
  getAll: (token) => api.get(baseUrl, token),
  getByTarget: (targetId, targetType, token) => 
    api.get(`${baseUrl}?target_id=${targetId}&target_type=${targetType}`, token),
  create: (data, token) => api.post(baseUrl, data, token),
  update: (id, data, token) => api.patch(`${baseUrl}${id}/`, data, token),
  delete: (id, token) => api.delete(`${baseUrl}${id}/`, token),
};

export default noteService;
