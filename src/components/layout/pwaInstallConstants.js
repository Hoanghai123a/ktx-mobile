export const BRAND = "rgb(44 120 159)";
export const BRAND_DARK = "rgb(36 99 132)";

export const IOS_INSTALL_STEPS = [
  { image: "/install-ios/B1.jpg", title: "Bước 1", text: "Nhấp vào dấu 3 chấm" },
  { image: "/install-ios/B2.jpg", title: "Bước 2", text: "Chọn Chia sẻ" },
  { image: "/install-ios/B3.jpg", title: "Bước 3", text: "Chọn Xem thêm" },
  { image: "/install-ios/B4.jpg", title: "Bước 4", text: "Chọn Thêm vào Màn hình chính" },
  { image: "/install-ios/B5.jpg", title: "Bước 5", text: "Chọn Thêm" },
];

export function brandFromSettings(settings) {
  return {
    siteName: String(settings?.siteName || "KTX").trim() || "KTX",
    logoUrl:
      String(
        settings?.logoUrl || settings?.about?.brandLogoUrl || "/logo.png",
      ).trim() || "/logo.png",
  };
}
