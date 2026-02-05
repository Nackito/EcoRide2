import { Router } from "express";
import { recordDailyCredit } from "../db/nosql.js";
import { getDb } from "../db/sqlite.js";
import {
  authRequired,
  notSuspended,
  requireRole,
} from "../middlewares/auth.js";

const router = Router();
router.use(authRequired, notSuspended, requireRole("utilisateur"));

function ensureUserRow(db, table, utilisateur_id, defaults = {}) {
  const row = db
    .prepare(`SELECT * FROM ${table} WHERE utilisateur_id = ?`)
    .get(utilisateur_id);
  if (!row) {
    const cols = Object.keys(defaults);
    const vals = cols.map((k) => defaults[k]);
    const placeholders = cols.map(() => "?").join(",");
    db.prepare(
      `INSERT INTO ${table} (utilisateur_id, ${cols.join(",")}) VALUES (?, ${placeholders})`,
    ).run(utilisateur_id, ...vals);
    return db
      .prepare(`SELECT * FROM ${table} WHERE utilisateur_id = ?`)
      .get(utilisateur_id);
  }
  return row;
}

// US8: Modes utilisateur (driver/passenger)
router.get("/modes", (req, res) => {
  const db = getDb();
  const row = ensureUserRow(db, "user_modes", req.user.id, {
    is_driver: 0,
    is_passenger: 0,
  });
  res.json(row);
});

router.put("/modes", (req, res) => {
  const { is_driver = 0, is_passenger = 0 } = req.body || {};
  const db = getDb();
  ensureUserRow(db, "user_modes", req.user.id, {
    is_driver: 0,
    is_passenger: 0,
  });
  db.prepare(
    "UPDATE user_modes SET is_driver = ?, is_passenger = ? WHERE utilisateur_id = ?",
  ).run(Number(is_driver ? 1 : 0), Number(is_passenger ? 1 : 0), req.user.id);
  res.json({ ok: true });
});

// US8: Préférences
router.get("/preferences", (req, res) => {
  const db = getDb();
  const row = ensureUserRow(db, "preferences", req.user.id, {
    smoker_allowed: 0,
    pets_allowed: 0,
    extra: "",
  });
  res.json(row);
});

router.put("/preferences", (req, res) => {
  const { smoker_allowed = 0, pets_allowed = 0, extra = "" } = req.body || {};
  const db = getDb();
  ensureUserRow(db, "preferences", req.user.id, {
    smoker_allowed: 0,
    pets_allowed: 0,
    extra: "",
  });
  db.prepare(
    "UPDATE preferences SET smoker_allowed = ?, pets_allowed = ?, extra = ? WHERE utilisateur_id = ?",
  ).run(
    Number(!!smoker_allowed),
    Number(!!pets_allowed),
    String(extra || ""),
    req.user.id,
  );
  res.json({ ok: true });
});

// US8: Véhicules (CRUD minimal)
router.get("/vehicles", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM vehicules WHERE utilisateur_id = ? ORDER BY id DESC",
    )
    .all(req.user.id);
  res.json(rows);
});

router.post("/vehicles", (req, res) => {
  const {
    plaque,
    date_immatriculation = null,
    marque = null,
    modele = null,
    couleur = null,
  } = req.body || {};
  if (!plaque) return res.status(400).json({ error: "plaque required" });
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO vehicules (utilisateur_id, plaque, date_immatriculation, marque, modele, couleur) VALUES (?,?,?,?,?,?)",
    )
    .run(
      req.user.id,
      String(plaque),
      date_immatriculation,
      marque,
      modele,
      couleur,
    );
  res.json({ id: info.lastInsertRowid });
});

