const express = require("express");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/* Traveller submits trip feedback */
router.post("/", auth, requireRole("traveller"), (req, res) => {
  const { booking_id, rating, topic, comments } = req.body || {};

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  db.run(
    `INSERT INTO feedback (traveller_id, booking_id, rating, topic, comments, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [
      req.user.id,
      booking_id || null,
      rating,
      topic || "general",
      comments || null
    ],
    function (err) {
      if (err) {
        console.error("Feedback insert error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        message: "Feedback submitted successfully"
      });
    }
  );
});

/* Admin views submitted feedback */
router.get("/", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT
       f.id,
       f.rating,
       f.topic,
       f.comments,
       f.created_at,
       u.email AS traveller_email,
       d.name AS destination_name
     FROM feedback f
     JOIN users u ON u.id = f.traveller_id
     LEFT JOIN bookings b ON b.id = f.booking_id
     LEFT JOIN destinations d ON d.id = b.destination_id
     ORDER BY f.created_at DESC
     LIMIT 200`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Feedback fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

module.exports = router;