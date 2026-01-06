import { Router } from "express";
import { getDb } from "../db/sqlite.js";
import {
  authRequired,
  notSuspended,
  requireRole,
} from "../middlewares/auth.js";

const router = Router();
router.use(authRequired, requireRole("employe"), notSuspended);

// Lister avis en attente
router.get("/avis/pending", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT a.id, a.commentaire, a.note, a.created_at, u.pseudo as auteur_pseudo, u.email as auteur_email
    FROM avis a JOIN utilisateurs u ON u.id = a.auteur_id
    WHERE a.statut = 'pending'
    ORDER BY a.created_at ASC
  `
    )
    .all();
  res.json(rows);
});

// Valider un avis
router.post("/avis/:id/validate", (req, res) => {
  const db = getDb();
  const info = db
    .prepare(`UPDATE avis SET statut = 'approved' WHERE id = ?`)
    .run(req.params.id);
  res.json({ updated: info.changes });
});

// Refuser un avis
router.post("/avis/:id/reject", (req, res) => {
  const db = getDb();
  const info = db
    .prepare(`UPDATE avis SET statut = 'rejected' WHERE id = ?`)
    .run(req.params.id);
  res.json({ updated: info.changes });
});

// Covoiturages qui se sont mal passés (statut != 'ok')
router.get("/covoiturages/incidents", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT c.id, c.date_depart, c.heure_depart, c.lieu_depart, c.date_arrivee, c.heure_arrivee, c.lieu_arrivee, c.statut,
           d.pseudo as driver_pseudo, d.email as driver_email
    FROM covoiturages c
    LEFT JOIN participations p ON p.covoiturage_id = c.id AND p.role = 'driver'
    LEFT JOIN utilisateurs d ON d.id = p.utilisateur_id
    WHERE c.statut IS NOT 'ok'
    ORDER BY c.date_depart ASC
  `
    )
    .all();
  res.json(rows);
});

export default router;
