const pb = require("../config/pocketbase");

function normalizeGender(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  if (s === "male" || s === "nam") return "male";
  if (s === "female" || s === "nu" || s === "nữ") return "female";
  return "__invalid__";
}

const roomController = {
  getAll: async (_req, res) => {
    try {
      const rows = await pb.list("rooms", { sort: "+sort" });
      res.json(rows.map((r) => ({ ...r, gender: r.gender || null })));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const row = await pb.request("rooms", `/${req.params.id}`);
      res.json({ ...row, gender: row.gender || null });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { floor_id, code, sort } = req.body;
      const row = await pb.request("rooms", "", {
        method: "POST",
        body: JSON.stringify({ floor_id, code, sort: Number(sort || 0) }),
      });
      res.status(201).json(row);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const fields = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(fields, "gender")) {
        const g = normalizeGender(fields.gender);
        if (g === "__invalid__") {
          return res.status(400).json({ error: 'gender không hợp lệ. Chỉ nhận: "male", "female" hoặc null.' });
        }
        fields.gender = g;
      }
      if (Object.keys(fields).length === 0) return res.status(400).json({ error: "No fields to update" });
      const row = await pb.request("rooms", `/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      res.json({ ...row, gender: row.gender || null });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },

  delete: async (req, res) => {
    try {
      await pb.request("rooms", `/${req.params.id}`, { method: "DELETE" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};

module.exports = roomController;
