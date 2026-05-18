ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO migrations (version, name) VALUES (7, '0007_categories_sort_order');
