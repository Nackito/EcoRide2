import fs from "fs";
import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const configStore = Datastore.create({
  filename: path.join(DATA_DIR, "config.db"),
  autoload: true,
});
export const creditsStore = Datastore.create({
  filename: path.join(DATA_DIR, "credits.db"),
  autoload: true,
});

export async function recordDailyCredit(dateISO, amount) {
  const day = dateISO.slice(0, 10);
  const existing = await creditsStore.findOne({ day });
  if (existing) {
    await creditsStore.update(
      { day },
      { $set: { day }, $inc: { amount } },
      { upsert: true }
    );
  } else {
    await creditsStore.insert({ day, amount });
  }
}
