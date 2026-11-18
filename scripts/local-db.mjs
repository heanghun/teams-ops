import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function localDb(filename = ':memory:') {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name='records'").get()) {
    db.exec(readFileSync(new URL('../drizzle/0000_operations.sql', import.meta.url), 'utf8'));
  }
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name='ai_review_runs'").get()) {
    db.exec(readFileSync(new URL('../drizzle/0001_ai_review.sql', import.meta.url), 'utf8'));
  }
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name='platform_events'").get()) {
    db.exec(readFileSync(new URL('../drizzle/0002_platform_activity.sql', import.meta.url), 'utf8'));
  }
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name='teams_sessions'").get()) {
    db.exec(readFileSync(new URL('../drizzle/0003_teams_connectivity.sql', import.meta.url), 'utf8'));
  }
  function prepare(query) {
    let args = [];
    return {
      bind(...bound) { args = bound; return this; },
      first() { return db.prepare(query).get(...args) ?? null; },
      all() { return { results: db.prepare(query).all(...args) }; },
      run() { return db.prepare(query).run(...args); },
    };
  }
  return {
    prepare,
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = statements.map(s => s.run());
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() { db.close(); },
  };
}
