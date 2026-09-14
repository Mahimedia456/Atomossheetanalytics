const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

function remove(target) {
  const full = path.join(root, target);
  if (fs.existsSync(full)) {
    console.log(`Removing ${target}...`);
    fs.rmSync(full, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 500,
    });
  }
}

remove("node_modules");
remove("package-lock.json");

console.log("Installing pinned Expo SDK 57 dependencies...");
const command =
  process.platform === "win32"
    ? "npm.cmd"
    : "npm";

const result = spawnSync(
  command,
  ["install"],
  {
    cwd: root,
    stdio: "inherit",
    shell: false,
  },
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log("Clean install completed.");
