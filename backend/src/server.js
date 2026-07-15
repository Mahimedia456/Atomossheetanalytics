import "dotenv/config";

import app from "./index.js";

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, () => {
  console.log(`Atomos API running on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));