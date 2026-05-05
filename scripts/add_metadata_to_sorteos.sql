-- Add metadata column to sorteos table if it doesn't exist
ALTER TABLE sorteos
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_sorteos_metadata ON sorteos USING GIN (metadata);
