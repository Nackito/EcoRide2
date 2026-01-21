import bcrypt from "bcryptjs";
import { ensureDatabase, getDb } from "./sqlite.js";

async function main() {
  const [, , emailArg, newPassArg] = process.argv;
  if (!emailArg || !newPassArg) {
    console.error("Usage: node src/db/reset_password.js <email> <newPassword>");
    process.exit(1);
  }
  await ensureDatabase();
  const db = getDb();
  const hash = bcrypt.hashSync(String(newPassArg), 10);
  const info = db
    .prepare(
      "UPDATE utilisateurs SET password_hash = ? WHERE lower(email) = lower(?)",
    )
    .run(hash, String(emailArg));
  if (info.changes > 0) {
    console.log(`Mot de passe réinitialisé pour ${emailArg}`);
  } else {
    console.log(`Aucun utilisateur trouvé pour ${emailArg}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
