// src/services/excelExportService.js
import * as XLSX from "xlsx";

export function exportExcel({ floors, workers, workerById, stats, todayISO }) {
  const roomsSheet = [];
  for (const f of floors) {
    for (const r of f.rooms) {
      const current = r.stays.filter((s) => !s.dateOut);
      roomsSheet.push({
        Tầng: f.name,
        Phòng: r.code,
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
    "Ngày sinh": w.dob || "",
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
          Tầng: f.name,
          Phòng: r.code,
          "Mã nhân viên": w?.employeeCode || "",
          "Họ tên": w?.fullName || "(không rõ)",
          "Ngày sinh": w?.dob || "",
          "Quê quán": w?.hometown || "",
          "Số điện thoại": w?.phone || "",
          "Người tuyển": w?.recruiter || "",
          "Ghi chú": w?.note || "",
          "Ngày vào": st.dateIn,
          "Ngày rời": st.dateOut || "",
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
