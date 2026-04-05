-- Add type and source_content_item_id to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'open_ended' CHECK (type IN ('open_ended', 'mcq'));
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS source_content_item_id TEXT REFERENCES content_items(id) ON DELETE SET NULL;

-- Create mcq_questions table
CREATE TABLE IF NOT EXISTS mcq_questions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add mcq_answers to submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS mcq_answers TEXT;

-- Make grades.graded_by nullable to support auto-graded MCQ submissions
ALTER TABLE grades ALTER COLUMN graded_by DROP NOT NULL;
