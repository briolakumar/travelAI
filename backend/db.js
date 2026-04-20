const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "tripwise.db");
const schemaPath = path.resolve(__dirname, "sql", "schema.sql");
const dataPath = path.resolve(__dirname, "sql", "data.sql");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Run database setup in order
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const dataSql = fs.readFileSync(dataPath, "utf8");

  // Check if the destinations table already exists
  db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='destinations'`,
    [],
    (schemaCheckErr, tableRow) => {
      if (schemaCheckErr) {
        console.error("Schema check failed:", schemaCheckErr.message);
        return;
      }

      // Function to add sample data only if the table is empty
      const ensureSeedData = () => {
        db.get(`SELECT COUNT(*) AS total FROM destinations`, [], (countErr, countRow) => {
          if (countErr) {
            console.error("Destination count check failed:", countErr.message);
            return;
          }

          if ((countRow?.total || 0) > 0) {
            return;
          }

          db.exec(dataSql, (dataErr) => {
            if (dataErr) {
              console.error("Data load failed:", dataErr.message);
              return;
            }

            console.log("Static destination data loaded successfully.");
          });
        });
      };

      // If table does not exist, create schema first
      if (!tableRow) {
        db.exec(schemaSql, (schemaErr) => {
          if (schemaErr) {
            console.error("Schema load failed:", schemaErr.message);
            return;
          }

          console.log("Database schema created successfully.");
          ensureSeedData();
        });
      } else {
        console.log("Database schema already exists.");
        ensureSeedData();
      }
    }
  );
});

module.exports = db;