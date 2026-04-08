const db = require("../config/db");

function normalizeEmployeeCode(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.toUpperCase();
}

function isValidEmployeeCode(code) {
  if (code == null) return true;
  if (typeof code !== "string") return false;
  if (code.length < 2 || code.length > 32) return false;
  return /^[A-Z0-9][A-Z0-9_-]*$/.test(code);
}

const workerController = {
  getAll: async (req, res) => {
    try {
      const { rows } = await db.query(
        "SELECT * FROM workers ORDER BY employee_code NULLS LAST, full_name ASC",
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getByEmployeeCode: async (req, res) => {
    try {
      const code = normalizeEmployeeCode(req.params.code);
      if (!code)
        return res.status(400).json({ error: "Mã nhân viên không hợp lệ" });
      const { rows } = await db.query(
        "SELECT * FROM workers WHERE employee_code = $1 LIMIT 1",
        [code],
      );
      if (rows.length === 0)
        return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await db.query("SELECT * FROM workers WHERE id = $1", [
        id,
      ]);
      if (rows.length === 0)
        return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const {
        employee_code,
        full_name,
        hometown,
        phone,
        dob,
        recruiter,
        note,
      } = req.body;
      const code = normalizeEmployeeCode(employee_code);
      if (!full_name || !String(full_name).trim()) {
        return res.status(400).json({ error: "full_name là bắt buộc" });
      }
      if (code && !isValidEmployeeCode(code)) {
        return res.status(400).json({
          error:
            "Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự.",
        });
      }
      const { rows } = await db.query(
        "INSERT INTO workers (employee_code, full_name, hometown, phone, dob, recruiter, note) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [code, full_name, hometown, phone, dob, recruiter, note],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err?.code === "23505") {
        return res
          .status(409)
          .json({ error: "Mã nhân viên đã tồn tại, vui lòng chọn mã khác." });
      }
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const fields = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(fields, "employee_code")) {
        fields.employee_code = normalizeEmployeeCode(fields.employee_code);
        if (fields.employee_code && !isValidEmployeeCode(fields.employee_code)) {
          return res.status(400).json({
            error:
              "Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự.",
          });
        }
      }
      const keys = Object.keys(fields);
      if (keys.length === 0)
        return res.status(400).json({ error: "No fields to update" });

      const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
      const values = [id, ...Object.values(fields)];

      const { rows } = await db.query(
        `UPDATE workers SET ${setClause} WHERE id = $1 RETURNING *`,
        values,
      );
      if (rows.length === 0)
        return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err) {
      if (err?.code === "23505") {
        return res
          .status(409)
          .json({ error: "Mã nhân viên đã tồn tại, vui lòng chọn mã khác." });
      }
      res.status(500).json({ error: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { rowCount } = await db.query("DELETE FROM workers WHERE id = $1", [
        id,
      ]);
      if (rowCount === 0) return res.status(404).json({ error: "Not found" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = workerController;
