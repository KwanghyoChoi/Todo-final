import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseConfig = {
  auth: {
    persistSession: false,
  },
}

export function createSupabaseClient(url = supabaseUrl, anonKey = supabaseAnonKey) {
  if (!url || !anonKey) {
    return createMissingSupabaseClient()
  }

  return createClient(url, anonKey, supabaseConfig)
}

function createMissingSupabaseClient() {
  const error = new Error("Missing Supabase environment variables")

  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    then: (onFulfilled: any, onRejected: any) => {
      const result = { data: null, error }
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
    catch: (onRejected: any) => Promise.resolve({ data: null, error }).catch(onRejected),
    finally: (onFinally: any) => Promise.resolve({ data: null, error }).finally(onFinally),
  }

  return {
    from: () => builder,
    auth: supabaseConfig.auth,
  } as any
}

// Supabase 클라이언트 생성 (싱글톤 패턴)
export const supabase = createSupabaseClient()
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

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
