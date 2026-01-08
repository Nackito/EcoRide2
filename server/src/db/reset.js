import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

if (fs.existsSync(DATA_DIR)) {
  for (const f of fs.readdirSync(DATA_DIR)) {
    // Ne pas supprimer les fichiers de contrôle Git (ex: .gitignore)
    if (f === ".gitignore" || f.startsWith(".")) continue;
    const full = path.join(DATA_DIR, f);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        // supprimer récursivement un dossier
        fs.rmSync(full, { recursive: true, force: true });
      } else {
        fs.unlinkSync(full);
      }
    } catch (e) {
      console.warn("Skip deletion error for", full, e.message);
    }
  }
  console.log("Data directory cleared (excluding .gitignore):", DATA_DIR);
} else {
  console.log("No data directory to clear");
}
