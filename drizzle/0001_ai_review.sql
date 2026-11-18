CREATE TABLE ai_review_runs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('tender','boq','quote')),
  record_id TEXT NOT NULL,
  document_id TEXT,
  model TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('started','completed','failed')),
  input_tokens INTEGER,
  output_tokens INTEGER
);
--> statement-breakpoint
CREATE INDEX ai_review_time ON ai_review_runs(started_at);
--> statement-breakpoint
CREATE INDEX ai_review_actor_time ON ai_review_runs(actor,started_at);
