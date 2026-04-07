const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, "..", "db_schema.sql");
  const dbUrl = process.env.DATABASE_URL;

  // Phân tích URL để lấy thông tin kết nối cơ bản (kết nối tới database 'postgres' trước)
  const baseUrl = dbUrl.substring(0, dbUrl.lastIndexOf("/") + 1) + "postgres";
  const targetDb = dbUrl.substring(dbUrl.lastIndexOf("/") + 1);

  const client = new Client({ connectionString: baseUrl });

  try {
    console.log("--- KHỞI TẠO DATABASE KTX-MOBILE ---");
    await client.connect();

    // 1. Kiểm tra và tạo database nếu chưa có
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = '${targetDb}'`,
    );
    if (res.rowCount === 0) {
      console.log(`Đang tạo database "${targetDb}"...`);
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`✅ Đã tạo database "${targetDb}".`);
    } else {
      console.log(`Database "${targetDb}" đã tồn tại.`);
    }
    await client.end();

    // 2. Kết nối tới database mục tiêu để tạo bảng
    const targetClient = new Client({ connectionString: dbUrl });
    await targetClient.connect();

    console.log("Đang thực thi các lệnh SQL từ db_schema.sql...");
    const sql = fs.readFileSync(schemaPath, "utf8");
    await targetClient.query(sql);

    console.log("✅ Khởi tạo các bảng thành công!");
    await targetClient.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi khởi tạo database:");
    console.error(err.message);
    process.exit(1);
  }
}

initializeDatabase();
