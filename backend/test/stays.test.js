const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
require("dotenv").config();

const APP_KEY = process.env.APPLICATION_KEY || "test-key";
const BASE_PORT = Number(process.env.TEST_PORT || 5050);
const BASE_URL = `http://127.0.0.1:${BASE_PORT}`;
const RUN_INTEGRATION = process.env.RUN_BACKEND_INTEGRATION === "1" && !!process.env.DATABASE_URL;
const INTEGRATION_SKIP = RUN_INTEGRATION
  ? false
  : "Set RUN_BACKEND_INTEGRATION=1 with DATABASE_URL and seeded PocketBase auth to run this integration test.";

function runInitDb() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["init-db.js"], {
      cwd: __dirname + "/..",
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString("utf8");
    });
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`init-db failed: ${code}\n${stderr}`));
    });
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["index.js"], {
      cwd: __dirname + "/..",
      env: {
        ...process.env,
        PORT: String(BASE_PORT),
        APPLICATION_KEY: APP_KEY,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("Server did not start in time"));
    }, 15000);

    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      if (text.includes("Server is running on port")) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(child);
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      if (!settled && text.toLowerCase().includes("error")) {
        clearTimeout(timeout);
        settled = true;
        child.kill();
        reject(new Error(text));
      }
    });

    child.on("exit", (code) => {
      if (settled) return;
      clearTimeout(timeout);
      settled = true;
      reject(new Error(`Server exited early: ${code}`));
    });
  });
}

async function fetchJson(path, { method = "GET", token, body } = {}) {
  const headers = { ApplicationKey: APP_KEY };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, json, text };
}

let server = null;
let token = null;

async function setupIntegration() {
  await runInitDb();
  server = await startServer();

  const loginRes = await fetchJson("/login/", {
    method: "POST",
    body: { username: "admin", password: "admin" },
  });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.json?.access_token);
  token = loginRes.json.access_token;

  const wipeRes = await fetchJson("/wipe-database/", {
    method: "POST",
    token,
    body: {},
  });
  assert.equal(wipeRes.status, 200);

  const initRes = await fetchJson("/init-ktx/", {
    method: "POST",
    token,
    body: { floors: 1, roomsPerFloor: 2, startNo: 101 },
  });
  assert.equal(initRes.status, 200);
}

test.after(() => {
  if (server) server.kill();
});

test("stays validation and load-all shape", { skip: INTEGRATION_SKIP }, async () => {
  await setupIntegration();

  const load0 = await fetchJson("/load-all/", { token });
  assert.equal(load0.status, 200);
  assert.equal(load0.json.floors.length, 1);
  assert.equal(load0.json.floors[0].rooms.length, 2);

  const roomId = load0.json.floors[0].rooms[0].id;
  assert.ok(roomId);

  const genderRes = await fetchJson(`/rooms/${roomId}/`, {
    method: "PATCH",
    token,
    body: { gender: "male" },
  });
  assert.equal(genderRes.status, 200);

  const loadAfterGender = await fetchJson("/load-all/", { token });
  assert.equal(loadAfterGender.status, 200);
  assert.equal(loadAfterGender.json.floors[0].rooms[0].gender, "male");

  const workerRes = await fetchJson("/workers/", {
    method: "POST",
    token,
    body: {
      employee_code: "NV_TEST_001",
      full_name: "Test Worker",
      phone: "0900000000",
    },
  });
  assert.equal(workerRes.status, 201);
  const workerId = workerRes.json.id;
  assert.ok(workerId);

  const byCode = await fetchJson("/workers/by-code/NV_TEST_001", { token });
  assert.equal(byCode.status, 200);
  assert.equal(byCode.json.employee_code, "NV_TEST_001");
  assert.equal(byCode.json.id, workerId);

  const dupCode = await fetchJson("/workers/", {
    method: "POST",
    token,
    body: { employee_code: "NV_TEST_001", full_name: "Other" },
  });
  assert.equal(dupCode.status, 409);

  const badStay = await fetchJson("/stays/", {
    method: "POST",
    token,
    body: {
      worker_id: workerId,
      room_id: roomId,
      date_in: "2026-04-10",
      date_out: "2026-04-01",
    },
  });
  assert.equal(badStay.status, 400);

  const historyStay = await fetchJson("/stays/", {
    method: "POST",
    token,
    body: {
      worker_id: workerId,
      room_id: roomId,
      date_in: "2026-04-01",
      date_out: "2026-04-05",
    },
  });
  assert.equal(historyStay.status, 201);
  assert.equal(historyStay.json.date_out, "2026-04-05");

  const activeStay = await fetchJson("/stays/", {
    method: "POST",
    token,
    body: {
      worker_id: workerId,
      room_id: roomId,
      date_in: "2026-04-06",
    },
  });
  assert.equal(activeStay.status, 201);
  assert.equal(activeStay.json.date_out, null);

  const dupActive = await fetchJson("/stays/", {
    method: "POST",
    token,
    body: {
      worker_id: workerId,
      room_id: roomId,
      date_in: "2026-04-07",
    },
  });
  assert.equal(dupActive.status, 409);

  const load1 = await fetchJson("/load-all/", { token });
  assert.equal(load1.status, 200);

  const room = load1.json.floors[0].rooms.find((r) => r.id === roomId);
  assert.ok(room);

  const current = room.stays.filter((s) => !s.dateOut);
  const history = room.stays.filter((s) => !!s.dateOut);
  assert.equal(current.length, 1);
  assert.equal(history.length, 1);
});
