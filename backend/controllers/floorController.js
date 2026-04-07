const db = require("../config/db");

const floorController = {
  getAll: async (req, res) => {
    try {
      const { rows } = await db.query("SELECT * FROM floors ORDER BY sort ASC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { name, sort } = req.body;
      const { rows } = await db.query(
        "INSERT INTO floors (name, sort) VALUES ($1, $2) RETURNING *",
        [name, sort]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM floors WHERE id = $1", [id]);
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = floorController;
