const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const { auth } = require("../middleware/auth");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const ALLOWED_ROLES = new Set(["traveller", "admin", "community"]);

/* Email domain rules per role */
const ROLE_DOMAINS = {
  admin:     "@tripwiseadmin.com",
  community: "@tripwisecommunity.com",
};

const validateEmailForRole = (email, role) => {
  const required = ROLE_DOMAINS[role];
  if (!required) return true;
  return email.endsWith(required);
};

/* In-memory reset token store */
const resetTokens = new Map();
const TOKEN_TTL_MS = 60 * 60 * 1000;

/* Register */
router.post("/register", async (req, res) => {
  try {
    const { role, full_name, email, password, destination_id } = req.body || {};

    if (!role || !full_name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === "community" && !destination_id) {
      return res.status(400).json({ message: "Community accounts require a destination" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    /* Domain check */
    if (!validateEmailForRole(normalizedEmail, role)) {
      const required = ROLE_DOMAINS[role];
      return res.status(400).json({
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} accounts must use a ${required} email address.`,
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const destId = role === "community" ? Number(destination_id) : null;

    db.run(
      `INSERT INTO users (role, full_name, email, password_hash, destination_id)
       VALUES (?, ?, ?, ?, ?)`,
      [role, String(full_name).trim(), normalizedEmail, password_hash, destId],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.status(409).json({ message: "Email already in use" });
          }
          return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ id: this.lastID, message: "Registration successful" });
      }
    );
  } catch (e) {
    console.error("Registration error:", e);
    res.status(500).json({ message: "Server error during registration" });
  }
});

/* Login */
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [String(email).trim().toLowerCase()],
    async (err, user) => {
      if (err) {
        console.error("Login DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (!user) {
        return res.status(401).json({ message: "No account found with that email." });
      }

      try {
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
          return res.status(401).json({ message: "Incorrect password. Please try again." });
        }

        const token = jwt.sign(
          { id: user.id, role: user.role },
          JWT_SECRET,
          { expiresIn: "1d" }
        );

        res.json({ token, role: user.role, full_name: user.full_name });
      } catch (compareErr) {
        console.error("Password compare error:", compareErr);
        res.status(500).json({ message: "Authentication error" });
      }
    }
  );
});


router.get("/me", auth, (req, res) => {
  db.get(
    `SELECT
       u.id,
       u.role,
       u.full_name,
       u.email,
       u.created_at,
       u.destination_id,
       d.name AS destination_name,
       d.slug AS destination_slug
     FROM users u
     LEFT JOIN destinations d ON d.id = u.destination_id
     WHERE u.id = ?`,
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error("Auth /me error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    }
  );
});

/* Forgot Password */
router.post("/forgot-password", (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  db.get(
    "SELECT id, email, full_name FROM users WHERE email = ?",
    [normalizedEmail],
    (err, user) => {
      if (err) {
        console.error("Forgot password DB error:", err);
        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
      }

      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = Date.now() + TOKEN_TTL_MS;
        resetTokens.set(token, { userId: user.id, expiresAt });

        const BASE_URL = process.env.HOST || `http://localhost:${process.env.PORT || 3000}`;
        const resetUrl = `${BASE_URL}/reset-password.html?token=${token}`;

        console.log("PASSWORD RESET LINK");
        console.log(`  User  : ${user.full_name} <${user.email}>`);
        console.log(`  Link  : ${resetUrl}`);
        console.log(`  Expires in 1 hour`);
      }

      res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    }
  );
});

/* Validate Reset Token */
router.get("/reset-password", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  const entry = resetTokens.get(token);

  if (!entry) {
    return res.status(400).json({ message: "Invalid or already used reset token" });
  }

  if (Date.now() > entry.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ message: "Reset token has expired" });
  }

  res.status(200).json({ message: "Token is valid" });
});

/* Reset Password */
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  if (String(password).length < 8) {
    return res.status(422).json({ message: "Password must be at least 8 characters" });
  }

  const entry = resetTokens.get(token);

  if (!entry) {
    return res.status(400).json({ message: "Invalid or already used reset token" });
  }

  if (Date.now() > entry.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ message: "Reset token has expired" });
  }

  try {
    const password_hash = await bcrypt.hash(String(password), 12);

    db.run(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [password_hash, entry.userId],
      function (err) {
        if (err) {
          console.error("Reset password DB error:", err);
          return res.status(500).json({ message: "Database error while resetting password" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        resetTokens.delete(token);
        console.log(`\nPassword reset success for user ID ${entry.userId}\n`);
        res.status(200).json({ message: "Password reset successfully" });
      }
    );
  } catch (e) {
    console.error("Reset password error:", e);
    res.status(500).json({ message: "Server error while resetting password" });
  }
});

module.exports = router;