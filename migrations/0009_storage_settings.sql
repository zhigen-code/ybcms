INSERT OR IGNORE INTO settings (key, value) VALUES ('storage.driver', 'r2');
INSERT OR IGNORE INTO settings (key, value) VALUES ('storage.s3.endpoint', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('storage.s3.bucket', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('storage.s3.region', 'auto');
INSERT OR IGNORE INTO settings (key, value) VALUES ('storage.s3.public_url', '');

INSERT OR IGNORE INTO migrations (version, name) VALUES (9, '0009_storage_settings');
