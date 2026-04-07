const db = require("../config/db");

function isISODate(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

function normalizeDateOrNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim();
  return null;
}

const stayController = {
  getAll: async (req, res) => {
    try {
      const { rows } = await db.query(
        "SELECT * FROM stays ORDER BY date_in DESC",
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { worker_id, room_id, date_in, date_out } = req.body;
      const dateIn = normalizeDateOrNull(date_in);
      const dateOut = normalizeDateOrNull(date_out);

      if (!worker_id || !room_id || !dateIn) {
        return res.status(400).json({
          error: "Thiếu dữ liệu bắt buộc: worker_id, room_id, date_in",
        });
      }
      if (!isISODate(dateIn)) {
        return res.status(400).json({ error: "date_in không hợp lệ (YYYY-MM-DD)" });
      }
      if (dateOut != null && !isISODate(dateOut)) {
        return res
          .status(400)
          .json({ error: "date_out không hợp lệ (YYYY-MM-DD)" });
      }
      if (dateOut != null && dateOut < dateIn) {
        return res
          .status(400)
          .json({ error: "date_out không được nhỏ hơn date_in" });
      }

      const workerExists = await db.query(
        "SELECT 1 FROM workers WHERE id = $1",
        [worker_id],
      );
      if (workerExists.rowCount === 0)
        return res.status(404).json({ error: "worker_id không tồn tại" });

      const roomExists = await db.query("SELECT 1 FROM rooms WHERE id = $1", [
        room_id,
      ]);
      if (roomExists.rowCount === 0)
        return res.status(404).json({ error: "room_id không tồn tại" });

      if (dateOut == null) {
        const active = await db.query(
          "SELECT id FROM stays WHERE worker_id = $1 AND date_out IS NULL LIMIT 1",
          [worker_id],
        );
        if (active.rowCount > 0) {
          return res.status(409).json({
            error: "NLĐ đang có lượt ở hiện tại (date_out = null).",
          });
        }
      }

      const { rows } = await db.query(
        "INSERT INTO stays (worker_id, room_id, date_in, date_out) VALUES ($1, $2, $3, $4) RETURNING *",
        [worker_id, room_id, dateIn, dateOut],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { date_out } = req.body;
      const dateOut = normalizeDateOrNull(date_out);

      if (dateOut != null && !isISODate(dateOut)) {
        return res
          .status(400)
          .json({ error: "date_out không hợp lệ (YYYY-MM-DD)" });
      }

      const current = await db.query("SELECT * FROM stays WHERE id = $1", [id]);
      if (current.rowCount === 0)
        return res.status(404).json({ error: "Not found" });

      const dateIn = current.rows[0]?.date_in;
      if (dateOut != null && isISODate(dateIn) && dateOut < dateIn) {
        return res
          .status(400)
          .json({ error: "date_out không được nhỏ hơn date_in" });
      }

      const { rows } = await db.query(
        "UPDATE stays SET date_out = $1 WHERE id = $2 RETURNING *",
        [dateOut, id],
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = stayController;
