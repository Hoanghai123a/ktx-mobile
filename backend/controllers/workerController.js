const pb = require("../config/pocketbase");

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

function normalizeWorker(row) {
  if (!row) return row;
  return {
    ...row,
    employee_code: row.employee_code || null,
    gender: row.gender || null,
    identity_number: row.identity_number || "",
    electricity_fee: Number(row.electricity_fee || 0),
    water_fee: Number(row.water_fee || 0),
    dob: pb.dateOnly(row.dob),
  };
}

const workerController = {
  getAll: async (_req, res) => {
    try {
      const rows = await pb.list("workers", {
        sort: "+employee_code,+full_name",
      });
      res.json(rows.map(normalizeWorker));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  getByEmployeeCode: async (req, res) => {
    try {
      const code = normalizeEmployeeCode(req.params.code);
      if (!code) return res.status(400).json({ error: "Mã nhân viên không hợp lệ" });
      const row = await pb.first("workers", { filter: pb.eq("employee_code", code) });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(normalizeWorker(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const row = await pb.request("workers", `/${req.params.id}`);
      res.json(normalizeWorker(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },

  create: async (req, res) => {
    try {
      const { employee_code, full_name, gender, identity_number, electricity_fee, water_fee, hometown, phone, dob, recruiter, note } = req.body;
      const code = normalizeEmployeeCode(employee_code);
      if (!full_name || !String(full_name).trim()) {
        return res.status(400).json({ error: "full_name là bắt buộc" });
      }
      if (code && !isValidEmployeeCode(code)) {
        return res.status(400).json({ error: "Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự." });
      }
      const row = await pb.request("workers", "", {
        method: "POST",
        body: JSON.stringify({ employee_code: code, full_name, gender: gender || null, identity_number: identity_number || "", electricity_fee: Number(electricity_fee || 0), water_fee: Number(water_fee || 0), hometown, phone, dob: pb.dateValue(dob), recruiter, note }),
      });
      res.status(201).json(normalizeWorker(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 400 ? "Mã nhân viên đã tồn tại hoặc dữ liệu không hợp lệ." : err.message });
    }
  },

  update: async (req, res) => {
    try {
      const fields = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(fields, "employee_code")) {
        fields.employee_code = normalizeEmployeeCode(fields.employee_code);
        if (fields.employee_code && !isValidEmployeeCode(fields.employee_code)) {
          return res.status(400).json({ error: "Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự." });
        }
      }
      if (Object.prototype.hasOwnProperty.call(fields, "dob")) fields.dob = pb.dateValue(fields.dob);
      if (Object.prototype.hasOwnProperty.call(fields, "gender")) fields.gender = fields.gender || null;
      if (Object.prototype.hasOwnProperty.call(fields, "identity_number")) fields.identity_number = fields.identity_number || "";
      if (Object.prototype.hasOwnProperty.call(fields, "electricity_fee")) fields.electricity_fee = Number(fields.electricity_fee || 0);
      if (Object.prototype.hasOwnProperty.call(fields, "water_fee")) fields.water_fee = Number(fields.water_fee || 0);
      if (Object.keys(fields).length === 0) return res.status(400).json({ error: "No fields to update" });
      const row = await pb.request("workers", `/${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      res.json(normalizeWorker(row));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },

  delete: async (req, res) => {
    try {
      await pb.request("workers", `/${req.params.id}`, { method: "DELETE" });
      res.json({ message: "Deleted successfully" });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.status === 404 ? "Not found" : err.message });
    }
  },
};

module.exports = workerController;
