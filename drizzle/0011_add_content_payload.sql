-- Add source_metadata to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS source_metadata TEXT;

-- Add source_ref to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS source_ref TEXT;

-- Add content_payload and source_ref to content_items
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS content_payload TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS source_ref TEXT;

-- Add normalized_text to content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'normalized_text';
