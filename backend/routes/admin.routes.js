const express = require("express");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/* GET /api/admin/users */
router.get("/users", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT id, full_name, email, role, created_at
     FROM users
     ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* GET /api/admin/feedback */
router.get("/feedback", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT
       f.id,
       f.rating,
       f.topic,
       f.comments,
       f.created_at,
       u.full_name AS traveller_name,
       u.role      AS submitter_role
     FROM feedback f
     JOIN users u ON u.id = f.traveller_id
     ORDER BY f.created_at DESC
     LIMIT 200`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Feedback fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      const avg = rows.length > 0
        ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(2)
        : 0;
      res.json({ average_rating: avg, total: rows.length, data: rows });
    }
  );
});

/* GET /api/admin/analytics */
router.get("/analytics", auth, requireRole("admin"), (req, res) => {
  const result = {};

  db.get(`SELECT COUNT(*) AS total_sessions FROM chat_sessions`, [], (err, sessions) => {
    if (err) return res.status(500).json({ error: err.message });
    result.sessions = sessions.total_sessions || 0;

    db.get(`SELECT COUNT(*) AS total_messages FROM chat_messages`, [], (err, messages) => {
      if (err) return res.status(500).json({ error: err.message });
      result.messages = messages.total_messages || 0;

      db.get(
        `SELECT
           SUM(CASE WHEN rating = 1  THEN 1 ELSE 0 END) AS positive,
           SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) AS negative,
           COUNT(*) AS total_feedback
         FROM chatbot_response_feedback`,
        [],
        (err, feedback) => {
          if (err) return res.status(500).json({ error: err.message });
          result.positive       = feedback.positive       || 0;
          result.negative       = feedback.negative       || 0;
          result.total_feedback = feedback.total_feedback || 0;
          res.json(result);
        }
      );
    });
  });
});

module.exports = router;