const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const VITE_PORT = Number(process.env.TEST_VITE_PORT || 5179);
const APP_URL = `http://localhost:${VITE_PORT}`;

function startVite() {
  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(__dirname, "..", "..");
    const viteBin = path.join(
      rootDir,
      "node_modules",
      "vite",
      "bin",
      "vite.js",
    );
    const child = spawn(
      process.execPath,
      [
        "--no-warnings",
        viteBin,
        "dev",
        "--port",
        String(VITE_PORT),
        "--strictPort",
      ],
      {
        cwd: rootDir,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(
        new Error(
          `Vite did not start in time.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
        ),
      );
    }, 30000);

    const optimisticReady = setTimeout(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ child, getLogs: () => ({ stdout, stderr }) });
    }, 1500);

    const onReady = () => {
      if (settled) return;
      settled = true;
      clearTimeout(optimisticReady);
      clearTimeout(timeout);
      resolve({ child, getLogs: () => ({ stdout, stderr }) });
    };

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      const ascii = stdout.replace(/[^\x20-\x7E]/g, "");
      const hasPort = ascii.includes(`:${VITE_PORT}/`);
      const hasLocalUrl =
        ascii.includes(`http://localhost:${VITE_PORT}/`) ||
        ascii.includes(`http://127.0.0.1:${VITE_PORT}/`);
      const hasReady = ascii.toLowerCase().includes("ready in");
      if ((hasReady && hasPort) || hasLocalUrl) {
        onReady();
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(optimisticReady);
      clearTimeout(timeout);
      reject(new Error(`Vite exited early: ${code}\n\nSTDERR:\n${stderr}`));
    });
  });
}

async function getOnce(url) {
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  return { status: res.status, text };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForVite(baseUrl) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/`, { method: "GET" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // ignore
    }
    await sleep(250);
  }
  throw new Error("Vite not reachable");
}

test(
  "Vite serves /src/App.jsx reliably (no 500 across 20 requests)",
  { timeout: 120000 },
  async () => {
    const { child, getLogs } = await startVite();
    try {
      await waitForVite(APP_URL);
      const urlBase = `${APP_URL}/src/App.jsx?t=`;

      for (let i = 0; i < 20; i++) {
        const { status, text } = await getOnce(
          urlBase + String(Date.now() + i),
        );
        assert.notEqual(
          status,
          500,
          `Got 500 at iteration ${i + 1}.\n\nVite logs:\n${JSON.stringify(getLogs(), null, 2)}\n\nBody:\n${text.slice(0, 1000)}`,
        );
        assert.equal(
          status,
          200,
          `Expected 200 at iteration ${i + 1}, got ${status}.\n\nVite logs:\n${JSON.stringify(getLogs(), null, 2)}\n\nBody:\n${text.slice(0, 1000)}`,
        );
      }
    } finally {
      child.kill();
    }
  },
);
