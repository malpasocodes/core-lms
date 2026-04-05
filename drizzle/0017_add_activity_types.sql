ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'watch';
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'listen';
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'read';
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'write';

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS linked_activity_id TEXT REFERENCES content_items(id) ON DELETE SET NULL;
