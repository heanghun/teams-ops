CREATE TABLE revisions (id INTEGER PRIMARY KEY CHECK(id = 1), version INTEGER NOT NULL);
--> statement-breakpoint
INSERT INTO revisions VALUES (1, 0);
--> statement-breakpoint
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  project_id TEXT REFERENCES records(id) DEFERRABLE INITIALLY DEFERRED,
  parent_id TEXT REFERENCES records(id) DEFERRABLE INITIALLY DEFERRED,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX records_kind ON records(kind);
--> statement-breakpoint
CREATE INDEX records_project ON records(project_id);
--> statement-breakpoint
CREATE INDEX records_parent ON records(parent_id);
--> statement-breakpoint
CREATE TABLE audit (
  request_id TEXT PRIMARY KEY,
  version INTEGER UNIQUE NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  summary TEXT NOT NULL CHECK(json_valid(summary)),
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER audit_version BEFORE INSERT ON audit
BEGIN
  SELECT CASE WHEN NEW.version != (SELECT version + 1 FROM revisions WHERE id = 1)
    THEN RAISE(ABORT, 'revision_conflict') END;
  UPDATE revisions SET version = NEW.version WHERE id = 1;
END;
