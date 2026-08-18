// src/services/excelExportService.js
import * as XLSX from "xlsx-js-style";
import { formatDate } from "./dateFormat.js";
import { getBillingPeriod } from "./utilityBilling.js";

function workerGenderLabel(value) {
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  return "";
}

function paymentStatus({ paid, totalAmount }) {
  if (Number(totalAmount || 0) <= 0) return "Không phát sinh";
  return paid ? "Đã thu" : "Chưa thu";
}


function dateOnly(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function stayOverlapsPaymentPeriod(stay, period) {
  const dateIn = dateOnly(stay?.dateIn ?? stay?.date_in);
  const dateOut = dateOnly(stay?.dateOut ?? stay?.date_out);
  if (!dateIn || !period?.start || !period?.end) return false;
  return dateIn < period.end && (!dateOut || dateOut > period.start);
}

export function buildPaymentExportRows({
  floors = [],
  workerById = new Map(),
  billingMonth,
  billingCloseDay = 1,
  utilityBilling,
  workerPaymentRows = [],
}) {
  const period = getBillingPeriod(billingMonth, billingCloseDay);
  const paymentRowByStayId = new Map(
    workerPaymentRows.map((row) => [row.stayId, row]),
  );
  const rows = [];

  for (const floor of floors) {
    for (const room of floor.rooms || []) {
      const roomCharges = utilityBilling?.byRoom?.get?.(room.id)?.byWorker || new Map();
      for (const stay of room.stays || []) {
        if (!stayOverlapsPaymentPeriod(stay, period)) continue;

        const worker = workerById.get(stay.workerId);
        const paymentRow = paymentRowByStayId.get(stay.id);
        const charge = roomCharges.get(stay.workerId) || {};
        const rent = utilityBilling?.byStay?.get?.(stay.id) || {};
        const electricityFee = Number(paymentRow?.electricityAmount ?? charge.electricityAmount ?? 0);
        const waterFee = Number(paymentRow?.waterAmount ?? charge.waterAmount ?? 0);
        const roomFee = Number(paymentRow?.roomAmount ?? rent.amount ?? charge.roomAmount ?? 0);
        const totalAmount = Number(paymentRow?.totalAmount ?? (roomFee + electricityFee + waterFee));

        rows.push({
          "Tháng": billingMonth || "",
          "Tầng": floor.name,
          "Phòng": room.code,
          "Mã nhân viên": worker?.employeeCode || paymentRow?.employeeCode || "",
          "Họ tên": worker?.fullName || paymentRow?.workerName || "(không rõ)",
          "Ngày vào": formatDate(stay.initialDateIn || stay.initial_date_in || stay.dateIn, ""),
          "Ngày vào phòng": formatDate(stay.dateIn || stay.date_in, ""),
          "Ngày chuyển phòng": formatDate(stay.transferDate || stay.transfer_date, ""),
          "Ngày rời": formatDate(stay.dateOut || stay.date_out, ""),
          "Số ngày ở miễn phí": Number(worker?.freeRoomDays || 0),
          "Tiền phòng": roomFee,
          "Tiền điện": electricityFee,
          "Tiền nước": waterFee,
          "Tiền tạm trú": 0,
          "Tiền khác": 0,
          "Tổng tiền": totalAmount,
          "Trạng thái": paymentStatus({
            paid: !!paymentRow?.paid,
            totalAmount,
          }),
          "Thời điểm thu": paymentRow?.paidAt || "",
          "Ghi chú": "",
        });
      }
    }
  }

  return rows;
}

export function exportExcel({ floors, workers, workerById, stats, todayISO }) {
  const roomsSheet = [];
  for (const f of floors) {
    for (const r of f.rooms) {
      const current = r.stays.filter((s) => !s.dateOut);
      roomsSheet.push({
        "Tầng": f.name,
        "Phòng": r.code,
        "Số NLĐ đang ở": current.length,
        "Danh sách NLĐ": current
          .map((s) => {
            const w = workerById.get(s.workerId);
            if (!w) return null;
            return w.employeeCode ? `${w.employeeCode} - ${w.fullName}` : w.fullName;
          })
          .filter(Boolean)
          .join(", "),
      });
    }
  }

  const workersSheet = workers.map((w) => ({
    "Mã nhân viên": w.employeeCode || "",
    "Họ tên": w.fullName,
    "Giới tính": workerGenderLabel(w.gender) || "",
    "Số CCCD": w.identityNumber || "",
    "Tiền điện": Number(w.electricityFee || 0),
    "Tiền nước": Number(w.waterFee || 0),
    "Số ngày ở Free": Number(w.freeRoomDays || 0),
    "Ngày sinh": formatDate(w.dob, ""),
    "Quê quán": w.hometown,
    "Số điện thoại": w.phone || "",
    "Người tuyển": w.recruiter,
    "Ghi chú": w.note || "",
  }));

  const staysSheet = [];
  for (const f of floors) {
    for (const r of f.rooms) {
      for (const st of r.stays) {
        const w = workerById.get(st.workerId);
        staysSheet.push({
          "Tầng": f.name,
          "Phòng": r.code,
          "Mã nhân viên": w?.employeeCode || "",
          "Họ tên": w?.fullName || "(không rõ)",
          "Giới tính": workerGenderLabel(w?.gender) || "",
          "Số CCCD": w?.identityNumber || "",
          "Tiền điện": Number(w?.electricityFee || 0),
          "Tiền nước": Number(w?.waterFee || 0),
          "Số ngày ở miễn phí": Number(w?.freeRoomDays || 0),
          "Ngày sinh": formatDate(w?.dob, ""),
          "Quê quán": w?.hometown || "",
          "Số điện thoại": w?.phone || "",
          "Người tuyển": w?.recruiter || "",
          "Ghi chú": w?.note || "",
          "Ngày vào": formatDate(st.initialDateIn || st.initial_date_in || st.dateIn, ""),
          "Ngày vào phòng": formatDate(st.dateIn || st.date_in, ""),
          "Ngày chuyển phòng": formatDate(st.transferDate || st.transfer_date, ""),
          "Ngày rời": formatDate(st.dateOut || st.date_out, ""),
          "Đang ở": st.dateOut ? "Không" : "Có",
        });
      }
    }
  }

  const statsSheet = stats.map((x) => ({
    "Số người/phòng": x.occupancy,
    "Số phòng": x.rooms,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(roomsSheet),
    "Phong",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(statsSheet),
    "Thong_ke",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(workersSheet),
    "NLD",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(staysSheet),
    "Lich_su_o",
  );

  const fileName = `KTX_${todayISO()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportPaymentExcel({
  floors,
  workerById,
  billingMonth,
  billingCloseDay,
  utilityBilling,
  workerPaymentRows = [],
  todayISO,
}) {
  const rows = buildPaymentExportRows({
    floors,
    workerById,
    billingMonth,
    billingCloseDay,
    utilityBilling,
    workerPaymentRows,
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows),
    "Thanh_toan",
  );

  const suffix = billingMonth || todayISO();
  XLSX.writeFile(wb, `Thanh_toan_KTX_${suffix}.xlsx`);
}

function sanitizeFileName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "Phieu";
}

function periodLabel(billingMonth, billingCloseDay) {
  const month = String(billingMonth || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return "";
  const closeDay = Math.min(31, Math.max(1, Number(billingCloseDay || 1)));
  const [y, m] = month.split("-").map(Number);
  const startDate = new Date(y, m - 2, closeDay);
  const endDate = new Date(y, m - 1, closeDay);
  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

function workerInvoiceRows({
  building,
  billingMonth,
  billingCloseDay,
  floorName,
  roomCode,
  worker,
  stay = {},
  charge,
  paid,
  paidAt,
  adminContact,
}) {
  const electricityAmount = Number(charge?.electricityAmount || 0);
  const waterAmount = Number(charge?.waterAmount || 0);
  const roomAmount = Number(charge?.roomAmount || 0);
  const total = electricityAmount + waterAmount + roomAmount;
  const period = periodLabel(billingMonth, billingCloseDay);
  const rows = [
    [building?.name ? `KTX ${building.name}` : "Phiếu thanh toán KTX"],
    ["PHIẾU THANH TOÁN"],
    [],
    ["Kỳ thu", billingMonth || "—"],
    ["Khoảng kỳ", period || "—"],
    ["Tòa nhà", building?.name || "—"],
    ["Tầng - Phòng", `${floorName || ""}${floorName ? " - " : ""}Phòng ${roomCode || "—"}`],
    [],
    ["Mã NLĐ", worker?.employeeCode || "—"],
    ["Họ tên", worker?.fullName || "—"],
    ["SĐT", worker?.phone || "—"],
    ["CCCD", worker?.identityNumber || "—"],
    ["Quê quán", worker?.hometown || "—"],
    ["Ngày sinh", formatDate(worker?.dob, "—")],
    ["Người tuyển", worker?.recruiter || "—"],
    ["Ngày vào KTX", formatDate(stay?.initialDateIn || stay?.initial_date_in || stay?.dateIn, "—")],
    ["Ngày vào phòng", formatDate(stay?.dateIn || stay?.date_in, "—")],
    ["Ngày chuyển phòng", formatDate(stay?.transferDate || stay?.transfer_date, "")],
    ["Ngày rời", formatDate(stay?.dateOut || stay?.date_out, "")],
    ["Số ngày ở miễn phí", Number(stay?.freeRoomDays ?? worker?.freeRoomDays ?? 0)],
    [],
    ["Khoản thu", "Số tiền (VNĐ)"],
    ["Tiền phòng", roomAmount],
    ["Tiền điện", electricityAmount],
    ["Tiền nước", waterAmount],
    ["TỔNG CỘNG", total],
    [],
    ["Trạng thái", paid ? "Đã thu" : "Chưa thu"],
    ["Thời điểm thu", paid ? paidAt || "—" : "—"],
  ];
  if (adminContact?.name || adminContact?.phone || adminContact?.zalo) {
    rows.push([]);
    rows.push(["Liên hệ admin"]);
    if (adminContact.name) rows.push(["Người phụ trách", adminContact.name]);
    if (adminContact.phone) rows.push(["Điện thoại", adminContact.phone]);
    if (adminContact.zalo) rows.push(["Zalo", adminContact.zalo]);
    if (adminContact.email) rows.push(["Email", adminContact.email]);
    if (adminContact.note) rows.push(["Ghi chú", adminContact.note]);
  }
  return rows;
}

function applyInvoiceSheet(rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 22 }, { wch: 32 }];
  const merges = [];
  if (rows[0]) merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  if (rows[1]) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });
  sheet["!merges"] = merges;
  return sheet;
}

export function exportWorkerInvoice({
  building,
  billingMonth,
  billingCloseDay,
  floorName,
  roomCode,
  worker,
  charge,
  paid = false,
  paidAt = "",
  adminContact = {},
  stay = {},
}) {
  const rows = workerInvoiceRows({
    building,
    billingMonth,
    billingCloseDay,
    floorName,
    roomCode,
    worker,
    charge,
    paid,
    paidAt,
    adminContact,
    stay,
  });
  const sheet = applyInvoiceSheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Phieu_thu");
  const monthSuffix = String(billingMonth || "").slice(0, 7).replace(/-/g, "_") || "phieu";
  const nameSuffix = sanitizeFileName(`${worker?.employeeCode || ""}_${worker?.fullName || "NLD"}`);
  XLSX.writeFile(wb, `Phieu_thu_${monthSuffix}_${nameSuffix}.xlsx`);
}

export function exportRoomInvoice({
  building,
  billingMonth,
  billingCloseDay,
  floorName,
  room,
  workers = [],
  workerCharges = new Map(),
  paymentRowByStayId = new Map(),
  adminContact = {},
  electricity = null,
  water = null,
}) {
  const billingPeriod = getBillingPeriod(billingMonth, billingCloseDay);
  const stays = (room?.stays || []).filter((stay) => stayOverlapsPaymentPeriod(stay, billingPeriod));
  const rows = [];
  const period = periodLabel(billingMonth, billingCloseDay);
  const readingValue = (value) => {
    if (value == null || value === "") return "—";
    const n = Number(value);
    return Number.isFinite(n) ? n : "—";
  };
  const electricityStart = readingValue(electricity?.record?.start_reading ?? electricity?.record?.startReading);
  const electricityEnd = readingValue(electricity?.record?.end_reading ?? electricity?.record?.endReading);
  const waterStart = readingValue(water?.record?.start_reading ?? water?.record?.startReading);
  const waterEnd = readingValue(water?.record?.end_reading ?? water?.record?.endReading);
  const electricityPrice = Number(electricity?.pricePerUnit || 0);
  const waterPrice = Number(water?.pricePerUnit || 0);
  const electricityRoomTotal = Number(electricity?.totalAmount || 0);
  const waterRoomTotal = Number(water?.totalAmount || 0);

  rows.push([building?.name ? `KTX ${building.name}` : "Phiếu thanh toán KTX"]);
  rows.push([`PHIẾU THANH TOÁN PHÒNG ${room?.code || ""}`]);
  rows.push([]);
  rows.push(["Kỳ thu", billingMonth || "—"]);
  rows.push(["Khoảng kỳ", period || "—"]);
  rows.push(["Tầng - Phòng", `${floorName || ""}${floorName ? " - " : ""}Phòng ${room?.code || "—"}`]);
  rows.push([]);
  rows.push(["TỔNG SỐ ĐIỆN - NƯỚC CẢ PHÒNG"]);
  rows.push(["Hạng mục", "Đầu kỳ", "Cuối kỳ", "Tiêu thụ", "Đơn giá", "Thành tiền"]);
  const elecConsumption =
    typeof electricityStart === "number" && typeof electricityEnd === "number"
      ? Math.max(0, electricityEnd - electricityStart)
      : "—";
  const waterConsumption =
    typeof waterStart === "number" && typeof waterEnd === "number"
      ? Math.max(0, waterEnd - waterStart)
      : "—";
  rows.push(["Điện", electricityStart, electricityEnd, elecConsumption, electricityPrice, electricityRoomTotal]);
  rows.push(["Nước", waterStart, waterEnd, waterConsumption, waterPrice, waterRoomTotal]);
  rows.push([]);
  const detailTitleRowIdx = rows.length;
  rows.push(["CHI TIẾT THANH TOÁN TỪNG NGƯỜI"]);
  const detailHeaderRowIdx = rows.length;
  rows.push(["Mã NLĐ", "Họ tên", "SĐT", "Ngày vào KTX", "Ngày vào phòng", "Ngày chuyển phòng", "Ngày rời", "Số ngày miễn phí", "Tiền phòng", "Tiền điện", "Tiền nước", "Tổng (VNĐ)", "Trạng thái"]);
  const detailDataStartRowIdx = rows.length;
  let totalRoom = 0;
  let totalElectricity = 0;
  let totalWater = 0;
  let totalAmount = 0;
  for (const stay of stays) {
    const worker = workers.find((w) => w.id === stay.workerId);
    const charge = workerCharges.get(stay.workerId) || {};
    const roomAmount = Number(charge.roomAmount || 0);
    const electricityAmount = Number(charge.electricityAmount || 0);
    const waterAmount = Number(charge.waterAmount || 0);
    const sum = roomAmount + electricityAmount + waterAmount;
    const paymentRow = paymentRowByStayId.get(stay.id);
    totalRoom += roomAmount;
    totalElectricity += electricityAmount;
    totalWater += waterAmount;
    totalAmount += sum;
    rows.push([
      worker?.employeeCode || "—",
      worker?.fullName || "(không rõ)",
      worker?.phone || "—",
      formatDate(stay.initialDateIn || stay.initial_date_in || stay.dateIn, "—"),
      formatDate(stay.dateIn || stay.date_in, "—"),
      formatDate(stay.transferDate || stay.transfer_date, ""),
      formatDate(stay.dateOut || stay.date_out, ""),
      Number(worker?.freeRoomDays || 0),
      roomAmount,
      electricityAmount,
      waterAmount,
      sum,
      paymentRow?.paid ? "Đã thu" : "Chưa thu",
    ]);
  }
  rows.push(["TỔNG", "", "", "", "", "", "", "", totalRoom, totalElectricity, totalWater, totalAmount, ""]);
  if (adminContact?.name || adminContact?.phone || adminContact?.zalo) {
    rows.push([]);
    rows.push(["Liên hệ admin"]);
    if (adminContact.name) rows.push(["Người phụ trách", adminContact.name]);
    if (adminContact.phone) rows.push(["Điện thoại", adminContact.phone]);
    if (adminContact.zalo) rows.push(["Zalo", adminContact.zalo]);
    if (adminContact.email) rows.push(["Email", adminContact.email]);
    if (adminContact.note) rows.push(["Ghi chú", adminContact.note]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 12 },
  ];
  const totalRowIdx = detailDataStartRowIdx + stays.length;
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } },
    { s: { r: detailTitleRowIdx, c: 0 }, e: { r: detailTitleRowIdx, c: 12 } },
    { s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 2 } },
  ];
  sheet["!sheetViews"] = [{ showGridLines: false, RTL: false }];

  const whiteFill = { patternType: "solid", fgColor: { rgb: "FFFFFFFF" }, bgColor: { rgb: "FFFFFFFF" } };
  const baseStyle = { fill: whiteFill };
  const centerStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    fill: whiteFill,
  };
  const centerNumStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    fill: whiteFill,
    numFmt: "#,##0",
  };
  const centerBoldStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    font: { bold: true },
    fill: whiteFill,
  };
  const centerBoldNumStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    font: { bold: true },
    fill: whiteFill,
    numFmt: "#,##0",
  };
  const setStyle = (r, c, style) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!sheet[addr]) sheet[addr] = { t: "s", v: "" };
    sheet[addr].s = style;
  };

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      setStyle(r, c, baseStyle);
    }
  }

  for (let c = 0; c < 6; c += 1) {
    setStyle(7, c, centerBoldStyle);
    setStyle(8, c, centerBoldStyle);
    const isNumCol = c >= 1;
    setStyle(9, c, isNumCol ? centerNumStyle : centerStyle);
    setStyle(10, c, isNumCol ? centerNumStyle : centerStyle);
  }
  setStyle(detailTitleRowIdx, 0, centerBoldStyle);
  for (let c = 0; c < 13; c += 1) {
    setStyle(detailHeaderRowIdx, c, centerBoldStyle);
  }
  for (let r = detailDataStartRowIdx; r <= totalRowIdx; r += 1) {
    for (const c of [7, 8, 9, 10, 11]) {
      setStyle(r, c, r === totalRowIdx ? centerBoldNumStyle : centerNumStyle);
    }
    if (r === totalRowIdx) {
      setStyle(r, 0, centerBoldStyle);
      setStyle(r, 12, centerStyle);
    } else {
      setStyle(r, 12, centerStyle);
    }
  }

  const wb = XLSX.utils.book_new();
  wb.Workbook = {
    Views: [{ RTL: false }],
  };
  XLSX.utils.book_append_sheet(wb, sheet, "Phieu_phong");
  const monthSuffix = String(billingMonth || "").slice(0, 7).replace(/-/g, "_") || "phieu";
  const nameSuffix = sanitizeFileName(`Phong_${room?.code || ""}`);
  XLSX.writeFile(wb, `Phieu_thu_phong_${monthSuffix}_${nameSuffix}.xlsx`);
}

export function exportActivityLogExcel({ rows = [], dateFrom = "", dateTo = "", todayISO }) {
  const sheetRows = rows.map((row) => ({
    "Thời gian": row.created || "",
    "User": row.userName || "",
    "Hành động": row.action || "",
    "Loại dữ liệu": row.entity || "",
    "Nội dung": row.summary || "",
    "Chi tiết": row.detail || "",
    "Phương thức": row.method || "",
    "Đường dẫn": row.path || "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sheetRows),
    "Log",
  );

  const suffix = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : todayISO();
  XLSX.writeFile(wb, `Log_KTX_${suffix}.xlsx`);
}
