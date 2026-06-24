export function pinnedBuildingKey(user) {
  return `ktx_pinned_buildings_${user?.id || user?.username || "guest"}`;
}

export function lastBuildingKey(user) {
  return `ktx_last_building_${user?.id || user?.username || "guest"}`;
}

export function normalizePinnedIds(rows) {
  return Array.isArray(rows)
    ? [...new Set(rows.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
}

export function readPinnedBuildingIds(user) {
  try {
    const rows = JSON.parse(
      localStorage.getItem(pinnedBuildingKey(user)) || "[]",
    );
    return normalizePinnedIds(rows);
  } catch {
    return [];
  }
}
