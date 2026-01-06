import bcrypt from 'bcryptjs';
import { getDb, ensureDatabase } from './sqlite.js';
import { creditsStore } from './nosql.js';

await ensureDatabase();
const db = getDb();

function getRoleId(name) {
  return db.prepare('SELECT id FROM roles WHERE libelle = ?').get(name).id;
}

// Seed admin if missing
const admin = db.prepare('SELECT * FROM utilisateurs WHERE email = ?').get('admin@ecoride.local');
if (!admin) {
  db.prepare(`INSERT INTO utilisateurs (nom, prenom, email, password_hash, role_id)
              VALUES (?,?,?,?,?)`).run('Admin', 'Eco', 'admin@ecoride.local', bcrypt.hashSync('admin123', 10), getRoleId('admin'));
  console.log('Admin seeded: admin@ecoride.local / admin123');
}

// Seed one employe
const emp = db.prepare('SELECT * FROM utilisateurs WHERE email = ?').get('employe@ecoride.local');
if (!emp) {
  db.prepare(`INSERT INTO utilisateurs (nom, prenom, email, password_hash, role_id)
              VALUES (?,?,?,?,?)`).run('Employe', 'Demo', 'employe@ecoride.local', bcrypt.hashSync('employe123', 10), getRoleId('employe'));
  console.log('Employe seeded: employe@ecoride.local / employe123');
}

// Seed some covoiturages and credits
const covCount = db.prepare('SELECT COUNT(*) as c FROM covoiturages').get().c;
if (covCount === 0) {
  const insertCov = db.prepare(`INSERT INTO covoiturages (date_depart, heure_depart, lieu_depart, date_arrivee, heure_arrivee, lieu_arrivee, statut, nb_place, prix_personne)
                                VALUES (?,?,?,?,?,?,?,?,?)`);
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0,10);
    insertCov.run(day, '08:00', 'A', day, '09:00', 'B', i % 2 === 0 ? 'ok' : 'incident', 3, 5.0 + i);
  }
  console.log('Covoiturages seed: 5 rows');
}

// Seed crédits NoSQL si vide
const creds = await creditsStore.find({});
if (!creds || creds.length === 0) {
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    await creditsStore.insert({ day, amount: 20 + i * 3 });
  }
  console.log('Crédits seed: 5 jours');
}
