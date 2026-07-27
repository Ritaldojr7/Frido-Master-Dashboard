-- Supabase Seed File for LOP Tracker

-- 1. Create the LOP Records table (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS manpower_lop_records (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    vertical_name TEXT NOT NULL,
    date_of_lop TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add an index for faster querying by date
CREATE INDEX IF NOT EXISTS idx_manpower_lop_records_date ON manpower_lop_records(date_of_lop);

-- 3. Add reviewed_by column to access_requests table if missing
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS reviewed_by TEXT DEFAULT '';

