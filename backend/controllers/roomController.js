const db = require("../config/db");

const roomController = {
  getAll: async (req, res) => {
    try {
      const { rows } = await db.query("SELECT * FROM rooms ORDER BY sort ASC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await db.query("SELECT * FROM rooms WHERE id = $1", [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { floor_id, code, sort } = req.body;
      const { rows } = await db.query(
        "INSERT INTO rooms (floor_id, code, sort) VALUES ($1, $2, $3) RETURNING *",
        [floor_id, code, sort]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const keys = Object.keys(fields);
      if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });

      const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
      const values = [id, ...Object.values(fields)];

      const { rows } = await db.query(
        `UPDATE rooms SET ${setClause} WHERE id = $1 RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await db.query("DELETE FROM rooms WHERE id = $1", [id]);
      if (rowCount === 0) return res.status(404).json({ error: "Not found" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = roomController;