// US9: Créer un covoiturage (driver)
router.post("/trips", (req, res) => {
  const {
    date_depart,
    heure_depart,
    lieu_depart,
    date_arrivee,
    heure_arrivee,
    lieu_arrivee,
    nb_place,
    prix_personne,
    vehicule_id,
  } = req.body || {};
  if (
    !date_depart ||
    !heure_depart ||
    !lieu_depart ||
    !date_arrivee ||
    !heure_arrivee ||
    !lieu_arrivee ||
    !nb_place ||
    !prix_personne ||
    !vehicule_id
  ) {
    return res.status(400).json({ error: "missing fields" });
  }
  const db = getDb();
  const ins = db
    .prepare(
      "INSERT INTO covoiturages (date_depart, heure_depart, lieu_depart, date_arrivee, heure_arrivee, lieu_arrivee, statut, nb_place, prix_personne) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .run(
      date_depart,
      heure_depart,
      lieu_depart,
      date_arrivee,
      heure_arrivee,
      lieu_arrivee,
      "planned",
      Number(nb_place),
      Number(prix_personne),
    );
  const tripId = ins.lastInsertRowid;
  db.prepare(
    "INSERT INTO participations (covoiturage_id, utilisateur_id, role) VALUES (?,?,?)",
  ).run(tripId, req.user.id, "driver");
  db.prepare(
    "INSERT INTO covoiturage_vehicule (covoiturage_id, vehicule_id) VALUES (?,?)",
  ).run(tripId, Number(vehicule_id));
  // Prélèvement plateforme: 2 crédits
  const todayISO = new Date().toISOString();
  recordDailyCredit(todayISO, -2).catch(() => {});
  res.json({ id: tripId });
});

// US10: Historique (driver/passenger)
router.get("/trips/history", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT c.*, p.role
    FROM covoiturages c
    JOIN participations p ON p.covoiturage_id = c.id
    WHERE p.utilisateur_id = ?
    ORDER BY c.date_depart DESC, c.heure_depart DESC
  `,
    )
    .all(req.user.id);
  res.json(rows);
});

// US10: Annuler (driver/passenger)
router.post("/trips/:id/cancel", (req, res) => {
  const db = getDb();
  const part = db
    .prepare(
      "SELECT role FROM participations WHERE covoiturage_id = ? AND utilisateur_id = ?",
    )
    .get(req.params.id, req.user.id);
  if (!part) return res.status(404).json({ error: "not-participant" });
  if (part.role === "driver") {
    db.prepare("UPDATE covoiturages SET statut = 'cancelled' WHERE id = ?").run(
      req.params.id,
    );
    // TODO: envoyer mail aux participants (demo: console)
    console.log(
      "[MAIL] Chauffeur annule, prévenir participants du covoiturage",
      req.params.id,
    );
  } else {
    db.prepare(
      "DELETE FROM participations WHERE covoiturage_id = ? AND utilisateur_id = ?",
    ).run(req.params.id, req.user.id);
  }
  res.json({ ok: true });
});

// US11: Démarrer / Arriver (driver)
router.post("/trips/:id/start", (req, res) => {
  const db = getDb();
  const part = db
    .prepare(
      "SELECT role FROM participations WHERE covoiturage_id = ? AND utilisateur_id = ?",
    )
    .get(req.params.id, req.user.id);
  if (!part || part.role !== "driver")
    return res.status(403).json({ error: "not-driver" });
  db.prepare("UPDATE covoiturages SET statut = 'ongoing' WHERE id = ?").run(
    req.params.id,
  );
  res.json({ ok: true });
});

router.post("/trips/:id/finish", (req, res) => {
  const db = getDb();
  const part = db
    .prepare(
      "SELECT role FROM participations WHERE covoiturage_id = ? AND utilisateur_id = ?",
    )
    .get(req.params.id, req.user.id);
  if (!part || part.role !== "driver")
    return res.status(403).json({ error: "not-driver" });
  db.prepare("UPDATE covoiturages SET statut = 'ok' WHERE id = ?").run(
    req.params.id,
  );
  // Créer avis pending pour tous les passagers
  const passengers = db
    .prepare(
      "SELECT utilisateur_id FROM participations WHERE covoiturage_id = ? AND role = 'passenger'",
    )
    .all(req.params.id);
  for (const row of passengers) {
    db.prepare(
      "INSERT INTO avis (auteur_id, cible_id, commentaire, note, statut) VALUES (?,?,?,?,?)",
    ).run(row.utilisateur_id, req.user.id, null, null, "pending");
  }
  res.json({ ok: true });
});

export default router;
// Profil utilisateur: lecture et mise à jour nom/prenom
router.get("/profile", (req, res) => {
  const db = getDb();
  const u = db
    .prepare(
      "SELECT id, email, pseudo, nom, prenom FROM utilisateurs WHERE id = ?",
    )
    .get(req.user.id);
  if (!u) return res.status(404).json({ error: "user-not-found" });
  res.json(u);
});

router.put("/profile", (req, res) => {
  const { nom = null, prenom = null } = req.body || {};
  const db = getDb();
  db.prepare("UPDATE utilisateurs SET nom = ?, prenom = ? WHERE id = ?").run(
    nom,
    prenom,
    req.user.id,
  );
  res.json({ ok: true });
});
