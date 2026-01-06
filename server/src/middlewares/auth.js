import jwt from "jsonwebtoken";
import { getDb } from "../db/sqlite.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== roleName)
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

export function notSuspended(req, res, next) {
  const db = getDb();
  const user = db
    .prepare("SELECT suspended FROM utilisateurs WHERE id = ?")
    .get(req.user.id);
  if (user && user.suspended)
    return res.status(403).json({ error: "Account suspended" });
  next();
}
