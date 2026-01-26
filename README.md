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
http://localhost:3001/app/admin.html
http://localhost:3001/app/employe.html
http://localhost:3001/app/user.html
```

## Comptes de démo

- Admin: `admin@ecoride.local` / `admin123`
- Employé: `employe@ecoride.local` / `employe123`
- Utilisateur: `user@ecoride.local` / `user123`

## Endpoints principaux

- Auth: `POST /auth/login`
- Auth: `POST /auth/register` (inscription), `POST /auth/login`
- Employé: `GET /employee/avis/pending`, `POST /employee/avis/:id/validate`, `POST /employee/avis/:id/reject`, `GET /employee/covoiturages/incidents`
- Admin: `POST /admin/users`, `PATCH /admin/users/:id/suspend`, `GET /admin/metrics/carpool-per-day`, `GET /admin/metrics/credits-per-day`, `GET /admin/metrics/credits-total`
- Utilisateur (US8-11): `GET /user/modes`, `PUT /user/modes`, `GET /user/preferences`, `PUT /user/preferences`, `GET /user/vehicles`, `POST /user/vehicles`, `POST /user/trips`, `GET /user/trips/history`, `POST /user/trips/:id/start`, `POST /user/trips/:id/finish`, `POST /user/trips/:id/cancel`

## Notes

- Les fichiers de données sont sous `server/data/` (ignorés par Git).
- Si le port 3001 est occupé: libérer puis relancer.
- Pour servir le front séparément: `npx serve -l 5173` dans `web/` (optionnel).

## Déploiement

### Prérequis

- Node.js LTS (>= 18)
- PowerShell
- Droits d’écriture sur `server/data/`

### Variables d’environnement

- `PORT` (par défaut: 3001; fallback: 3002 via script dev)
- `JWT_SECRET` (obligatoire en production)

### Installation

```powershell
cd "c:\Users\fnack.CTP\OneDrive - Iliad\Bureau\EcoRide\server"
npm ci
```

### Initialisation des données

```powershell
npm run seed
# Si l’API était déjà démarrée, redémarrer pour recharger la DB en mémoire
```

Comptes créés:

- Admin: admin@ecoride.local / admin123
- Employé: employe@ecoride.local / employe123

### Démarrage — Développement

```powershell
npm run dev
# Le script tente 3001, bascule sur 3002 si occupé
# API + statiques disponibles sur http://localhost:<PORT>
```

Cartographie des routes statiques:

- Vitrine: `public/` à la racine (`/`, `/login.html`, ...)
- Back-office: `web/` sous `/app` (`/app/admin.html`, `/app/employe.html`)

### Démarrage — Production simple

```powershell
$env:PORT=3001
$env:JWT_SECRET="<valeur-secrète>"
npm run start
```

Conseils production (poste/serveur Windows):

- Gestion de process: PM2 (`npm i -g pm2`) ou NSSM (service Windows)
- Sauvegardes: inclure `server/data/ecoride.sqlite`, `server/data/credits.db`, `server/data/config.db`
- Pare-feu: ouvrir le port exposé (3001 ou celui configuré)
- Reverse proxy (optionnel): IIS/ARR ou Nginx pour domaine et TLS

### Sauvegarde / Restauration

- Sauvegarde à froid: arrêter le process, copier `server/data/`
- Restauration: remplacer les fichiers, puis redémarrer

### Dépannage

- Après `npm run seed`, redémarrer l’API (sql.js garde la DB en mémoire)
- Si `/login.html` renvoie 404, vérifier que `public/` est servi à la racine (cf. `server/src/app.js`)
- Si conflit de port, le script `dev` bascule sur 3002 automatiquement

### Sécurité (rappel)

- Hash des mots de passe via `bcryptjs`
- JWT signé avec `JWT_SECRET` (expiration 8h)
- Middlewares d’auth et rôles pour sécuriser `/admin` et `/employee`
