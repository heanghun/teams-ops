CREATE TABLE teams_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('email','telegram')),
  binding TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX teams_sessions_expiry ON teams_sessions(expires_at);
--> statement-breakpoint
CREATE TABLE teams_email_codes (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE teams_auth_limits (
  scope TEXT NOT NULL,
  period INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (scope,period)
);
--> statement-breakpoint
CREATE TABLE teams_telegram_flows (
  state_hash TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  invite_hash TEXT,
  connect_id TEXT,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE teams_telegram_invites (
  employee_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE teams_telegram_accounts (
  account_id TEXT PRIMARY KEY,
  subject TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  linked_at INTEGER NOT NULL,
  approved_at INTEGER,
  approved_by TEXT
);
--> statement-breakpoint
CREATE TABLE teams_telegram_outbox (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  destination TEXT NOT NULL,
  message TEXT NOT NULL,
  view TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  next_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX teams_telegram_due ON teams_telegram_outbox(status,next_at);
