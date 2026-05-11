-- Add like counter for product reviews
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
