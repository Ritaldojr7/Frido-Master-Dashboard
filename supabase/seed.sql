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

-- 3. (Optional) Insert some dummy seed data for testing
-- INSERT INTO manpower_lop_records (id, email, agent_name, vertical_name, date_of_lop)
-- VALUES 
--     ('seed-1', 'ritwik.m@myfrido.com', 'Ritwik', 'Abandoned High Cart', '2026-07-17'),
--     ('seed-2', 'saiyed.a@myfrido.com', 'Saiyed Abdal', 'Abandoned High Cart', '2026-07-18');
