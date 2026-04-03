-- Create sections table (between modules and content_items)
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill: create one default section per existing module
INSERT INTO sections (id, module_id, title, "order", created_at)
SELECT gen_random_uuid()::text, id, title, 1, NOW() FROM modules;

-- Add section_id to content_items (nullable initially for backfill)
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Backfill: map each content_item to the default section for its module
UPDATE content_items ci
SET section_id = s.id
FROM sections s
WHERE s.module_id = ci.module_id;

-- Make section_id NOT NULL and add FK
ALTER TABLE content_items ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE content_items ADD CONSTRAINT fk_content_items_section_id
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;

-- Drop old module_id column from content_items
ALTER TABLE content_items DROP COLUMN IF EXISTS module_id;

-- Add section_id to assignments (nullable — backfilled where possible)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections(id) ON DELETE SET NULL;

-- Backfill assignments: assign to first section of the course (by module order)
UPDATE assignments a
SET section_id = (
  SELECT s.id
  FROM sections s
  JOIN modules m ON s.module_id = m.id
  WHERE m.course_id = a.course_id
  ORDER BY m."order", s."order"
  LIMIT 1
);
