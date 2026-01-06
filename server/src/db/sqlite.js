import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.resolve(__dirname, "../../data");
const DB_PATH = path.join(DB_DIR, "ecoride.sqlite");

let SQL; // sql.js module
let _db; // sql.js Database instance

async function loadSql() {
  if (!SQL) SQL = await initSqlJs({});
  return SQL;
}

async function loadDatabase() {
  await loadSql();
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (_db) return _db;
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(filebuffer);
  } else {
    _db = new SQL.Database();
  }
  return _db;
}

function saveDatabase() {
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function rowFrom(stmt) {
  const cols = stmt.getColumnNames();
  const row = stmt.getAsObject();
  if (Object.keys(row).length === 0) return undefined;
  return row;
}

function allRows(stmt) {
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  return rows;
}

export function getDb() {
  // Return a lightweight shim compatible with better-sqlite3 prepare().get/all/run
  return {
    prepare(sql) {
      return {
        get: (...params) => {
          const stmt = _db.prepare(sql);
          stmt.bind(params);
          const has = stmt.step();
          const result = has ? stmt.getAsObject() : undefined;
          stmt.free();
          return result;
        },
        all: (...params) => {
          const stmt = _db.prepare(sql);
          stmt.bind(params);
          const rows = allRows(stmt);
          stmt.free();
          return rows;
        },
        run: (...params) => {
          const stmt = _db.prepare(sql);
          stmt.bind(params);
          stmt.step();
          stmt.free();
          // try to fetch last insert id if relevant
          let lastId;
          try {
            const r = _db.exec("SELECT last_insert_rowid() AS id");
            lastId =
              r && r[0] && r[0].values && r[0].values[0]
                ? r[0].values[0][0]
                : undefined;
          } catch {}
          saveDatabase();
          return { lastInsertRowid: lastId, changes: 1 };
        },
      };
    },
    exec(sql) {
      _db.exec(sql);
      saveDatabase();
    },
  };
}

export async function ensureDatabase() {
  await loadDatabase();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      libelle TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT,
      prenom TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      telephone TEXT,
      adresse TEXT,
      date_naissance TEXT,
      photo BLOB,
      pseudo TEXT,
      role_id INTEGER NOT NULL,
      suspended INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS covoiturages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_depart TEXT,
      heure_depart TEXT,
      lieu_depart TEXT,
      date_arrivee TEXT,
      heure_arrivee TEXT,
      lieu_arrivee TEXT,
      statut TEXT DEFAULT 'ok',
      nb_place INTEGER,
      prix_personne REAL
    );

    CREATE TABLE IF NOT EXISTS participations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      covoiturage_id INTEGER NOT NULL,
      utilisateur_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('driver','passenger')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auteur_id INTEGER NOT NULL,
      cible_id INTEGER NOT NULL,
      commentaire TEXT,
      note INTEGER,
      statut TEXT CHECK(statut IN ('pending','approved','rejected')) DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const rolesCount = (
    db.prepare("SELECT COUNT(*) as c FROM roles").get() || { c: 0 }
  ).c;
  if (!rolesCount) {
    db.prepare("INSERT INTO roles (libelle) VALUES (?)").run("admin");
    db.prepare("INSERT INTO roles (libelle) VALUES (?)").run("employe");
    db.prepare("INSERT INTO roles (libelle) VALUES (?)").run("utilisateur");
  }
}
