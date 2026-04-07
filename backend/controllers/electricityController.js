const db = require("../config/db");

const electricityController = {
  getAll: async (req, res) => {
    try {
      const { rows } = await db.query("SELECT * FROM electricities ORDER BY month DESC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getByRoom: async (req, res) => {
    try {
      const { roomId } = req.params;
      const { rows } = await db.query(
        "SELECT * FROM electricities WHERE room_id = $1 ORDER BY month DESC",
        [roomId]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  upsert: async (req, res) => {
    try {
      const { id, room_id, month, start_reading, end_reading, paid } = req.body;
      
      let query;
      let values;

      if (id) {
        // Update
        query = `
          UPDATE electricities 
          SET start_reading = $1, end_reading = $2, paid = $3, month = $4
          WHERE id = $5
          RETURNING *
        `;
        values = [start_reading, end_reading, paid, month, id];
      } else {
        // Insert
        query = `
          INSERT INTO electricities (room_id, month, start_reading, end_reading, paid)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        values = [room_id, month, start_reading, end_reading, paid];
      }

      const { rows } = await db.query(query, values);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  markPaid: async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await db.query(
        "UPDATE electricities SET paid = true, paid_at = now() WHERE id = $1 RETURNING *",
        [id]
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
      await db.query("DELETE FROM electricities WHERE id = $1", [id]);
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = electricityController;
