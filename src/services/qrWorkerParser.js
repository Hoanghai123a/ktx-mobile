import jsQR from "jsqr";

const QR_OPTIONS = { inversionAttempts: "attemptBoth" };
const CENTER_SCAN_RATIOS = [0.3, 0.38, 0.46, 0.56, 0.68, 0.82, 0.96];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function centerArea(width, height, ratio) {
  const side = Math.round(Math.min(width, height) * ratio);
  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    sw: side,
    sh: side,
  };
}

function normalizeArea(area, width, height) {
  const sx = clamp(Math.round(area.sx || 0), 0, width - 1);
  const sy = clamp(Math.round(area.sy || 0), 0, height - 1);
  const sw = clamp(Math.round(area.sw || width), 1, width - sx);
  const sh = clamp(Math.round(area.sh || height), 1, height - sy);
  return { sx, sy, sw, sh };
}

function areaKey(area) {
  return `${area.sx}:${area.sy}:${area.sw}:${area.sh}`;
}

function buildScanAreas(width, height, preferCenter) {
  const full = { sx: 0, sy: 0, sw: width, sh: height };
  const center = CENTER_SCAN_RATIOS.map((ratio) => centerArea(width, height, ratio));
  const ordered = preferCenter ? [...center, full] : [full, ...center];
  const seen = new Set();

  return ordered
    .map((area) => normalizeArea(area, width, height))
    .filter((area) => {
      const key = areaKey(area);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function boostedQrData(imageData) {
  const out = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < out.length; i += 4) {
    const gray = out[i] * 0.299 + out[i + 1] * 0.587 + out[i + 2] * 0.114;
    const boosted = gray < 128
      ? Math.max(0, 128 - (128 - gray) * 1.45)
      : Math.min(255, 128 + (gray - 128) * 1.55);
    out[i] = boosted;
    out[i + 1] = boosted;
    out[i + 2] = boosted;
    out[i + 3] = 255;
  }
  return out;
}

function decodeImageData(imageData) {
  const normal = jsQR(imageData.data, imageData.width, imageData.height, QR_OPTIONS);
  if (normal?.data) return normal.data;

  const boosted = jsQR(
    boostedQrData(imageData),
    imageData.width,
    imageData.height,
    QR_OPTIONS,
  );
  return boosted?.data || "";
}

export async function decodeQrFromImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxSize = 2200;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return decodeQrFromCanvas(canvas, { preferCenter: false });
}

export function decodeQrFromCanvas(canvas, options = {}) {
  const width = canvas.width || 0;
  const height = canvas.height || 0;
  if (!width || !height) return "";

  const scanAreas = buildScanAreas(width, height, options.preferCenter !== false);
  const scratch = document.createElement("canvas");
  const scratchCtx = scratch.getContext("2d", { willReadFrequently: true });
  const cropMaxSize = options.cropMaxSize || 1180;
  const fullFrameMaxSize = options.fullFrameMaxSize || 1450;
  const maxUpscale = options.maxUpscale || 2.6;

  for (const area of scanAreas) {
    const isFullFrame = area.sx === 0 && area.sy === 0 && area.sw === width && area.sh === height;
    const targetMaxSize = isFullFrame ? fullFrameMaxSize : cropMaxSize;
    const baseScale = targetMaxSize / Math.max(area.sw, area.sh);
    const scale = isFullFrame ? Math.min(1, baseScale) : clamp(baseScale, 1, maxUpscale);
    const targetWidth = Math.max(1, Math.round(area.sw * scale));
    const targetHeight = Math.max(1, Math.round(area.sh * scale));

    scratch.width = targetWidth;
    scratch.height = targetHeight;
    scratchCtx.imageSmoothingEnabled = true;
    scratchCtx.drawImage(
      canvas,
      area.sx,
      area.sy,
      area.sw,
      area.sh,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    const text = decodeImageData(scratchCtx.getImageData(0, 0, targetWidth, targetHeight));
    if (text) return text;

    if (!isFullFrame && scale > 1.05) {
      scratchCtx.clearRect(0, 0, targetWidth, targetHeight);
      scratchCtx.imageSmoothingEnabled = false;
      scratchCtx.drawImage(
        canvas,
        area.sx,
        area.sy,
        area.sw,
        area.sh,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      const sharpText = decodeImageData(scratchCtx.getImageData(0, 0, targetWidth, targetHeight));
      if (sharpText) return sharpText;
    }
  }

  return "";
}

export function workerGenderLabel(value) {
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  return "";
}
