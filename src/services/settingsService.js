import { supabase } from "./supabaseClient";

export async function loadSettingsFromDb(DEFAULT_SETTINGS) {
  const res = await supabase
    .from("app_settings")
    .select("id,data")
    .eq("id", 1)
    .maybeSingle();

  if (res.error) {
    console.log("load settings error:", res.error);
    return DEFAULT_SETTINGS;
  }

  if (!res.data) {
    const ins = await supabase
      .from("app_settings")
      .insert({ id: 1, data: DEFAULT_SETTINGS });

    if (ins.error) console.log("init settings error:", ins.error);
    return DEFAULT_SETTINGS;
  }

  const incoming = res.data?.data || {};

  // migration legacy
  const legacyCanDelete = incoming?.about?.canDeleteStructure;
  const legacyRequirePass = incoming?.about?.requirePasswordOnDelete;

  if (
    typeof incoming.canDeleteStructure !== "boolean" &&
    typeof legacyCanDelete === "boolean"
  ) {
    incoming.canDeleteStructure = legacyCanDelete;
  }
  if (
    typeof incoming.requirePasswordOnDelete !== "boolean" &&
    typeof legacyRequirePass === "boolean"
  ) {
    incoming.requirePasswordOnDelete = legacyRequirePass;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...incoming,
    about: {
      ...DEFAULT_SETTINGS.about,
      ...(incoming.about || {}),
    },
  };
}

export async function saveSettingsToDb(nextSettings) {
  const payload = { id: 1, data: nextSettings };
  const res = await supabase
    .from("app_settings")
    .upsert(payload, { onConflict: "id" });
  if (res.error) throw new Error(res.error.message);
}
