import { useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { loadSettingsFromDb } from "../services/settingsService";

export function useAppBootstrap({
  loadAllFromDb,
  setState,
  setAuth,
  defaultSettings,
}) {
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setAuth({ isAdmin: !!data.session });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ isAdmin: !!session });
    });

    return () => sub.subscription.unsubscribe();
  }, [setAuth]);

  useEffect(() => {
    (async () => {
      try {
        await loadAllFromDb();
      } catch (e) {
        console.error(e);
        alert("Không tải được dữ liệu từ Supabase: " + (e?.message || String(e)));
      }
    })();
  }, [loadAllFromDb]);

  useEffect(() => {
    (async () => {
      const nextSettings = await loadSettingsFromDb(defaultSettings);
      setState((s) => ({ ...s, settings: nextSettings }));
    })();
  }, [defaultSettings, setState]);
}
