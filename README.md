# EcoRide — Démo US12/US13

Prototype pour tester rapidement:

- Espace employé: modération des avis, incidents de covoiturage.
- Espace admin: création d'employés, métriques (covoiturages/jour, crédits/jour, total).

## Stack

- Backend: Node.js + Express
- SQLite via `sql.js` (WASM, sans build natif) — persistance fichier `server/data/ecoride.sqlite`
- NoSQL: NeDB (fichiers) — `server/data/credits.db` et `server/data/config.db`
- Front: pages statiques (Bootstrap + Chart.js) servies par Express

## Démarrage (Windows PowerShell)

```powershell
# 1) Installer et seed
cd "c:\Users\fnack.CTP\OneDrive - Iliad\Bureau\EcoRide\server"
npm install
npm run seed

# 2) Démarrer l'API
$env:PORT=3001
$env:JWT_SECRET="change-me"
npm run dev

# 3) Ouvrir l’UI dans le navigateur
# Racine sert l’index
http://localhost:3001/
# Accès direct aux pages
http://localhost:3001/admin.html
http://localhost:3001/employe.html
```

## Comptes de démo

- Admin: `admin@ecoride.local` / `admin123`
- Employé: `employe@ecoride.local` / `employe123`

## Endpoints principaux

- Auth: `POST /auth/login`
- Employé: `GET /employee/avis/pending`, `POST /employee/avis/:id/validate`, `POST /employee/avis/:id/reject`, `GET /employee/covoiturages/incidents`
- Admin: `POST /admin/users`, `PATCH /admin/users/:id/suspend`, `GET /admin/metrics/carpool-per-day`, `GET /admin/metrics/credits-per-day`, `GET /admin/metrics/credits-total`

## Notes

- Les fichiers de données sont sous `server/data/` (ignorés par Git).
- Si le port 3001 est occupé: libérer puis relancer.
- Pour servir le front séparément: `npx serve -l 5173` dans `web/` (optionnel).
