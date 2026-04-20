const express = require("express");
const db      = require("../db");
const router  = express.Router();

/*
  GET /api/destinations
  Returns all destinations with country name
*/
router.get("/", (req, res) => {
  db.all(
    `SELECT
       d.id, d.slug, d.name, d.description,
       d.image_url, d.best_time, d.occasions, d.language_tips,
       c.name AS country_name
     FROM destinations d
     JOIN countries c ON c.id = d.country_id
     ORDER BY d.name ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/*
  GET /api/destinations/by-slug/:slug
  Returns a single destination by slug
*/
router.get("/by-slug/:slug", (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();

  db.get(
    `SELECT
       d.id, d.slug, d.name, d.description,
       d.image_url, d.best_time, d.occasions, d.language_tips,
       c.name AS country_name
     FROM destinations d
     JOIN countries c ON c.id = d.country_id
     WHERE d.slug = ?`,
    [slug],
    (err, dest) => {
      if (err)   return res.status(500).json({ error: err.message });
      if (!dest) return res.status(404).json({ error: "Destination not found" });
      res.json(dest);
    }
  );
});

/*
  GET /api/destinations/:id/accommodations
  Returns all accommodations for a destination 
*/
router.get("/:id/accommodations", (req, res) => {
  const destinationId = Number(req.params.id);

  if (!destinationId) {
    return res.status(400).json({ error: "Invalid destination ID" });
  }

  db.all(
    `SELECT id, title, price_per_night, rating
     FROM accommodations
     WHERE destination_id = ?
     ORDER BY price_per_night ASC`,
    [destinationId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;