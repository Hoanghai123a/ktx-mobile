const pb = require("../config/pocketbase");

function normalize(row) {
  return {
    ...row,
    paid_at: row.paid_at || null,
  };
}

const electricityController = {
  getAll: async (_req, res) => {
    try {
      const rows = await pb.list("electricities", { sort: "-month" });
      res.json(rows.map(normalize));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  getByRoom: async (req, res) => {
    try {
      const rows = await pb.list("electricities", {
        filter: pb.eq("room_id", req.params.roomId),
        sort: "-month",
      });
      res.json(rows.map(normalize));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  upsert: async (req, res) => {
    try {
      const { id, room_id, month, start_reading, end_reading, paid } = req.body;
      const payload = {
        room_id,
        month,
        start_reading: Number(start_reading || 0),
        end_reading: Number(end_reading || 0),
        paid: !!paid,
        paid_at: paid ? new Date().toISOString() : null,
      };

      let row;
      if (id) {
        row = await pb.request("electricities", `/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const existing = await pb.first("electricities", {
          filter: `${pb.eq("room_id", room_id)} && ${pb.eq("month", month)}`,
        });
        if (existing) {
          row = await pb.request("electricities", `/${existing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          row = await pb.request("electricities", "", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      }
      res.json(normalize(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  markPaid: async (req, res) => {
    try {
      const row = await pb.request("electricities", `/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ paid: true, paid_at: new Date().toISOString() }),
      });
      res.json(normalize(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },

  delete: async (req, res) => {
    try {
      await pb.request("electricities", `/${req.params.id}`, { method: "DELETE" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};

module.exports = electricityController;
