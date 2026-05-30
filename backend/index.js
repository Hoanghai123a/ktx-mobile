require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;

// Log ngay lập tức khi có yêu cầu đến
app.use((req, res, next) => {
  console.log(
    `📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`,
  );
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const authMiddleware = (req, res, next) => {
  const appKey = req.headers["applicationkey"];
  const authHeader = req.headers["authorization"];

  // 1. Kiểm tra Application Key (Bắt buộc cho mọi request từ App)
  const validKey = (process.env.APPLICATION_KEY || process.env.VITE_KEY || "")
    .replace(/['"]/g, "")
    .trim();
  if (appKey !== validKey) {
    console.warn(`⚠️ Sai Application Key từ: ${req.ip}`);
    return res
      .status(403)
      .json({ error: "Forbidden: Invalid Application Key" });
  }

  // 2. CHO PHÉP ĐI QUA: Nếu là lệnh LẤY dữ liệu (GET) hoặc lệnh kiểm tra của trình duyệt (OPTIONS)
  if (req.method === "GET" || req.method === "OPTIONS") {
    return next();
  }

  // 3. Cho phép các route login/signup đi qua (POST nhưng không cần token)
  if (req.path === "/login/" || req.path === "/register/" || req.path === "/signup/") {
    return next();
  }

  // 4. KIỂM TRA TOKEN: Chỉ áp dụng cho các lệnh thay đổi dữ liệu (POST, PUT, DELETE)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error(`❌ Chặn thao tác ${req.method} do thiếu Token`);
    return res
      .status(401)
      .json({ error: "Bạn cần đăng nhập để thực hiện thao tác này" });
  }

  next();
};

app.use(authMiddleware);

// --- Routes ---
app.use("/workers", require("./routes/workerRoutes"));
app.use("/rooms", require("./routes/roomRoutes"));
app.use("/floors", require("./routes/floorRoutes"));
app.use("/stays", require("./routes/stayRoutes"));
app.use("/electricities", require("./routes/electricityRoutes"));
app.use("/settings", require("./routes/settingsRoutes"));
app.use("/notes", require("./routes/noteRoutes"));
app.use("/", require("./routes/authRoutes"));
app.use("/", require("./routes/dataRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "KTX Mobile API is running", database: "PocketBase" });
});


// --- Error Handler ---
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
