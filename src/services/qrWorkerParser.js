import jsQR from "jsqr";

function clean(value) {
  return String(value || "").trim();
}

function normalizeDate(value) {
  const text = clean(value).replace(/[^0-9]/g, "");
  if (/^\d{8}$/.test(text)) {
    const dd = text.slice(0, 2);
    const mm = text.slice(2, 4);
    const yyyy = text.slice(4, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  const iso = clean(value).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return "";
}

function normalizeGender(value) {
  const text = clean(value).toLowerCase();
  if (["nam", "male", "m", "trai"].includes(text)) return "male";
  if (["nữ", "nu", "female", "f", "gái", "gai"].includes(text)) return "female";
  return "";
}

function parseKeyValue(text) {
  const out = {};
  const pairs = text.split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split(/[:=]/);
    if (!rawKey || !rest.length) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (/^(name|ho ten|họ tên|hoten|full_name)$/.test(key)) out.fullName = value;
    if (/^(gender|gioi tinh|giới tính)$/.test(key)) out.gender = normalizeGender(value);
    if (/^(dob|birth|ngay sinh|ngày sinh)$/.test(key)) out.dob = normalizeDate(value);
    if (/^(cccd|cmnd|id|so cccd|số cccd|identity_number)$/.test(key)) out.identityNumber = value;
    if (/^(address|que quan|quê quán|hometown|thuong tru|thường trú)$/.test(key)) out.hometown = value;
  }
  return out;
}

export function parseWorkerQr(text) {
  const raw = clean(text);
  if (!raw) return null;

  const parts = raw.split("|").map(clean);
  if (parts.length >= 6) {
    return {
      identityNumber: parts[0] || "",
      fullName: parts[2] || "",
      dob: normalizeDate(parts[3]),
      gender: normalizeGender(parts[4]),
      hometown: parts[5] || "",
      raw,
    };
  }

  const kv = parseKeyValue(raw);
  if (Object.keys(kv).length) return { ...kv, raw };

  return { raw };
}

export async function decodeQrFromImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  return result?.data || "";
}

export function decodeQrFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  return result?.data || "";
}

export function workerGenderLabel(value) {
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  return "";
}
