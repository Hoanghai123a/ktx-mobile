const pb = require("../config/pocketbase");

function isISODate(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function normalizeDateOrNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim();
  return null;
}

function normalizeStay(row) {
  return {
    ...row,
    date_in: pb.dateOnly(row.date_in),
    date_out: pb.dateOnly(row.date_out),
  };
}

async function activeStayForWorker(workerId) {
  const rows = await pb.list("stays", { filter: pb.eq("worker_id", workerId), sort: "-date_in" });
  return rows.find((s) => !s.date_out) || null;
}

const stayController = {
  getAll: async (_req, res) => {
    try {
      const rows = await pb.list("stays", { sort: "-date_in" });
      res.json(rows.map(normalizeStay));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { worker_id, room_id, date_in, date_out } = req.body;
      const dateIn = normalizeDateOrNull(date_in);
      const dateOut = normalizeDateOrNull(date_out);

      if (!worker_id || !room_id || !dateIn) return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc: worker_id, room_id, date_in" });
      if (!isISODate(dateIn)) return res.status(400).json({ error: "date_in không hợp lệ (YYYY-MM-DD)" });
      if (dateOut != null && !isISODate(dateOut)) return res.status(400).json({ error: "date_out không hợp lệ (YYYY-MM-DD)" });
      if (dateOut != null && dateOut < dateIn) return res.status(400).json({ error: "date_out không được nhỏ hơn date_in" });

      await pb.request("workers", `/${worker_id}`);
      await pb.request("rooms", `/${room_id}`);

      if (dateOut == null) {
        const active = await activeStayForWorker(worker_id);
        if (active) return res.status(409).json({ error: "NLĐ đang có lượt ở hiện tại (date_out = null)." });
      }

      const row = await pb.request("stays", "", {
        method: "POST",
        body: JSON.stringify({ worker_id, room_id, date_in: pb.dateValue(dateIn), date_out: pb.dateValue(dateOut) }),
      });
      res.status(201).json(normalizeStay(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "worker_id hoặc room_id không tồn tại" : err.message });
    }
  },

  update: async (req, res) => {
    try {
      const dateOut = normalizeDateOrNull(req.body.date_out);
      if (dateOut != null && !isISODate(dateOut)) return res.status(400).json({ error: "date_out không hợp lệ (YYYY-MM-DD)" });

      const current = await pb.request("stays", `/${req.params.id}`);
      const dateIn = pb.dateOnly(current.date_in);
      if (dateOut != null && dateIn && dateOut < dateIn) return res.status(400).json({ error: "date_out không được nhỏ hơn date_in" });

      const row = await pb.request("stays", `/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ date_out: pb.dateValue(dateOut) }),
      });
      res.json(normalizeStay(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },
};

module.exports = stayController;
