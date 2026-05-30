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
    throw makeError(403, { error: "TÃ i khoáº£n Ä‘ang chá» admin phÃª duyá»‡t." });
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
      if (!username || !password) return res.status(400).json({ error: "Nháº­p username vÃ  máº­t kháº©u." });
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
      const email = String(req.body?.email || (username.includes("@") ? username : `${username}@ktx.local`)).trim().toLowerCase();
      if (!username || !password) return res.status(400).json({ error: "Nháº­p username vÃ  máº­t kháº©u." });

      const authSettings = await getAuthSettings();
      const approved = authSettings.require_approval === false;

      await pb.request(AUTH_COLLECTION, "", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
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
          message: "TÃ i khoáº£n Ä‘Ã£ Ä‘Æ°á»£c táº¡o vÃ  Ä‘ang chá» admin phÃª duyá»‡t.",
        });
      }

      res.json(await authWithPassword(username, password));
    } catch (err) {
      res.status(err.status || 500).json(err.data || { error: err.message });
    }
  },
};

module.exports = authController;

