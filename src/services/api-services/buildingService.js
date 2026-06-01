import api from "../../api";

export const buildingService = {
  getAll: (token) => api.get("/buildings/", token),
  getAuthSettings: (token) => api.get("/auth-settings/", token),
  updateAuthSettings: (data, token) => api.post("/auth-settings/", data, token),
  getPinnedBuildings: (token) => api.get("/pinned-buildings/", token),
  savePinnedBuildings: (data, token) => api.post("/pinned-buildings/", data, token),
  create: (data, token) => api.post("/buildings/", data, token),
  update: (id, data, token) => api.patch(`/buildings/${id}/`, data, token),
  delete: (id, token) => api.delete(`/buildings/${id}/`, token),
  getUsers: (token) => api.get("/users/", token),
  createUser: (data, token) => api.post("/users/", data, token),
  updateUser: (id, data, token) => api.patch(`/users/${id}/`, data, token),
  deleteUser: (id, token) => api.delete(`/users/${id}/`, token),
  getMembers: (buildingId, token) => api.get(`/building-members/?building_id=${buildingId}`, token),
  addMember: (data, token) => api.post("/building-members/", data, token),
  updateMember: (id, data, token) => api.patch(`/building-members/${id}/`, data, token),
  deleteMember: (id, token) => api.delete(`/building-members/${id}/`, token),
};

export default buildingService;
