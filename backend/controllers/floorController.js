const pb = require("../config/pocketbase");

const floorController = {
  getAll: async (_req, res) => {
    try {
      const rows = await pb.list("floors", { sort: "+sort" });
      res.json(rows);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { name, sort } = req.body;
      const row = await pb.request("floors", "", {
        method: "POST",
        body: JSON.stringify({ name, sort: Number(sort || 0) }),
      });
      res.status(201).json(row);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      await pb.request("floors", `/${req.params.id}`, { method: "DELETE" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};

module.exports = floorController;
