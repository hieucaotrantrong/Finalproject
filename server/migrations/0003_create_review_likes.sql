-- Migration: create review_likes table to track per-user likes
CREATE TABLE IF NOT EXISTS review_likes (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (review_id, user_id)
);
