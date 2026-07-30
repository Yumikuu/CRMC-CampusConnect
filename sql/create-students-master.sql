-- ═══════════════════════════════════════════════════════════════
-- STUDENTS MASTER LIST TABLE
-- ═══════════════════════════════════════════════════════════════
-- This table holds the official student roster from the registrar.
-- Used to validate student IDs during sign-up and auto-assign departments.
-- Import via CSV from the registrar's master list.

CREATE TABLE IF NOT EXISTS students_master (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id    TEXT UNIQUE NOT NULL,          -- e.g. '2024-00001'
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  department    TEXT NOT NULL,                 -- must match community names exactly
  year_level    TEXT,                          -- e.g. '1st Year', '2nd Year'
  is_active     BOOLEAN DEFAULT true,         -- false = dropped/graduated
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups during sign-up validation
CREATE INDEX IF NOT EXISTS idx_students_master_student_id ON students_master(student_id);
CREATE INDEX IF NOT EXISTS idx_students_master_department ON students_master(department);

-- Enable RLS
ALTER TABLE students_master ENABLE ROW LEVEL SECURITY;

-- Students can read their own record (for sign-up validation)
CREATE POLICY "Anyone can look up student IDs for registration"
  ON students_master FOR SELECT
  USING (true);

-- Only admins (service role) can insert/update/delete
-- This is enforced by default since no INSERT/UPDATE/DELETE policies exist for anon

-- ═══════════════════════════════════════════════════════════════
-- SAMPLE DATA FOR TESTING (remove before production / real import)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO students_master (student_id, first_name, last_name, department, year_level)
VALUES
  -- CSS Department
  ('2024-00001', 'Juan', 'Dela Cruz', 'College of Computer Studies (CSS)', '1st Year'),
  ('2024-00002', 'Maria', 'Santos', 'College of Computer Studies (CSS)', '2nd Year'),
  ('2024-00003', 'Pedro', 'Reyes', 'College of Computer Studies (CSS)', '3rd Year'),
  
  -- CBE Department
  ('2024-00010', 'Ana', 'Garcia', 'College of Business Education (CBE)', '1st Year'),
  ('2024-00011', 'Jose', 'Mendoza', 'College of Business Education (CBE)', '2nd Year'),
  
  -- CCJE Department
  ('2024-00020', 'Carlo', 'Ramos', 'College of Criminal Justice Education (CCJE)', '1st Year'),
  ('2024-00021', 'Liza', 'Villanueva', 'College of Criminal Justice Education (CCJE)', '3rd Year'),
  
  -- CTE Department
  ('2024-00030', 'Grace', 'Torres', 'College of Teacher Education (CTE)', '2nd Year'),
  ('2024-00031', 'Mark', 'Bautista', 'College of Teacher Education (CTE)', '4th Year'),
  
  -- PSYCH Department
  ('2024-00040', 'Kim', 'Aquino', 'Psychology (PSYCH)', '1st Year'),
  ('2024-00041', 'Jay', 'Fernandez', 'Psychology (PSYCH)', '2nd Year')
ON CONFLICT (student_id) DO NOTHING;
