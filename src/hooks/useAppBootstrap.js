import { useEffect } from "react";
import { settingsService } from "../services/api-services";

export function useAppBootstrap({
  loadAllFromDb,
  setState,
  defaultSettings,
  token,
  selectedBuildingId,
}) {
  useEffect(() => {
    (async () => {
      try {
        await loadAllFromDb();
      } catch (e) {
        console.error("Bootstrap loadAll error:", e);
      }
    })();
  }, [loadAllFromDb]);

  useEffect(() => {
    (async () => {
      try {
        if (!token || !selectedBuildingId) return;
        const data = await settingsService.get(token);
        setState((s) => ({
          ...s,
          settings: {
            ...defaultSettings,
            ...(data || {}),
          },
        }));
      } catch (e) {
        console.error("Bootstrap loadSettings error:", e);
      }
    })();
  }, [defaultSettings, selectedBuildingId, setState, token]);
}