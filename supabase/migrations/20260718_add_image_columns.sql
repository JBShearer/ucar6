-- Add og_image to prospects for crawler to store
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Add image_url to filings for display
ALTER TABLE filings ADD COLUMN IF NOT EXISTS image_url TEXT;
