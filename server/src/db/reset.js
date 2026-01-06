import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

if (fs.existsSync(DATA_DIR)) {
  for (const f of fs.readdirSync(DATA_DIR)) {
    fs.unlinkSync(path.join(DATA_DIR, f));
  }
  console.log("Data directory cleared:", DATA_DIR);
} else {
  console.log("No data directory to clear");
}
