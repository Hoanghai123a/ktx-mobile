const db = require("../config/db");

const settingsController = {
  get: async (req, res) => {
    try {
      const { rows } = await db.query(
        "SELECT data FROM app_settings WHERE id = 1",
      );
      if (rows.length === 0) {
        const ins = await db.query(
          "INSERT INTO app_settings (id, data) VALUES (1, $1) RETURNING data",
          [{}],
        );
        return res.json(ins.rows[0]?.data || {});
      }
      res.json(rows[0]?.data || {});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({ error: "Dữ liệu settings không hợp lệ" });
      }

      const { rows } = await db.query(
        `INSERT INTO app_settings (id, data)
         VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = now()
         RETURNING data`,
        [data],
      );
      res.json(rows[0]?.data || {});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = settingsController;

