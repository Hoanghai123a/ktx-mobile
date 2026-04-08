import test from "node:test";
import assert from "node:assert/strict";
import { loadPersistedState, savePersistedState } from "../src/services/persistence.js";

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

test("persistence: save/load roundtrip", () => {
  globalThis.localStorage = makeStorage();

  savePersistedState({
    floors: [{ id: "f1", name: "Tầng 1", rooms: [] }],
    workers: [{ id: "w1", fullName: "A" }],
    settings: { siteName: "X" },
  });

  const loaded = loadPersistedState();
  assert.equal(loaded.floors.length, 1);
  assert.equal(loaded.workers.length, 1);
  assert.equal(loaded.settings.siteName, "X");
});

test("persistence: corrupted JSON -> falls back safely", () => {
  globalThis.localStorage = makeStorage();
  globalThis.localStorage.setItem("ktx_state_v1", "{not-json");
  const loaded = loadPersistedState();
  assert.ok(Array.isArray(loaded.floors));
  assert.ok(Array.isArray(loaded.workers));
  assert.ok(loaded.settings);
});

