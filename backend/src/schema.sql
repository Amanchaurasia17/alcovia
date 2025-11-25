-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'On Track',
  remedial_task TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  quiz_score INT,
  focus_minutes INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Interventions
CREATE TABLE IF NOT EXISTS interventions (
  id SERIAL PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, assigned, completed
  assigned_task TEXT,
  mentor_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
