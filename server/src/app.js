import cors from "cors";
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { ensureDatabase } from "./db/sqlite.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import employeeRouter from "./routes/employee.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

await ensureDatabase();

app.get("/", (req, res) => {
  res.json({ ok: true, name: "EcoRide API", version: "0.1.0" });
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/employee", employeeRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EcoRide API listening on http://localhost:${PORT}`);
});
