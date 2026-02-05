import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../db/sqlite.js";

const router = Router();

// Inscription utilisateur (rôle: utilisateur)
router.post("/register", (req, res) => {
  const { email, password, pseudo } = req.body || {};
  if (!pseudo || !email || !password)
    return res
      .status(400)
      .json({ error: "pseudo, email and password required" });
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e));
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "invalid email format" });
  }
  const db = getDb();
  const emailNorm = String(email).trim().toLowerCase();
  const exists = db
    .prepare("SELECT id FROM utilisateurs WHERE lower(email) = ?")
    .get(emailNorm);
  if (exists) return res.status(400).json({ error: "email already exists" });
  const role = db
    .prepare("SELECT id FROM roles WHERE libelle = ?")
    .get("utilisateur");
  if (!role) return res.status(500).json({ error: "role not found" });
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare(
      "INSERT INTO utilisateurs (nom, prenom, email, password_hash, pseudo, role_id) VALUES (?,?,?,?,?,?)",
    )
    .run(null, null, emailNorm, hash, String(pseudo).trim(), role.id);
  return res.status(201).json({ id: info.lastInsertRowid, email: emailNorm });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });
  const db = getDb();
  const emailNorm = String(email).trim().toLowerCase();
  const user = db
    .prepare(
      `SELECT u.*, r.libelle as role FROM utilisateurs u JOIN roles r ON r.id = u.role_id WHERE lower(email) = ?`,
    )
    .get(emailNorm);
  if (!user)
    return res
      .status(401)
      .json({ error: "Invalid credentials: user-not-found" });
  if (user.suspended)
    return res.status(403).json({ error: "Account suspended" });
  const ok = bcrypt.compareSync(String(password), user.password_hash);
  if (!ok)
    return res
      .status(401)
      .json({ error: "Invalid credentials: wrong-password" });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "8h" },
  );
  res.json({
    token,
    role: user.role,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
    },
  });
});

export default router;
