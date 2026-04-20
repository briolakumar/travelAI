const express = require("express");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/* Get destinations for registration dropdown */
router.get("/destinations/public", (req, res) => {
  db.all(
    `SELECT d.id, d.name, c.name AS country_name
     FROM destinations d
     JOIN countries c ON c.id = d.country_id
     ORDER BY c.name ASC, d.name ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* Admin: Get all knowledge base entries */
router.get("/", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT
       kb.id,
       kb.title,
       kb.content,
       kb.source_url,
       kb.created_at,
       kb.updated_at,
       d.id AS destination_id,
       d.name AS destination_name,
       c.id AS category_id,
       c.name AS category_name
     FROM knowledge_base kb
     JOIN destinations d ON d.id = kb.destination_id
     JOIN kb_categories c ON c.id = kb.category_id
     ORDER BY kb.updated_at DESC, kb.created_at DESC
     LIMIT 200`,
    [],
    (err, rows) => {
      if (err) {
        console.error("KB fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* Admin: Get destinations for dropdowns */
router.get("/destinations", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT id, name FROM destinations ORDER BY name ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error("KB destinations fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* Admin: Get KB categories for dropdowns */
router.get("/categories", auth, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT id, name FROM kb_categories ORDER BY name ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error("KB categories fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* Admin: Add knowledge base entry */
router.post("/", auth, requireRole("admin"), (req, res) => {
  const { destination_id, category_id, title, content, source_url } = req.body || {};

  if (!destination_id || !category_id || !title || !content) {
    return res.status(400).json({
      error: "destination_id, category_id, title, and content are required"
    });
  }

  db.run(
    `INSERT INTO knowledge_base (
       destination_id, category_id, title, content, source_url,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      Number(destination_id),
      Number(category_id),
      String(title).trim(),
      String(content).trim(),
      source_url ? String(source_url).trim() : null
    ],
    function (err) {
      if (err) {
        console.error("KB insert error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, message: "Knowledge base entry created" });
    }
  );
});

/* Admin: Delete Knowledge base entry */
router.delete("/:id", auth, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "Invalid knowledge base id" });
  }

  db.run(
    `DELETE FROM knowledge_base WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error("KB delete error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }
      res.json({ ok: true, message: "Knowledge base entry deleted" });
    }
  );
});

module.exports = router;