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

// --- Auth Middleware (giống SmartNote) ---
const authMiddleware = (req, res, next) => {
  const appKey = req.headers["applicationkey"];
  const authHeader = req.headers["authorization"];

  // Lấy key từ env và loại bỏ dấu ngoặc kép nếu có
  const validKey = (process.env.APPLICATION_KEY || "")
    .replace(/['"]/g, "")
    .trim();

  // Kiểm tra Application Key
  if (appKey !== validKey) {
    console.warn(`⚠️ Unauthorized access attempt with key: ${appKey}`);
    return res
      .status(403)
      .json({ error: "Forbidden: Invalid Application Key" });
  }

  // Một số routes không cần token (như login)
  if (req.path === "/login/" || req.path === "/signup/") {
    return next();
  }

  // Kiểm tra Bearer Token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid token" });
  }

  // const token = authHeader.split(" ")[1];
  // Ở đây bạn sẽ verify token (JWT)

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
app.use("/", require("./routes/dataRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "KTX Mobile API is running" });
});

app.post("/login/", (req, res) => {
  const { username, password } = req.body;
  // Mock login thành công (giống cấu trúc SmartNote mong đợi)
  if (username === "admin" && password === "admin") {
    return res.json({
      access_token: "mock-jwt-token-for-ktx-mobile",
      expires_in: 3600,
      data: {
        username: "admin",
        full_name: "Quản trị viên",
        isAdmin: true,
      },
    });
  }
  res.status(400).json({ error: "Tài khoản hoặc mật khẩu không đúng" });
});

// --- Error Handler ---
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
