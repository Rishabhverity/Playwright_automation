import { rmSync } from "fs";
import { execSync, spawn } from "child_process";

const PORT = 3000;

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
      });
      const pids = new Set();

      for (const line of output.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }

      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
    }
  } catch {
    // port not in use
  }
}

console.log("Stopping any old dev server…");
killPort(PORT);

console.log("Clearing .next cache…");
try {
  rmSync(".next", { recursive: true, force: true });
} catch {
  // ignore
}

console.log("Starting Next.js dev server…");
const child = spawn("next", ["dev", "-p", String(PORT)], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
