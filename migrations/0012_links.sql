CREATE TABLE IF NOT EXISTS links (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  description TEXT,
  logo        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'active',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO migrations (version, name) VALUES (12, '0012_links');
