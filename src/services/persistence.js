import { DEFAULT_SETTINGS } from "../constants/defaultSettings.js";

const DATA_SOURCE_KEY = String(
  import.meta.env.VITE_POCKETBASE_URL || import.meta.env.VITE_HOST || "local",
).replace(/[^a-z0-9]+/gi, "_");
const STORAGE_KEY = `ktx_state_v2_${DATA_SOURCE_KEY}`;

function getStorage() {
  return globalThis?.localStorage;
}

export function loadPersistedState() {
  const storage = getStorage();
  if (!storage) {
    return {
      floors: [],
      workers: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        floors: [],
        workers: [],
        settings: DEFAULT_SETTINGS,
      };
    }

    const parsed = JSON.parse(raw);
    const floors = Array.isArray(parsed?.floors) ? parsed.floors : [];
    const workers = Array.isArray(parsed?.workers) ? parsed.workers : [];
    const settings =
      parsed?.settings && typeof parsed.settings === "object"
        ? { ...DEFAULT_SETTINGS, ...parsed.settings }
        : DEFAULT_SETTINGS;

    return { floors, workers, settings };
  } catch {
    return {
      floors: [],
      workers: [],
      settings: DEFAULT_SETTINGS,
    };
  }
}

export function savePersistedState(state) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        floors: Array.isArray(state?.floors) ? state.floors : [],
        workers: Array.isArray(state?.workers) ? state.workers : [],
        settings:
          state?.settings && typeof state.settings === "object"
            ? state.settings
            : DEFAULT_SETTINGS,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
}
