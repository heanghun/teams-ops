CREATE TABLE IF NOT EXISTS platform_events (
  minute INTEGER NOT NULL,
  actor TEXT NOT NULL,
  area TEXT NOT NULL,
  status INTEGER NOT NULL,
  last_seen TEXT NOT NULL,
  max_ms INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  slow_hits INTEGER NOT NULL,
  PRIMARY KEY (minute, actor, area, status)
) WITHOUT ROWID;
