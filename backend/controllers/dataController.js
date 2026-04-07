const db = require("../config/db");

const dataController = {
  loadAll: async (req, res) => {
    try {
      // 1. Lấy tất cả tầng
      const floorsRes = await db.query(
        "SELECT * FROM floors ORDER BY sort ASC",
      );
      const floorsData = floorsRes.rows;

      // 2. Lấy tất cả phòng
      const roomsRes = await db.query("SELECT * FROM rooms ORDER BY sort ASC");
      const roomsData = roomsRes.rows;

      // 3. Lấy tất cả NLĐ
      const workersRes = await db.query(
        "SELECT * FROM workers ORDER BY full_name ASC",
      );
      const workersData = workersRes.rows;

      // 4. Lấy tất cả lượt ở (stays)
      const staysRes = await db.query(
        "SELECT * FROM stays ORDER BY date_in DESC",
      );
      const staysData = staysRes.rows;

      // 5. Lấy tất cả bản ghi điện (electricities)
      const elecRes = await db.query(
        "SELECT * FROM electricities ORDER BY month DESC",
      );
      const elecData = elecRes.rows;

      // Tổ chức lại dữ liệu theo cấu trúc App.jsx mong đợi
      const roomsByFloor = new Map();
      roomsData.forEach((r) => {
        if (!roomsByFloor.has(r.floor_id)) roomsByFloor.set(r.floor_id, []);
        roomsByFloor.get(r.floor_id).push({
          id: r.id,
          code: r.code,
          sort: r.sort,
          stays: staysData
            .filter((s) => s.room_id === r.id)
            .map((s) => ({
              id: s.id,
              workerId: s.worker_id,
              roomId: s.room_id,
              dateIn: s.date_in,
              dateOut: s.date_out,
            })),
          electricity: elecData.filter((e) => e.room_id === r.id),
        });
      });

      const formattedFloors = floorsData.map((f) => ({
        id: f.id,
        name: f.name,
        sort: f.sort,
        rooms: roomsByFloor.get(f.id) || [],
      }));

      const formattedWorkers = workersData.map((w) => ({
        id: w.id,
        fullName: w.full_name,
        hometown: w.hometown || "",
        recruiter: w.recruiter || "",
        dob: w.dob || "",
        phone: w.phone || "",
        note: w.note || "",
      }));

      res.json({
        floors: formattedFloors,
        workers: formattedWorkers,
      });
    } catch (err) {
      console.error("Load all error:", err);
      res.status(500).json({ error: err.message });
    }
  },

  initKtx: async (req, res) => {
    try {
      const { floors, roomsPerFloor, startNo } = req.body;
      const F = Number(floors);
      const R = Number(roomsPerFloor);
      const S = Number(startNo);

      console.log(`🏗️ Bắt đầu khởi tạo KTX: ${F} tầng, ${R} phòng/tầng, bắt đầu từ ${S}`);

      if (!Number.isInteger(F) || F <= 0 || F > 100)
        return res.status(400).json({ error: "Số tầng không hợp lệ (1-100)." });
      if (!Number.isInteger(R) || R <= 0 || R > 300)
        return res.status(400).json({ error: "Số phòng/tầng không hợp lệ (1-300)." });
      if (!Number.isInteger(S) || S <= 0)
        return res.status(400).json({ error: "Số bắt đầu không hợp lệ." });

      // Kiểm tra xem đã có dữ liệu chưa
      const checkRes = await db.query("SELECT id FROM floors LIMIT 1");
      if (checkRes.rowCount > 0) {
        return res.status(400).json({ error: "KTX đã có tầng/phòng. Hãy Reset DB trước khi khởi tạo lại." });
      }

      await db.query("BEGIN");

      // Tạo các tầng
      const floorIds = [];
      for (let i = 0; i < F; i++) {
        const name = `Tầng ${i + 1}`;
        const sort = i + 1;
        const insFloor = await db.query(
          "INSERT INTO floors (name, sort) VALUES ($1, $2) RETURNING id",
          [name, sort]
        );
        floorIds.push(insFloor.rows[0].id);
      }
      console.log(`✅ Đã tạo ${F} tầng.`);

      // Tạo các phòng
      let roomCount = 0;
      for (let i = 0; i < F; i++) {
        const floorId = floorIds[i];
        for (let j = 0; j < R; j++) {
          const code = String(S + (i * R) + j);
          const sort = j + 1;
          await db.query(
            "INSERT INTO rooms (floor_id, code, sort) VALUES ($1, $2, $3)",
            [floorId, code, sort]
          );
          roomCount++;
        }
      }
      console.log(`✅ Đã tạo ${roomCount} phòng.`);

      await db.query("COMMIT");
      console.log("🎉 Khởi tạo cấu trúc KTX hoàn tất!");
      res.json({ message: "Initialized successfully" });
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("❌ Lỗi Init KTX:", err.message);
      res.status(500).json({ error: err.message });
    }
  },

  wipeDatabase: async (req, res) => {
    try {
      console.log("🧹 Đang xóa sạch dữ liệu database...");
      await db.query("BEGIN");
      // Xóa theo thứ tự để tránh lỗi khóa ngoại (Foreign Key)
      await db.query("DELETE FROM general_notes");
      await db.query("DELETE FROM payments");
      await db.query("DELETE FROM water_records");
      await db.query("DELETE FROM electricities");
      await db.query("DELETE FROM stays");
      await db.query("DELETE FROM workers");
      await db.query("DELETE FROM rooms");
      await db.query("DELETE FROM floors");
      await db.query("COMMIT");
      console.log("✅ Đã xóa sạch dữ liệu.");
      res.json({ message: "Database wiped successfully" });
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("❌ Lỗi Reset Database:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = dataController;
