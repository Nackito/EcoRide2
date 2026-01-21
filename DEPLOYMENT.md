# Déploiement EcoRide (Windows)

Ce guide décrit comment déployer et exécuter EcoRide (API + vitrine) en local ou en environnement poste/serveur Windows.

## Prérequis

- Node.js LTS (>= 18)
- PowerShell
- Droits d’écriture sur le dossier `server/data/`

## Variables d’environnement

- `PORT` (par défaut: 3001; fallback: 3002 via script dev)
- `JWT_SECRET` (obligatoire en production)

## Installation

```powershell
cd "c:\Users\fnack.CTP\OneDrive - Iliad\Bureau\EcoRide\server"
npm ci
```

## Initialisation des données

```powershell
npm run seed
# Si l’API était déjà démarrée, redémarrer pour recharger la DB en mémoire
```

Comptes créés:

- Admin: admin@ecoride.local / admin123
- Employé: employe@ecoride.local / employe123

## Démarrage — Développement

```powershell
npm run dev
# Le script tente 3001, bascule sur 3002 si occupé
# API + statiques disponibles sur http://localhost:<PORT>
```

Cartographie des routes statiques:

- Vitrine: dossier `public/` servi à la racine (`/`, `/login.html`, ...)
- Back-office: dossier `web/` sous `/app` (`/app/admin.html`, `/app/employe.html`)

## Démarrage — Production simple

```powershell
$env:PORT=3001
$env:JWT_SECRET="<valeur-secrète>"
npm run start
```

Conseils production (poste/serveur Windows):

- Gestion de process: PM2 (`npm i -g pm2`) ou NSSM (service Windows)
- Sauvegardes: inclure `server/data/ecoride.sqlite`, `server/data/credits.db`, `server/data/config.db`
- Pare-feu: ouvrir le port exposé (3001 ou celui configuré)
- Reverse proxy (optionnel): IIS/ARR ou Nginx pour exposer sous un nom de domaine et TLS

## Sauvegarde / Restauration

- Sauvegarde à froid: arrêter le process, copier les fichiers sous `server/data/`
- Restauration: remplacer les fichiers, puis redémarrer

## Dépannage

- Après un `npm run seed`, redémarrer l’API (sql.js garde la DB en mémoire)
- Si `/login.html` renvoie 404, vérifier que `public/` est bien servi à la racine (cf. `server/src/app.js`)
- Si conflit de port, le script `dev` bascule sur 3002 automatiquement

## Sécurité (rappel)

- Hash des mots de passe via `bcryptjs`
- JWT signé avec `JWT_SECRET` (expiration 8h)
- Middlewares d’auth et rôles pour sécuriser `/admin` et `/employee`
