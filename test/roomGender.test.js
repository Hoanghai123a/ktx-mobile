import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomGender, roomGenderLabel } from "../src/services/roomGender.js";

test("roomGender: normalize and label", () => {
  assert.equal(normalizeRoomGender(null), null);
  assert.equal(normalizeRoomGender(""), null);
  assert.equal(normalizeRoomGender("male"), "male");
  assert.equal(normalizeRoomGender("Nam"), "male");
  assert.equal(normalizeRoomGender("female"), "female");
  assert.equal(normalizeRoomGender("Nữ"), "female");
  assert.equal(roomGenderLabel(null), "Không chọn");
  assert.equal(roomGenderLabel("male"), "Nam");
  assert.equal(roomGenderLabel("female"), "Nữ");
});

