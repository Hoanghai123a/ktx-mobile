import { useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { loadSettingsFromDb } from "../services/settingsService";

/**
 * useAppBootstrap - Hook khởi tạo ứng dụng
 * Tự động đồng bộ trạng thái Auth và dữ liệu ban đầu
 */
export function useAppBootstrap({
  loadAllFromDb,
  setState,
  setAuth,
  defaultSettings,
  token, // Thêm token từ AuthContext
}) {
  // 1. Quản lý trạng thái Auth (Chỉ dùng Token API)
  useEffect(() => {
    if (token) {
      setAuth({ isAdmin: true });
    } else {
      setAuth({ isAdmin: false });
    }
  }, [setAuth, token]);

  // 2. Tải toàn bộ dữ liệu (floors, workers, stays)
  useEffect(() => {
    (async () => {
      try {
        await loadAllFromDb();
      } catch (e) {
        console.error("Bootstrap loadAll error:", e);
      }
    })();
  }, [loadAllFromDb]);

  // 3. Tải cài đặt (Settings)
  useEffect(() => {
    (async () => {
      try {
        const nextSettings = await loadSettingsFromDb(defaultSettings);
        setState((s) => ({ ...s, settings: nextSettings }));
      } catch (e) {
        console.error("Bootstrap loadSettings error:", e);
      }
    })();
  }, [defaultSettings, setState]);
}
