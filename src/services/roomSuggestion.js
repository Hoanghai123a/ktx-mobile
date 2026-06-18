import { normalizeRoomGender } from "./roomGender.js";

export const ROOM_SUGGESTION_CAPACITY_KEY = "ktx.roomSuggestion.maxOccupancy";
export const ROOM_SUGGESTION_CAPACITY_MAP_KEY = "ktx.roomSuggestion.capacityByRoom";
export const ROOM_SUGGESTION_INCLUDE_EMPTY_KEY = "ktx.roomSuggestion.includeEmptyRooms";

export function loadIncludeEmptyRooms(defaultValue = true) {
  if (!globalThis?.localStorage) return defaultValue;
  try {
    const raw = globalThis.localStorage.getItem(ROOM_SUGGESTION_INCLUDE_EMPTY_KEY);
    if (raw == null) return defaultValue;
    return raw === "1" || raw === "true";
  } catch {
    return defaultValue;
  }
}

export function saveIncludeEmptyRooms(value) {
  if (!globalThis?.localStorage) return;
  try {
    globalThis.localStorage.setItem(
      ROOM_SUGGESTION_INCLUDE_EMPTY_KEY,
      value ? "1" : "0",
    );
  } catch {
    // ignore storage errors (private mode, quota, ...)
  }
}

function normalizeWorkerGender(value) {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (["male", "nam", "m", "trai"].includes(text)) return "male";
  if (["female", "nu", "nữ", "f", "gai", "gái"].includes(text)) return "female";
  return null;
}

function toTimestamp(value) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

export function loadRoomSuggestionCapacity(defaultValue = 8) {
  if (!globalThis?.localStorage) return defaultValue;

  try {
    const value = Number(globalThis.localStorage.getItem(ROOM_SUGGESTION_CAPACITY_KEY));
    if (!Number.isFinite(value) || value <= 0) return defaultValue;
    return Math.floor(value);
  } catch {
    return defaultValue;
  }
}

export function saveRoomSuggestionCapacity(value) {
  if (!globalThis?.localStorage) return;

  const normalized = Math.max(1, Math.floor(Number(value) || 0));
  try {
    globalThis.localStorage.setItem(ROOM_SUGGESTION_CAPACITY_KEY, String(normalized));
  } catch {
    // Bỏ qua lỗi localStorage để app vẫn dùng được trong chế độ riêng tư.
  }
}

export function loadRoomSuggestionCapacityMap() {
  if (!globalThis?.localStorage) return {};

  try {
    const raw = globalThis.localStorage.getItem(ROOM_SUGGESTION_CAPACITY_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([roomId, value]) => [roomId, Math.max(1, Math.floor(Number(value) || 0))])
        .filter(([, value]) => Number.isFinite(value) && value > 0),
    );
  } catch {
    return {};
  }
}

export function roomCapacityFor(roomId, capacityByRoom, fallbackCapacity = 8) {
  const specific = Number(capacityByRoom?.[roomId]);
  if (Number.isFinite(specific) && specific > 0) return Math.floor(specific);

  const fallback = Number(fallbackCapacity);
  if (Number.isFinite(fallback) && fallback > 0) return Math.floor(fallback);
  return 1;
}

export function suggestRooms({
  floors = [],
  workerById,
  incomingCount,
  incomingGender,
  roomCapacity,
  roomCapacityById,
  includeEmptyRooms = true,
  limit = 3,
} = {}) {
  const countNeeded = Math.max(1, Math.floor(Number(incomingCount) || 0));
  const fallbackCapacity = Math.max(1, Math.floor(Number(roomCapacity) || 0));
  const targetGender = normalizeWorkerGender(incomingGender);

  if (!targetGender) return [];

  const rows = [];

  for (const floor of floors || []) {
    for (const room of floor?.rooms || []) {
      const currentStays = (room?.stays || []).filter((stay) => !stay?.dateOut);
      const occupiedCount = currentStays.length;
      if (!includeEmptyRooms && occupiedCount === 0) continue;
      const capacity = roomCapacityFor(room?.id, roomCapacityById, fallbackCapacity);
      const availableSlots = capacity - occupiedCount;

      if (availableSlots < countNeeded) continue;

      const roomGender = normalizeRoomGender(room?.gender);
      if (roomGender && roomGender !== targetGender) continue;

      const occupantGenders = currentStays
        .map((stay) => workerById?.get?.(stay.workerId)?.gender)
        .map(normalizeWorkerGender)
        .filter(Boolean);

      if (occupantGenders.some((gender) => gender !== targetGender)) continue;

      const newestMoveInAt = currentStays.reduce((latest, stay) => {
        const enteredAt = toTimestamp(stay?.dateIn ?? stay?.date_in);
        return enteredAt > latest ? enteredAt : latest;
      }, 0);

      const projectedOccupancy = occupiedCount + countNeeded;

      rows.push({
        floorId: floor?.id || "",
        floorName: floor?.name || "",
        roomId: room?.id || "",
        roomCode: room?.code || "",
        roomGender,
        roomGenderRaw: room?.gender ?? null,
        occupiedCount,
        availableSlots,
        projectedOccupancy,
        capacity,
        newestMoveInAt,
        isEmpty: occupiedCount === 0,
        score: {
          exactlyFilled: projectedOccupancy === capacity ? 1 : 0,
          fillScore: projectedOccupancy / capacity,
          newestMoveInAt,
          occupiedPriority: occupiedCount > 0 ? 1 : 0,
        },
      });
    }
  }

  return rows
    .sort((a, b) => {
      if (b.score.exactlyFilled !== a.score.exactlyFilled) {
        return b.score.exactlyFilled - a.score.exactlyFilled;
      }
      if (b.score.fillScore !== a.score.fillScore) {
        return b.score.fillScore - a.score.fillScore;
      }
      if (b.score.newestMoveInAt !== a.score.newestMoveInAt) {
        return b.score.newestMoveInAt - a.score.newestMoveInAt;
      }
      if (b.score.occupiedPriority !== a.score.occupiedPriority) {
        return b.score.occupiedPriority - a.score.occupiedPriority;
      }
      return String(a.roomCode).localeCompare(String(b.roomCode), "vi");
    })
    .slice(0, Math.max(1, limit))
    .map(({ score: _score, ...room }) => room);
}
