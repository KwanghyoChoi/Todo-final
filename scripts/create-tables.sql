-- todos 테이블 생성
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  date TIMESTAMPTZ,
  important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- subtasks 테이블 생성
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

-- RLS (Row Level Security) 정책 설정 (선택사항)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 작업을 수행할 수 있도록 정책 생성
CREATE POLICY IF NOT EXISTS "Enable all operations for todos" ON todos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Enable all operations for subtasks" ON subtasks
  FOR ALL USING (true) WITH CHECK (true);
