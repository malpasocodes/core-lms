-- Create sections table (between modules and content_items)
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill: create one default section per existing module (skip if already backfilled)
INSERT INTO sections (id, module_id, title, "order", created_at)
SELECT gen_random_uuid()::text, m.id, m.title, 1, NOW()
FROM modules m
WHERE NOT EXISTS (SELECT 1 FROM sections s WHERE s.module_id = m.id);

-- Add section_id to content_items (nullable initially)
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Drop old module_id column from content_items if it exists
ALTER TABLE content_items DROP COLUMN IF EXISTS module_id;

-- Drop FK constraint if it exists, then re-add (idempotent)
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS fk_content_items_section_id;
ALTER TABLE content_items ADD CONSTRAINT fk_content_items_section_id
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;

-- Add section_id to assignments (nullable)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Drop FK constraint if it exists, then re-add (idempotent)
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_section_id;
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_section_id
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

-- Backfill assignments: assign to first section of the course
UPDATE assignments a
SET section_id = (
  SELECT s.id
  FROM sections s
  JOIN modules m ON s.module_id = m.id
  WHERE m.course_id = a.course_id
  ORDER BY m."order", s."order"
  LIMIT 1
)
WHERE a.section_id IS NULL;
