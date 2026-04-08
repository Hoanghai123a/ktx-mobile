export function normalizeRoomGender(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  if (s === "male" || s === "nam") return "male";
  if (s === "female" || s === "nu" || s === "nữ") return "female";
  return null;
}

export function roomGenderLabel(gender) {
  const g = normalizeRoomGender(gender);
  if (g === "male") return "Nam";
  if (g === "female") return "Nữ";
  return "Không chọn";
}

