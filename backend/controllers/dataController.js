const pb = require("../config/pocketbase");

function stayOut(s) {
  return {
    id: s.id,
    workerId: s.worker_id,
    roomId: s.room_id,
    dateIn: pb.dateOnly(s.date_in),
    dateOut: pb.dateOnly(s.date_out),
  };
}

function workerOut(w) {
  return {
    id: w.id,
    employeeCode: w.employee_code || "",
    fullName: w.full_name,
    hometown: w.hometown || "",
    recruiter: w.recruiter || "",
    dob: pb.dateOnly(w.dob) || "",
    phone: w.phone || "",
    note: w.note || "",
  };
}

async function deleteAll(collection) {
  const rows = await pb.list(collection, { sort: "-created" });
  for (const row of rows) {
    await pb.request(collection, `/${row.id}`, { method: "DELETE" });
  }
}

const dataController = {
  loadAll: async (_req, res) => {
    try {
      const [floorsData, roomsData, workersData, staysData, elecData] = await Promise.all([
        pb.list("floors", { sort: "+sort" }),
        pb.list("rooms", { sort: "+sort" }),
        pb.list("workers", { sort: "+employee_code,+full_name" }),
        pb.list("stays", { sort: "-date_in" }),
        pb.list("electricities", { sort: "-month" }),
      ]);

      const staysByRoom = new Map();
      for (const s of staysData) {
        if (!staysByRoom.has(s.room_id)) staysByRoom.set(s.room_id, []);
        staysByRoom.get(s.room_id).push(stayOut(s));
      }

      const elecByRoom = new Map();
      for (const e of elecData) {
        if (!elecByRoom.has(e.room_id)) elecByRoom.set(e.room_id, []);
        elecByRoom.get(e.room_id).push(e);
      }

      const roomsByFloor = new Map();
      for (const r of roomsData) {
        if (!roomsByFloor.has(r.floor_id)) roomsByFloor.set(r.floor_id, []);
        roomsByFloor.get(r.floor_id).push({
          id: r.id,
          code: r.code,
          sort: r.sort,
          gender: r.gender || null,
          stays: staysByRoom.get(r.id) || [],
          electricity: elecByRoom.get(r.id) || [],
        });
      }

      const floors = floorsData.map((f) => ({
        id: f.id,
        name: f.name,
        sort: f.sort,
        rooms: roomsByFloor.get(f.id) || [],
      }));

      res.json({ floors, workers: workersData.map(workerOut) });
    } catch (err) {
      console.error("Load all PocketBase error:", err);
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  initKtx: async (req, res) => {
    try {
      const F = Number(req.body.floors);
      const R = Number(req.body.roomsPerFloor);
      const S = Number(req.body.startNo);

      if (!Number.isInteger(F) || F <= 0 || F > 100) return res.status(400).json({ error: "Số tầng không hợp lệ (1-100)." });
      if (!Number.isInteger(R) || R <= 0 || R > 300) return res.status(400).json({ error: "Số phòng/tầng không hợp lệ (1-300)." });
      if (!Number.isInteger(S) || S <= 0) return res.status(400).json({ error: "Số bắt đầu không hợp lệ." });

      const existing = await pb.first("floors");
      if (existing) return res.status(400).json({ error: "KTX đã có tầng/phòng. Hãy Reset DB trước khi khởi tạo lại." });

      for (let i = 0; i < F; i++) {
        const floor = await pb.request("floors", "", {
          method: "POST",
          body: JSON.stringify({ name: `Tầng ${i + 1}`, sort: i + 1 }),
        });
        for (let j = 0; j < R; j++) {
          await pb.request("rooms", "", {
            method: "POST",
            body: JSON.stringify({ floor_id: floor.id, code: String(S + i * R + j), sort: j + 1 }),
          });
        }
      }

      res.json({ message: "Initialized successfully" });
    } catch (err) {
      console.error("Init KTX PocketBase error:", err);
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  wipeDatabase: async (_req, res) => {
    try {
      for (const collection of [
        "general_notes",
        "payments",
        "water_records",
        "electricities",
        "stays",
        "workers",
        "rooms",
        "floors",
      ]) {
        try {
          await deleteAll(collection);
        } catch (err) {
          if (err.status !== 404) throw err;
        }
      }
      res.json({ message: "Database wiped successfully" });
    } catch (err) {
      console.error("Wipe PocketBase error:", err);
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};

module.exports = dataController;
