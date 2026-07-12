-- Reliability Instrumentation Dashboard — initial D1 schema.
-- Apply locally:  wrangler d1 execute reliability-dashboard --local --file=./migrations/0001_init.sql
-- Apply remote:   wrangler d1 execute reliability-dashboard --remote --file=./migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('Admin','Engineer','Viewer')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS instruments (
  id                 TEXT PRIMARY KEY,
  tag_number         TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  location           TEXT NOT NULL,
  type               TEXT NOT NULL,
  criticality        TEXT NOT NULL CHECK (criticality IN ('High','Medium','Low','SCE')),
  commissioning_date TEXT,
  running_hours      REAL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_instruments_location ON instruments(location);
CREATE INDEX IF NOT EXISTS idx_instruments_type ON instruments(type);
CREATE INDEX IF NOT EXISTS idx_instruments_criticality ON instruments(criticality);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id                  TEXT PRIMARY KEY,
  instrument_id       TEXT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  tag_number          TEXT NOT NULL,
  date_time           TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('PM','CM')),
  activity            TEXT NOT NULL,
  final_status        TEXT NOT NULL,
  failure_mode        TEXT,
  repair_time_hours   REAL,
  downtime_hours      REAL,
  calibration_before  REAL,
  calibration_after   REAL,
  technician          TEXT NOT NULL,
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maint_instrument ON maintenance_records(instrument_id);
CREATE INDEX IF NOT EXISTS idx_maint_datetime ON maintenance_records(date_time);
CREATE INDEX IF NOT EXISTS idx_maint_type ON maintenance_records(type);

-- Settings is a single row keyed by id=1; JSON-encoded blobs for the array fields.
CREATE TABLE IF NOT EXISTS settings (
  id                          INTEGER PRIMARY KEY CHECK (id = 1),
  instrument_types_json       TEXT NOT NULL,
  intervals_json              TEXT NOT NULL,
  calibration_tolerance_pct   REAL NOT NULL,
  health_excellent_min        INTEGER NOT NULL,
  health_fair_min             INTEGER NOT NULL,
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS escalation_rules (
  criticality TEXT PRIMARY KEY CHECK (criticality IN ('High','Medium','Low','SCE')),
  recipients  TEXT NOT NULL DEFAULT ''
);

-- Auth sessions (JWT is stateless, but this table lets Admins revoke sessions).
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
