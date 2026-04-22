require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./db");

const app = express();

/* Security middleware */
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

/* Rate limiting 
/* Auth: max 20 requests per 15 minutes per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

/* General API: max 200 requests per 15 minutes per IP */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/* Global fallback: max 500 requests per 15 minutes per IP */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP." },
});

app.use(globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

/* Static files */
app.use(express.static(path.join(__dirname, "../html+css")));
app.use("/images", express.static(path.join(__dirname, "../html+css/images")));
app.use("/images", express.static(path.join(__dirname, "../images")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../html+css/homepage.html"));
});
/* API routes */
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/bookings", require("./routes/bookings.routes"));
app.use("/api/feedback", require("./routes/feedback.routes"));
app.use("/api/insights", require("./routes/insights.routes"));
app.use("/api/knowledge-base", require("./routes/knowledgeBase.routes"));
app.use("/api/chatbot", require("./routes/chatbot.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/destinations", require("./routes/destinations.routes"));

/* Health check */
app.get("/health", (req, res) => {
  res.json({ status: "Backend running" });
});

/* Start server */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

