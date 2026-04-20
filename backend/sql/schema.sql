PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS chatbot_response_feedback;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS chatbot_guidance;
DROP TABLE IF EXISTS insights;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS knowledge_base;
DROP TABLE IF EXISTS kb_categories;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS accommodations;
DROP TABLE IF EXISTS destinations;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('traveller','admin','community')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
    destination_id INTEGER REFERENCES destinations(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE kb_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country_id INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  best_time TEXT,
  occasions TEXT,
  language_tips TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(country_id) REFERENCES countries(id)
);

CREATE TABLE accommodations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  price_per_night REAL NOT NULL,
  rating REAL DEFAULT 0,
  FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  traveller_id INTEGER NOT NULL,
  destination_id INTEGER NOT NULL,
  accommodation_id INTEGER,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER DEFAULT 1,
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('draft','confirmed','cancelled')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(traveller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  FOREIGN KEY(accommodation_id) REFERENCES accommodations(id) ON DELETE SET NULL
);

CREATE TABLE knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES kb_categories(id)
);

CREATE TABLE insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL,
  destination_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(community_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE TABLE chatbot_guidance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  traveller_id INTEGER NOT NULL,
  destination_id INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY(traveller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  traveller_id INTEGER NOT NULL,
  booking_id INTEGER,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  topic TEXT DEFAULT 'general',
  comments TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(traveller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  traveller_id INTEGER NOT NULL,
  destination_id INTEGER NOT NULL,
  title TEXT DEFAULT 'TripWise Chatbot',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY(traveller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  sender TEXT NOT NULL CHECK(sender IN ('user','assistant','system')),
  message_text TEXT NOT NULL,
  intent TEXT,
  confidence REAL,
  sources_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE chatbot_response_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  traveller_id INTEGER NOT NULL,
  booking_id INTEGER,
  rating INTEGER NOT NULL CHECK(rating IN (1, -1)),
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY(traveller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_bookings_traveller ON bookings(traveller_id);
CREATE INDEX idx_bookings_destination ON bookings(destination_id);
CREATE INDEX idx_kb_destination ON knowledge_base(destination_id);
CREATE INDEX idx_kb_category ON knowledge_base(category_id);
CREATE INDEX idx_insights_destination_status ON insights(destination_id, status);
CREATE INDEX idx_chatbot_guidance_booking ON chatbot_guidance(booking_id);
CREATE INDEX idx_chat_sessions_booking ON chat_sessions(booking_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chatbot_response_feedback_message ON chatbot_response_feedback(message_id);