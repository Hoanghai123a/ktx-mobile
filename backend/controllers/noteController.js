const pb = require("../config/pocketbase");

const noteController = {
  getAll: async (req, res) => {
    try {
      const { target_id, target_type } = req.query;
      const filters = [];
      if (target_id) filters.push(pb.eq("target_id", target_id));
      if (target_type) filters.push(pb.eq("target_type", target_type));
      const rows = await pb.list("general_notes", {
        filter: filters.join(" && "),
        sort: "-created",
      });
      res.json(rows);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { target_id, target_type, content } = req.body;
      if (!target_id || !target_type || !content) return res.status(400).json({ error: "target_id, target_type, content là bắt buộc" });
      const row = await pb.request("general_notes", "", {
        method: "POST",
        body: JSON.stringify({ target_id, target_type, content }),
      });
      res.status(201).json(row);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const row = await pb.request("general_notes", `/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(req.body || {}),
      });
      res.json(row);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      await pb.request("general_notes", `/${req.params.id}`, { method: "DELETE" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};

module.exports = noteController;
