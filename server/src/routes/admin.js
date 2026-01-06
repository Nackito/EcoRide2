import bcrypt from "bcryptjs";
import { Router } from "express";
import { creditsStore } from "../db/nosql.js";
import { getDb } from "../db/sqlite.js";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(authRequired, requireRole("admin"));

router.post("/users", (req, res) => {
  const { nom, prenom, email, password, role = "employe" } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });
  const db = getDb();
  const roleRow = db
    .prepare("SELECT id FROM roles WHERE libelle = ?")
    .get(role);
  if (!roleRow) return res.status(400).json({ error: "invalid role" });
  try {
    const stmt = db.prepare(
      `INSERT INTO utilisateurs (nom, prenom, email, password_hash, role_id) VALUES (?,?,?,?,?)`
    );
    const info = stmt.run(
      nom || null,
      prenom || null,
      email,
      bcrypt.hashSync(password, 10),
      roleRow.id
    );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "email already exists" });
  }
});

router.patch("/users/:id/suspend", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { suspended } = req.body;
  const info = db
    .prepare("UPDATE utilisateurs SET suspended = ? WHERE id = ?")
    .run(suspended ? 1 : 0, id);
  res.json({ updated: info.changes });
});

router.get("/metrics/carpool-per-day", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT date_depart AS day, COUNT(*) as count
    FROM covoiturages
    GROUP BY day
    ORDER BY day ASC
  `
    )
    .all();
  res.json(rows);
});

router.get("/metrics/credits-per-day", async (req, res) => {
  const docs = await creditsStore.find({}).sort({ day: 1 });
  res.json(docs);
});

router.get("/metrics/credits-total", async (req, res) => {
  const docs = await creditsStore.find({});
  const total = docs.reduce((s, d) => s + (d.amount || 0), 0);
  res.json({ total });
});

export default router;
