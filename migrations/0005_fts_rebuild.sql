-- 重建 FTS5 全文索引为独立表（手动同步，兼容 D1）
-- 版本: 0005

DROP TABLE IF EXISTS contents_fts;

CREATE VIRTUAL TABLE contents_fts USING fts5(
  id UNINDEXED,
  title,
  excerpt,
  content,
  tokenize='unicode61'
);

-- 从现有内容填充索引
INSERT INTO contents_fts(id, title, excerpt, content)
SELECT id, COALESCE(title, ''), COALESCE(excerpt, ''), COALESCE(content, '')
FROM contents;

INSERT OR IGNORE INTO migrations(version, name) VALUES(5, 'fts_rebuild');
