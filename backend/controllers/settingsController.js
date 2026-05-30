const pb = require("../config/pocketbase");

const DEFAULT_SETTINGS = {
  siteName: "KTX",
  roomGridCols: 3,
  canDeleteStructure: false,
  requirePasswordOnDelete: true,
  adminContact: {
    name: "",
    phone: "",
    email: "",
    zalo: "",
    note: "",
  },
  electricityPrice: 0,
  billingMonth: "",
  about: {
    companyName: "Ký túc xá",
    address: "",
    hotline: "0343.751.753",
    email: "",
    website: "",
    mapUrl: "",
    workingHours: "",
    services: [],
    rules: "",
    bankInfo: "",
    description: "",
    adminNotice: "",
  },
};

function fromRecord(row) {
  if (!row) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    siteName: row.site_name ?? DEFAULT_SETTINGS.siteName,
    roomGridCols: row.room_grid_cols ?? DEFAULT_SETTINGS.roomGridCols,
    canDeleteStructure: !!row.can_delete_structure,
    requirePasswordOnDelete: row.require_password_on_delete !== false,
    electricityPrice: row.electricity_price ?? 0,
    billingMonth: row.billing_month || "",
    about: { ...DEFAULT_SETTINGS.about, ...(row.about || {}) },
    adminContact: { ...DEFAULT_SETTINGS.adminContact, ...(row.admin_contact || row.adminContact || row.about?.adminContact || {}) },
  };
}

function toRecord(data) {
  return {
    key: "default",
    site_name: data.siteName,
    room_grid_cols: Number(data.roomGridCols || 3),
    can_delete_structure: !!data.canDeleteStructure,
    require_password_on_delete: !!data.requirePasswordOnDelete,
    electricity_price: Number(data.electricityPrice || 0),
    billing_month: data.billingMonth || "",
    about: { ...(data.about || {}), adminContact: data.adminContact || {} },
  };
}

async function getSettingsRecord() {
  return await pb.first("app_settings", { filter: pb.eq("key", "default") });
}

const settingsController = {
  get: async (_req, res) => {
    try {
      const row = await getSettingsRecord();
      if (!row) {
        const created = await pb.request("app_settings", "", {
          method: "POST",
          body: JSON.stringify(toRecord(DEFAULT_SETTINGS)),
        });
        return res.json(fromRecord(created));
      }
      res.json(fromRecord(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({ error: "Dữ liệu settings không hợp lệ" });
      }
      const payload = toRecord({ ...DEFAULT_SETTINGS, ...data, about: { ...DEFAULT_SETTINGS.about, ...(data.about || {}) }, adminContact: { ...DEFAULT_SETTINGS.adminContact, ...(data.adminContact || {}) } });
      const current = await getSettingsRecord();
      const row = current
        ? await pb.request("app_settings", `/${current.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await pb.request("app_settings", "", { method: "POST", body: JSON.stringify(payload) });
      res.json(fromRecord(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};

module.exports = settingsController;
