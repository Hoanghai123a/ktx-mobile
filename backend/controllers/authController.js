const pb = require("../config/pocketbase");

const AUTH_COLLECTION = process.env.POCKETBASE_AUTH_COLLECTION || "users";

function makeError(status, data = {}) {
  const err = new Error(data.error || data.message || `Auth failed (${status})`);
  err.status = status;
  err.data = data;
  return err;
}

async function authWithPassword(username, password) {
  const res = await fetch(`${pb.PB_URL}/api/collections/${AUTH_COLLECTION}/auth-with-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ identity: username, password }),
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw makeError(res.status, payload);

  const record = payload?.record || {};
  if (record.role !== "admin" && record.approved === false) {
    throw makeError(403, { error: "Tài khoản đang chờ admin phê duyệt." });
  }

  return {
    access_token: payload.token,
    expires_in: 604800,
    data: record,
  };
}

async function getAuthSettings() {
  const row = await pb.first("system_settings", { filter: pb.eq("key", "auth") });
  return { require_approval: row?.require_approval !== false };
}


const authController = {
  login: async (req, res) => {
    try {
      const username = String(req.body?.username || "").trim();
      const password = String(req.body?.password || "");
      if (!username || !password) return res.status(400).json({ error: "Nhập username và mật khẩu." });
      res.json(await authWithPassword(username, password));
    } catch (err) {
      res.status(err.status || 500).json(err.data || { error: err.message });
    }
  },

  register: async (req, res) => {
    try {
      const username = String(req.body?.username || "").trim();
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "").trim();
      if (!username || !password) return res.status(400).json({ error: "Nhập username và mật khẩu." });
      if (password.length < 8) return res.status(400).json({ error: "Mật khẩu đăng ký phải có ít nhất 8 ký tự." });

      const authSettings = await getAuthSettings();
      const approved = authSettings.require_approval === false;

      await pb.request(AUTH_COLLECTION, "", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          passwordConfirm: password,
          name,
          role: "user",
          approved,
        }),
      });

      if (!approved) {
        return res.json({
          pending_approval: true,
          message: "Tài khoản đã được tạo và đang chờ admin phê duyệt.",
        });
      }

      res.json(await authWithPassword(username, password));
    } catch (err) {
      const rawMessage = err.data?.message || err.message;
      if (rawMessage === "Failed to create record.") {
        const token = pb.tokenStatus?.() || { configured: false, expired: false, exp: null };
        if (token.expired) {
          return res.status(500).json({
            error: `POCKETBASE_TOKEN đã hết hạn (${token.exp}). Hãy tạo token mới cho backend hoặc mở Create rule cho collection users.`,
          });
        }
        if (!token.configured) {
          return res.status(500).json({
            error: "Backend chưa cấu hình POCKETBASE_TOKEN. Hãy thêm token backend hoặc mở Create rule cho collection users.",
          });
        }
        return res.status(500).json({
          error: "PocketBase đang từ chối tạo user. Kiểm tra quyền token backend hoặc Create rule của collection users.",
        });
      }
      res.status(err.status || 500).json(err.data || { error: err.message });
    }
  },
};

module.exports = authController;
