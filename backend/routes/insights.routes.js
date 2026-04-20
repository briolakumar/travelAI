const express = require("express");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/* Local Insights */
router.post("/", auth, requireRole("community"), (req, res) => {
  const { destination_id, title, content } = req.body || {};

  if (!destination_id || !title || !content) {
    return res.status(400).json({
      error: "destination_id, title, and content are required"
    });
  }

  db.run(
    `INSERT INTO insights (
       community_id,
       destination_id,
       title,
       content,
       status,
       created_at
     )
     VALUES (?, ?, ?, ?, 'pending', datetime('now'))`,
    [
      req.user.id,
      Number(destination_id),
      String(title).trim(),
      String(content).trim()
    ],
    function (err) {
      if (err) {
        console.error("Insight submission error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        message: "Insight submitted for moderation"
      });
    }
  );
});


router.get("/mine", auth, requireRole("community"), (req, res) => {
  db.all(
    `SELECT
       i.id,
       i.title,
       i.content,
       i.status,
       i.created_at,
       d.name AS destination_name
     FROM insights i
     JOIN destinations d ON d.id = i.destination_id
     WHERE i.community_id = ?
     ORDER BY i.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error("Insights /mine error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* Approved insights by destination */
router.get("/destination/:destinationId", (req, res) => {
  const destinationId = Number(req.params.destinationId);

  if (!destinationId) {
    return res.status(400).json({ error: "Invalid destinationId" });
  }

  db.all(
    `SELECT
       i.id,
       i.title,
       i.content,
       i.status,
       i.created_at,
       u.full_name AS community_name
     FROM insights i
     JOIN users u ON u.id = i.community_id
     WHERE i.destination_id = ?
       AND i.status = 'approved'
     ORDER BY i.created_at DESC`,
    [destinationId],
    (err, rows) => {
      if (err) {
        console.error("Insights fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* Admin: moderation list */
router.get("/moderation", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT
       i.id,
       i.title,
       i.content,
       i.status,
       i.created_at,
       d.name AS destination_name,
       u.email AS community_email,
       u.full_name AS community_name
     FROM insights i
     JOIN destinations d ON d.id = i.destination_id
     JOIN users u ON u.id = i.community_id
     ORDER BY i.created_at DESC
     LIMIT 200`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Moderation list error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* Admin: update insight status */
router.post("/:id/status", auth, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "Invalid insight id" });
  }

  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  db.run(
    `UPDATE insights SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) {
        console.error("Moderation update error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Insight not found" });
      }

      res.json({ ok: true, message: `Insight marked as ${status}` });
    }
  );
});

module.exports = router;