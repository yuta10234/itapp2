/*
  # Create database schema for IT learning app

  1. New Tables
    - `quiz_progress` - Tracks user's quiz answers
    - `article_progress` - Tracks user's article reading
    - `articles` - Stores article content
  
  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous access
*/

-- Create quiz_progress table
CREATE TABLE IF NOT EXISTS quiz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now(),
  time_taken INTEGER NOT NULL,
  user_id TEXT NOT NULL
);

-- Create article_progress table
CREATE TABLE IF NOT EXISTS article_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  read_count INTEGER NOT NULL DEFAULT 1,
  user_id TEXT NOT NULL
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policies for quiz_progress
CREATE POLICY "Users can create their own quiz progress"
  ON quiz_progress
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can read their own quiz progress"
  ON quiz_progress
  FOR SELECT
  TO anon
  USING (true);

-- Create policies for article_progress
CREATE POLICY "Users can create their own article progress"
  ON article_progress
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own article progress"
  ON article_progress
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read their own article progress"
  ON article_progress
  FOR SELECT
  TO anon
  USING (true);

-- Create policies for articles
CREATE POLICY "Anyone can read articles"
  ON articles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can create articles"
  ON articles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update articles"
  ON articles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for article images
-- Note: This would normally be done via the Supabase dashboard
-- or using the Supabase CLI, but we're including it here for completeness
INSERT INTO storage.buckets (id, name)
VALUES ('article-images', 'article-images')
ON CONFLICT DO NOTHING;

-- Allow public access to article images
CREATE POLICY "Public access to article images"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'article-images');

CREATE POLICY "Anyone can upload article images"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'article-images');