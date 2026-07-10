import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import satisfactionRoutes from "./routes/satisfactionRoutes.js";
import aiSatisfactionRoutes from "./routes/aiSatisfactionRoutes.js";
import rmaRoutes from "./routes/rmaRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";



const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use("/api/tickets", ticketRoutes);

app.use("/api/satisfaction", satisfactionRoutes);
app.use("/api/ai/satisfaction", aiSatisfactionRoutes);
app.use("/api/rma", rmaRoutes);
app.use("/api/social", socialRoutes);
app.use(
  "/api/agents",
  agentRoutes
);
app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Atomos Zendesk Analytics API",
  });
});

app.use("/api/auth", authRoutes);

export default app;