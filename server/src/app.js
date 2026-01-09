import cors from "cors";
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDatabase } from "./db/sqlite.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import employeeRouter from "./routes/employee.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

await ensureDatabase();

// Servir les dossiers statiques: web (back-office) et public (site vitrine)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "../../web");
const publicDir = path.resolve(__dirname, "../../public");

// Back-office sous /app
app.use("/app", express.static(webDir));

// Site vitrine à la racine
app.use(express.static(publicDir));

// Favicon par défaut: rediriger /favicon.ico vers le favicon du web
app.get("/favicon.ico", (req, res) => {
  res.redirect("/favicon.svg");
});

// Route racine: servir explicitement l'index du front
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/employee", employeeRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EcoRide API listening on http://localhost:${PORT}`);
});
