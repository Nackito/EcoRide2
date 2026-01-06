const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dataPath = path.join(__dirname, "data", "rides.json");
let rides = [];

function loadData() {
  try {
    const raw = fs.readFileSync(dataPath, "utf-8");
    rides = JSON.parse(raw);
  } catch (e) {
    console.error("Erreur de chargement des données", e);
    rides = [];
  }
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function rideDurationMinutes(ride) {
  return timeToMinutes(ride.arrivalTime) - timeToMinutes(ride.departureTime);
}

loadData();

// Static files
app.use(express.static(path.join(__dirname, "public")));

// API: list rides with filters
app.get("/api/rides", (req, res) => {
  const { from, to, date, eco, maxPrice, maxDuration, minRating } = req.query;

  let results = rides.filter((r) => r.seats > 0);

  if (from)
    results = results.filter(
      (r) => r.from.toLowerCase() === String(from).toLowerCase()
    );
  if (to)
    results = results.filter(
      (r) => r.to.toLowerCase() === String(to).toLowerCase()
    );
  if (date) results = results.filter((r) => r.date === date);
  if (eco === "true") results = results.filter((r) => r.eco === true);
  if (maxPrice) results = results.filter((r) => r.price <= Number(maxPrice));
  if (maxDuration)
    results = results.filter(
      (r) => rideDurationMinutes(r) <= Number(maxDuration)
    );
  if (minRating)
    results = results.filter((r) => r.driver.rating >= Number(minRating));

  // If no direct results, propose nearest available date for same route
  let suggestedDate = null;
  if ((!results || results.length === 0) && from && to) {
    const sameRoute = rides
      .filter(
        (r) =>
          r.from.toLowerCase() === String(from).toLowerCase() &&
          r.to.toLowerCase() === String(to).toLowerCase() &&
          r.seats > 0
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sameRoute.length > 0) {
      if (date) {
        const target = new Date(date);
        let nearest = sameRoute[0];
        let bestDelta = Math.abs(new Date(nearest.date) - target);
        for (const r of sameRoute) {
          const delta = Math.abs(new Date(r.date) - target);
          if (delta < bestDelta) {
            bestDelta = delta;
            nearest = r;
          }
        }
        suggestedDate = nearest.date;
      } else {
        suggestedDate = sameRoute[0].date;
      }
    }
  }

  res.json({
    items: results.map((r) => ({
      id: r.id,
      from: r.from,
      to: r.to,
      date: r.date,
      departureTime: r.departureTime,
      arrivalTime: r.arrivalTime,
      durationMin: rideDurationMinutes(r),
      driver: {
        pseudo: r.driver.pseudo,
        rating: r.driver.rating,
        photo: r.driver.photo,
      },
      seats: r.seats,
      price: r.price,
      eco: r.eco,
    })),
    suggestedDate,
  });
});

// API: ride details
app.get("/api/rides/:id", (req, res) => {
  const ride = rides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: "Covoiturage introuvable" });
  res.json(ride);
});

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`EcoRide server démarré sur http://localhost:${PORT}`);
});
