const express = require("express");
const router = express.Router();
const db = require("../db");
const { auth } = require("../middleware/auth");

// Create a new booking
router.post("/", auth, (req, res) => {
  const {
    destination_id,
    accommodation_id,
    check_in,
    check_out,
    guests,
    status
  } = req.body;

  const userId = req.user.id;

  // Validate required fields
  if (!destination_id) {
    return res.status(400).json({ error: "destination_id is required" });
  }

  if (!check_in || !check_out) {
    return res.status(400).json({ error: "check_in and check_out are required" });
  }

  // SQL query to insert booking
  const sql = `
    INSERT INTO bookings (
      traveller_id,
      destination_id,
      accommodation_id,
      check_in,
      check_out,
      guests,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  // Run insert query
  db.run(
    sql,
    [
      userId,
      destination_id,
      accommodation_id || null,
      check_in,
      check_out,
      guests || 1,
      status || "confirmed"
    ],
    function (err) {
      if (err) {
        console.error("Booking insert error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        message: "Booking saved successfully"
      });
    }
  );
});

// Get all bookings for the logged-in user
router.get("/me", auth, (req, res) => {
  const userId = req.user.id;

  // SQL query to get bookings with related data
  const sql = `
    SELECT
      b.id,
      b.traveller_id,
      b.destination_id,
      b.accommodation_id,
      b.check_in,
      b.check_out,
      b.guests,
      b.status,
      b.created_at,
      d.name AS destination_name,
      d.slug AS destination_slug,
      d.image_url,
      d.best_time,
      d.occasions,
      d.language_tips,
      c.name AS country_name,
      a.title AS accommodation_title,
      a.price_per_night,
      a.rating AS accommodation_rating
    FROM bookings b
    JOIN destinations d ON d.id = b.destination_id
    JOIN countries c ON c.id = d.country_id
    LEFT JOIN accommodations a ON a.id = b.accommodation_id
    WHERE b.traveller_id = ?
    ORDER BY b.check_in ASC
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error("Booking fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

// Get a single booking by ID
router.get("/:id", auth, (req, res) => {
  const bookingId = Number(req.params.id);
  const userId = req.user.id;

  const sql = `
    SELECT
      b.id,
      b.traveller_id,
      b.destination_id,
      b.accommodation_id,
      b.check_in,
      b.check_out,
      b.guests,
      b.status,
      b.created_at,
      d.name AS destination_name,
      d.slug AS destination_slug,
      d.description,
      d.image_url,
      d.best_time,
      d.occasions,
      d.language_tips,
      c.name AS country_name,
      a.title AS accommodation_title,
      a.price_per_night,
      a.rating AS accommodation_rating
    FROM bookings b
    JOIN destinations d ON d.id = b.destination_id
    JOIN countries c ON c.id = d.country_id
    LEFT JOIN accommodations a ON a.id = b.accommodation_id
    WHERE b.id = ? AND b.traveller_id = ?
    LIMIT 1
  `;

  db.get(sql, [bookingId, userId], (err, row) => {
    if (err) {
      console.error("Booking detail error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(row);
  });
});

// Delete a booking 
router.delete("/:id", auth, (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  const sql = `DELETE FROM bookings WHERE id = ? AND traveller_id = ?`;

  db.run(sql, [bookingId, userId], function (err) {
    if (err) {
      console.error("Booking delete error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Booking not found or unauthorized" });
    }

    res.json({ message: "Booking deleted successfully" });
  });
});

module.exports = router;