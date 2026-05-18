-- Fix 1: 去除 category_id 冗余字段，唯一真相源为 content_categories 关联表
ALTER TABLE contents DROP COLUMN category_id;

-- Fix 2: 为 page 类型添加层级与排序支持
ALTER TABLE contents ADD COLUMN parent_id TEXT REFERENCES contents(id) ON DELETE SET NULL;
ALTER TABLE contents ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_contents_parent ON contents(parent_id);

INSERT OR IGNORE INTO migrations (version, name) VALUES (4, '0004_clean_schema');
