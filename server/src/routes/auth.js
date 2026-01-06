import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../db/sqlite.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });
  const db = getDb();
  const user = db
    .prepare(
      `SELECT u.*, r.libelle as role FROM utilisateurs u JOIN roles r ON r.id = u.role_id WHERE email = ?`
    )
    .get(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: "Invalid credentials" });
  if (user.suspended)
    return res.status(403).json({ error: "Account suspended" });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "8h" }
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
