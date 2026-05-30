// src/services/excelSampleService.js
import * as XLSX from "xlsx";

export function downloadExcelSample() {
  // Dữ liệu mẫu
  const sampleData = [
    {
      "Mã nhân viên": "NV001",
      "Họ tên": "Nguyễn Văn A",
      "Ngày sinh": "15/05/1995",
      "Số điện thoại": "0912345678",
      "Quê quán": "Hà Nội",
      "Người tuyển": "Anh Tuấn",
      "Ghi chú": "Công nhân cơ khí",
      Phòng: "101",
      "Ngày vào": "01/01/2026",
      "Ngày rời": "",
    },
    {
      "Mã nhân viên": "NV002",
      "Họ tên": "Trần Thị B",
      "Ngày sinh": "20/10/1998",
      "Số điện thoại": "0987654321",
      "Quê quán": "Hải Phòng",
      "Người tuyển": "Lan HRP",
      "Ghi chú": "Công nhân may",
      Phòng: "102",
      "Ngày vào": "15/02/2026",
      "Ngày rời": "",
    },
  ];

  // Tạo workbook và sheet
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mau_NLD");

  // Thiết lập độ rộng cột
  const wscols = [
    { wch: 12 }, // Mã nhân viên
    { wch: 20 }, // Họ tên
    { wch: 12 }, // Ngày sinh
    { wch: 15 }, // Số điện thoại
    { wch: 15 }, // Quê quán
    { wch: 15 }, // Người tuyển
    { wch: 20 }, // Ghi chú
    { wch: 10 }, // Phòng
    { wch: 12 }, // Ngày vào
    { wch: 12 }, // Ngày rời
  ];
  ws["!cols"] = wscols;

  // Xuất file
  XLSX.writeFile(wb, "Mau_Nhap_NLD_KTX.xlsx");
}
