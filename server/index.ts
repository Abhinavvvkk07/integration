import 'dotenv/config'
import { spawn } from "child_process";
import * as path from "path";

const getPythonPath = () => {
  const venvPath = path.resolve(process.cwd(), ".venv/bin/python3");
  const fs = require('fs');
  if (fs.existsSync(venvPath)) {
    return venvPath;
  }
  return "python3"; // Fallback to system path
};

const pythonServer = spawn(getPythonPath(), [path.resolve(process.cwd(), "server_py", "main.py")], {
  stdio: "inherit",
  env: process.env,
});

pythonServer.on("error", (err) => {
  console.error("Failed to start Python server:", err);
  process.exit(1);
});

pythonServer.on("close", (code) => {
  console.log(`Python server exited with code ${code}`);
  process.exit(code || 0);
});

process.on("SIGTERM", () => pythonServer.kill("SIGTERM"));
process.on("SIGINT", () => pythonServer.kill("SIGINT"));
