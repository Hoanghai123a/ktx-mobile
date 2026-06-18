import test from "node:test";
import assert from "node:assert/strict";

import {
  ROOM_SUGGESTION_CAPACITY_KEY,
  ROOM_SUGGESTION_CAPACITY_MAP_KEY,
  ROOM_SUGGESTION_INCLUDE_EMPTY_KEY,
  loadIncludeEmptyRooms,
  loadRoomSuggestionCapacityMap,
  loadRoomSuggestionCapacity,
  saveIncludeEmptyRooms,
  saveRoomSuggestionCapacity,
  suggestRooms,
} from "../src/services/roomSuggestion.js";

test("suggestRooms ưu tiên phòng cùng giới tính và lấp đầy phòng", () => {
  const workerById = new Map([
    ["w1", { id: "w1", gender: "male" }],
    ["w2", { id: "w2", gender: "male" }],
    ["w3", { id: "w3", gender: "male" }],
    ["w4", { id: "w4", gender: "female" }],
  ]);

  const floors = [
    {
      id: "f1",
      name: "Tầng 1",
      rooms: [
        {
          id: "r1",
          code: "101",
          gender: "male",
          stays: [
            { id: "s1", workerId: "w1", dateIn: "2026-06-10" },
            { id: "s2", workerId: "w2", dateIn: "2026-06-15" },
          ],
        },
        {
          id: "r2",
          code: "102",
          gender: "male",
          stays: [{ id: "s3", workerId: "w3", dateIn: "2026-06-17" }],
        },
        {
          id: "r3",
          code: "103",
          gender: "female",
          stays: [{ id: "s4", workerId: "w4", dateIn: "2026-06-18" }],
        },
      ],
    },
  ];

  const result = suggestRooms({
    floors,
    workerById,
    incomingCount: 2,
    incomingGender: "Nam",
    roomCapacity: 4,
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].roomCode, "101");
  assert.equal(result[0].projectedOccupancy, 4);
  assert.equal(result[1].roomCode, "102");
});

test("suggestRooms dùng người vào ở gần nhất để phá hòa", () => {
  const workerById = new Map([
    ["w1", { id: "w1", gender: "female" }],
    ["w2", { id: "w2", gender: "female" }],
  ]);

  const floors = [
    {
      id: "f1",
      name: "Tầng 1",
      rooms: [
        {
          id: "r1",
          code: "201",
          gender: "female",
          stays: [{ id: "s1", workerId: "w1", dateIn: "2026-06-11" }],
        },
        {
          id: "r2",
          code: "202",
          gender: "female",
          stays: [{ id: "s2", workerId: "w2", dateIn: "2026-06-17" }],
        },
      ],
    },
  ];

  const result = suggestRooms({
    floors,
    workerById,
    incomingCount: 1,
    incomingGender: "Nữ",
    roomCapacity: 3,
  });

  assert.equal(result[0].roomCode, "202");
  assert.equal(result[1].roomCode, "201");
});

test("room suggestion capacity được lưu trên localStorage", () => {
  const store = new Map();
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  });

  try {
    assert.equal(loadRoomSuggestionCapacity(6), 6);
    saveRoomSuggestionCapacity(9);
    assert.equal(store.get(ROOM_SUGGESTION_CAPACITY_KEY), "9");
    assert.equal(loadRoomSuggestionCapacity(6), 9);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("suggestRooms dung suc chua rieng cua tung phong", () => {
  const workerById = new Map([
    ["w1", { id: "w1", gender: "male" }],
    ["w2", { id: "w2", gender: "male" }],
  ]);

  const floors = [
    {
      id: "f1",
      name: "Tang 1",
      rooms: [
        {
          id: "r1",
          code: "101",
          gender: "male",
          stays: [
            { id: "s1", workerId: "w1", dateIn: "2026-06-10" },
            { id: "s2", workerId: "w2", dateIn: "2026-06-11" },
          ],
        },
        {
          id: "r2",
          code: "102",
          gender: "male",
          stays: [],
        },
      ],
    },
  ];

  const result = suggestRooms({
    floors,
    workerById,
    incomingCount: 1,
    incomingGender: "Nam",
    roomCapacity: 4,
    roomCapacityById: {
      r1: 2,
      r2: 1,
    },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].roomCode, "102");
  assert.equal(result[0].capacity, 1);
});

test("room suggestion capacity map co the doc fallback tu localStorage cu", () => {
  const store = new Map();
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  });

  try {
    assert.deepEqual(loadRoomSuggestionCapacityMap(), {});
    store.set(ROOM_SUGGESTION_CAPACITY_MAP_KEY, '{"r1":4,"r2":6,"r3":1}');
    assert.equal(store.get(ROOM_SUGGESTION_CAPACITY_MAP_KEY), '{"r1":4,"r2":6,"r3":1}');
    assert.deepEqual(loadRoomSuggestionCapacityMap(), { r1: 4, r2: 6, r3: 1 });
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("suggestRooms bo qua phong trong khi tat includeEmptyRooms", () => {
  const workerById = new Map([
    ["w1", { id: "w1", gender: "male" }],
  ]);

  const floors = [
    {
      id: "f1",
      name: "Tang 1",
      rooms: [
        { id: "r1", code: "101", gender: "male", stays: [{ id: "s1", workerId: "w1", dateIn: "2026-06-10" }] },
        { id: "r2", code: "102", gender: "male", stays: [] },
      ],
    },
  ];

  const filtered = suggestRooms({
    floors,
    workerById,
    incomingCount: 1,
    incomingGender: "Nam",
    roomCapacity: 2,
    includeEmptyRooms: false,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].roomCode, "101");

  const all = suggestRooms({
    floors,
    workerById,
    incomingCount: 1,
    incomingGender: "Nam",
    roomCapacity: 2,
    includeEmptyRooms: true,
  });
  assert.equal(all.length, 2);
});

test("includeEmptyRooms duoc luu tren localStorage", () => {
  const store = new Map();
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  });

  try {
    assert.equal(loadIncludeEmptyRooms(true), true);
    saveIncludeEmptyRooms(false);
    assert.equal(store.get(ROOM_SUGGESTION_INCLUDE_EMPTY_KEY), "0");
    assert.equal(loadIncludeEmptyRooms(true), false);
    saveIncludeEmptyRooms(true);
    assert.equal(store.get(ROOM_SUGGESTION_INCLUDE_EMPTY_KEY), "1");
    assert.equal(loadIncludeEmptyRooms(false), true);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
