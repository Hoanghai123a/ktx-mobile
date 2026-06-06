import api from "../../api";

const baseUrl = "/activity-logs/";

function query(params = {}) {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("date_from", params.dateFrom);
  if (params.dateTo) search.set("date_to", params.dateTo);
  if (params.limit) search.set("limit", String(params.limit));
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const activityLogService = {
  getAll: (token, params = {}) => api.get(`${baseUrl}${query(params)}`, token),
};

export default activityLogService;
