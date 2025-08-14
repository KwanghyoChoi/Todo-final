import { createClient } from "@supabase/supabase-js"

// Supabase 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Supabase 클라이언트 생성 (싱글톤 패턴)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

export type Todo = {
  id: string
  text: string
  completed: boolean
  date: string | null
  important: boolean
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

export type SubTask = {
  id: string
  todo_id: string
  text: string
  completed: boolean
  created_at?: string
  updated_at?: string
}

export type TodoWithSubtasks = Todo & {
  subtasks: SubTask[]
  subtasksLoaded?: boolean
  subtasksLoading?: boolean
}
