import { execSync } from "child_process";

const PORT = 3000;

try {
  if (process.platform === "win32") {
    const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8" });
    if (output.includes("LISTENING")) {
      console.error(
        "\nERROR: Dev server is still running on port 3000.\n" +
          "Stop it first (Ctrl+C), then run npm run build.\n" +
          "Running build while dev is active corrupts the app.\n"
      );
      process.exit(1);
    }
  }
} catch {
  // port free
}
