// src/services/excelExportService.js
import * as XLSX from "xlsx";
import { formatDate } from "./dateFormat.js";

function workerGenderLabel(value) {
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  return "";
}

function paymentStatus({ paid, totalAmount }) {
  if (Number(totalAmount || 0) <= 0) return "Không phát sinh";
  return paid ? "Đã thu" : "Chưa thu";
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
          "Số ngày ở Free": Number(w?.freeRoomDays || 0),
          "Ngày sinh": formatDate(w?.dob, ""),
          "Quê quán": w?.hometown || "",
          "Số điện thoại": w?.phone || "",
          "Người tuyển": w?.recruiter || "",
          "Ghi chú": w?.note || "",
          "Ngày vào": formatDate(st.dateIn, ""),
          "Ngày rời": formatDate(st.dateOut, ""),
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

export function exportPaymentExcel({ floors, workerById, billingMonth, utilityBilling, workerPaymentRows = [], todayISO }) {
  const rows = [];
  const paymentRowByStayId = new Map(
    workerPaymentRows.map((row) => [row.stayId, row]),
  );
  for (const f of floors) {
    for (const r of f.rooms) {
      const current = r.stays.filter((s) => !s.dateOut);
      const roomCharges = utilityBilling?.byRoom?.get?.(r.id)?.byWorker || new Map();
      for (const st of current) {
        const w = workerById.get(st.workerId);
        const paymentRow = paymentRowByStayId.get(st.id);
        const charge = roomCharges.get(st.workerId) || {};
        const electricityFee = Number(charge.electricityAmount || 0);
        const waterFee = Number(charge.waterAmount || 0);
        const roomFee = Number(paymentRow?.roomAmount ?? charge.roomAmount ?? 0);
        const totalAmount = roomFee + electricityFee + waterFee;
        rows.push({
          "Tháng": billingMonth || "",
          "Tầng": f.name,
          "Phòng": r.code,
          "Mã nhân viên": w?.employeeCode || "",
          "Họ tên": w?.fullName || "(không rõ)",
          "Ngày vào": formatDate(st.dateIn, ""),
          "Số ngày ở miễn phí": Number(w?.freeRoomDays || 0),
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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows),
    "Phong_dang_o",
  );

  const checkoutRows = workerPaymentRows.filter((row) => !row.active).map((row) => {
    const worker = workerById.get(row.workerId);
    return {
      "Ngày vào": formatDate(row.dateIn, ""),
      "Ngày rời": formatDate(row.dateOut, ""),
      "Tầng": row.floorName || "",
      "Phòng": row.roomCode || "",
      "Mã nhân viên": row.employeeCode || "",
      "Họ tên": row.workerName || "",
      "Số ngày ở miễn phí": Number(worker?.freeRoomDays || 0),
      "Tiền phòng": Number(row.roomAmount || 0),
      "Tiền điện": Number(row.electricityAmount || 0),
      "Tiền nước": Number(row.waterAmount || 0),
      "Tổng tiền": Number(row.totalAmount || 0),
      "Trạng thái": paymentStatus(row),
      "Thời điểm lưu": row.paidAt || "",
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(checkoutRows),
    "NLD_roi_phong",
  );

  const suffix = billingMonth || todayISO();
  XLSX.writeFile(wb, `Thanh_toan_KTX_${suffix}.xlsx`);
}
