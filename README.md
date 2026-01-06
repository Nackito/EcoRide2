# EcoRide (démo US12/US13)

Petit prototype pour couvrir les User Stories:

- Espace employé: modération des avis; liste des covoiturages "incident".
- Espace admin: création d'employés; métriques (covoiturages/jour, crédits/jour, total).

Stack:

- Backend: Node.js + Express
- Base relationnelle: SQLite (better-sqlite3)
- Base NoSQL: NeDB (fichier) pour les crédits/jour et configuration
- Front: pages statiques Bootstrap + Chart.js

## Démarrage (Windows PowerShell)

```powershell
cd "c:\Users\fnack.CTP\OneDrive - Iliad\Bureau\EcoRide\server"
$env:PORT=3001; $env:JWT_SECRET="change-me"
npm install
npm run seed
npm run dev
```

Ouvrir ensuite les pages statiques dans un serveur local (ou double-clic) :

- web/index.html pour se connecter
- admin: admin@ecoride.local / admin123
- employé: employe@ecoride.local / employe123

## Endpoints principaux

- POST /auth/login
- GET /employee/avis/pending, POST /employee/avis/:id/validate, POST /employee/avis/:id/reject
- GET /employee/covoiturages/incidents
- POST /admin/users, PATCH /admin/users/:id/suspend
- GET /admin/metrics/carpool-per-day, /admin/metrics/credits-per-day, /admin/metrics/credits-total

## Notes

- La persistance NoSQL (NeDB) stocke `credits.db`. Un hook de calcul automatique des crédits à partir des covoiturages peut être ajouté ensuite.
- SQLite peut être migrée vers MySQL/PostgreSQL.
