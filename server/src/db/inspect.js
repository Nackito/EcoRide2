import { ensureDatabase, getDb } from "./sqlite.js";

await ensureDatabase();
const db = getDb();
const countUsers = db.prepare("SELECT COUNT(*) as c FROM utilisateurs").get();
console.log("Users count:", countUsers);
const countRoles = db.prepare("SELECT COUNT(*) as c FROM roles").get();
console.log("Roles count:", countRoles);
const listUsers = db
  .prepare("SELECT id, email, password_hash, suspended FROM utilisateurs")
  .all();
console.log("All users:", listUsers);
