-- Add geocoordinates to stories and posts for live map hotspots
ALTER TABLE stories ADD COLUMN IF NOT EXISTS region_lat float;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS region_lng float;
ALTER TABLE posts   ADD COLUMN IF NOT EXISTS region_lat float;
ALTER TABLE posts   ADD COLUMN IF NOT EXISTS region_lng float;

-- Add updated_at to stories for time-decay trending score
ALTER TABLE stories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger: keep updated_at current on every story update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stories_updated_at ON stories;
CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Back-fill existing rows so they're not stuck with NULL
UPDATE stories SET updated_at = created_at WHERE updated_at IS NULL;
