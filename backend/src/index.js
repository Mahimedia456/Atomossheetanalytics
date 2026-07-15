import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import agentRoutes from "./routes/agentRoutes.js";
import aiSatisfactionRoutes from "./routes/aiSatisfactionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import globalRmaRoutes from "./routes/globalRmaRoutes.js";
import rmaRoutes from "./routes/rmaRoutes.js";
import satisfactionRoutes from "./routes/satisfactionRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";

const app = express();

const allowedOrigins = String(
  process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Postman, server-to-server requests and same-origin requests
    // may not include an Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    name: "Atomos Data Analytics API",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "Atomos Data Analytics API",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/satisfaction", satisfactionRoutes);
app.use("/api/ai/satisfaction", aiSatisfactionRoutes);
app.use("/api/rma", rmaRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/global-rma", globalRmaRoutes);
app.use("/api/agents", agentRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "API route not found.",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((error, req, res, next) => {
  console.error("API Error:", error);

  if (error.message?.startsWith("CORS blocked origin:")) {
    res.status(403).json({
      ok: false,
      message: error.message,
    });
    return;
  }

  res.status(error.status || error.statusCode || 500).json({
    ok: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : error.message || "Internal server error.",
  });
});

export default app;