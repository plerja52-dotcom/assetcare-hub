-- Round 4 — new canonical data model (Area 2 real PM/PdM tracker shape).
-- Drops old instrument/maintenance columns (criticality, health, calibration,
-- MTBF/MTTR fields) and introduces: instruments(area, equipmentType, pmFrequency),
-- pm_tasks (with derived status), user status field, sessions table.
--
-- Apply local:  wrangler d1 execute reliability-dashboard --local  --file=./migrations/0002_new_model.sql
-- Apply remote: wrangler d1 execute reliability-dashboard --remote --file=./migrations/0002_new_model.sql

-- Rebuild instrument table
DROP TABLE IF EXISTS maintenance_records;
DROP TABLE IF EXISTS instruments;

CREATE TABLE instruments (
  id                 TEXT PRIMARY KEY,
  tag_number         TEXT NOT NULL UNIQUE,
  lokasi             TEXT,
  area               TEXT NOT NULL,
  equipment_type     TEXT NOT NULL,
  pm_frequency_count INTEGER,
  pm_frequency_unit  TEXT CHECK (pm_frequency_unit IN ('minggu','bulan','tahun')),
  commissioning_date TEXT,
  created_by         TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_instruments_area ON instruments(area);
CREATE INDEX idx_instruments_equipment ON instruments(equipment_type);

CREATE TABLE pm_tasks (
  id                  TEXT PRIMARY KEY,
  instrument_id       TEXT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  tag_number          TEXT NOT NULL,
  area                TEXT NOT NULL,
  equipment_type      TEXT NOT NULL,
  period              TEXT,
  plan_date           TEXT NOT NULL,
  actual_date         TEXT,
  pic                 TEXT NOT NULL,
  activity            TEXT NOT NULL DEFAULT '',
  activity_type       TEXT NOT NULL CHECK (activity_type IN ('PM','PdM','Perbaikan')) DEFAULT 'PM',
  kendala             TEXT,
  status              TEXT NOT NULL CHECK (status IN ('Finish','Inprogress','Behind','Scheduled')) DEFAULT 'Scheduled',
  manual_status       INTEGER NOT NULL DEFAULT 0,
  perbaikan_lanjutan  TEXT,
  catatan             TEXT,
  created_by          TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_instrument ON pm_tasks(instrument_id);
CREATE INDEX idx_tasks_plan ON pm_tasks(plan_date);
CREATE INDEX idx_tasks_status ON pm_tasks(status);
CREATE INDEX idx_tasks_area ON pm_tasks(area);

-- Users: add status column for pending-approval flow.
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending','approved','rejected'));

-- Rebuild settings for new model.
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  areas_json           TEXT NOT NULL,
  equipment_types_json TEXT NOT NULL,
  frequency_by_type_json TEXT NOT NULL,
  upcoming_window_days INTEGER NOT NULL DEFAULT 14,
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Escalation now keyed off Area (was Criticality).
DROP TABLE IF EXISTS escalation_rules;
CREATE TABLE escalation_rules (
  area       TEXT PRIMARY KEY,
  recipients TEXT NOT NULL DEFAULT ''
);
