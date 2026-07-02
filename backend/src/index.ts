import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import authRoutes from "./routes/auth";
import automateRoutes from "./routes/automate";
import sessionsRoutes from "./routes/sessions";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

process.chdir(path.join(__dirname, ".."));

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/sessions", sessionsRoutes);
app.use("/", automateRoutes);

app.listen(port, () => {
  console.log(`Automation API running at http://localhost:${port}`);
});
