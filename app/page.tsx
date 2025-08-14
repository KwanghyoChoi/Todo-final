"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Calendar, Loader2, CheckCircle, RefreshCw, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format, addDays, startOfToday, getDay } from "date-fns"
import { ko } from "date-fns/locale"
import { supabase, type TodoWithSubtasks, type Todo, type SubTask } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { TaskItem } from "@/components/task-item"
import { TaskSkeleton } from "@/components/task-skeleton"
import { CACHE_KEYS, cacheData, getCachedData, shouldRefreshCache, updateCacheTimestamp } from "@/lib/cache-utils"

export default function TodoApp() {
  const [todos, setTodos] = useState<TodoWithSubtasks[]>([])
  const [loading, setLoading] = useState(true)
  const [newTodo, setNewTodo] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Supabase 연결 테스트
  const testConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("todos").select("count").limit(1)
      if (error) throw error
      setConnectionError(false)
      return true
    } catch (error) {
      console.error("Supabase connection test failed:", error)
      setConnectionError(true)
      return false
    }
  }, [])

  // Fetch todos function
  const fetchTodos = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true)
        setConnectionError(false)

        // 연결 테스트
        const isConnected = await testConnection()
        if (!isConnected) {
          // 캐시된 데이터가 있으면 사용
          const cachedTodos = getCachedData<TodoWithSubtasks[]>(CACHE_KEYS.TODOS)
          if (cachedTodos) {
            console.log("Using cached todos due to connection error")
            setTodos(cachedTodos)
            setLoading(false)
            return
          }
          throw new Error("Supabase connection failed and no cached data available")
        }

        // Check if we should use cache
        if (!forceRefresh && !shouldRefreshCache()) {
          const cachedTodos = getCachedData<TodoWithSubtasks[]>(CACHE_KEYS.TODOS)
          if (cachedTodos && cachedTodos.length >= 0) {
            console.log("Using cached todos")
            setTodos(cachedTodos)
            setLoading(false)
            return
          }
        }

        console.log("Fetching todos from database")

        // Fetch todos that are not completed
        const { data: todosData, error: todosError } = await supabase
          .from("todos")
          .select("id, text, date, important, created_at")
          .eq("completed", false)
          .order("created_at", { ascending: false })

        if (todosError) {
          console.error("Supabase error:", todosError)
          throw todosError
        }

        // Set initial todos without subtasks
        const initialTodos = (todosData || []).map((todo: Todo) => ({
          ...todo,
          subtasks: [],
          subtasksLoaded: false,
        }))

        // Cache the data
        cacheData(CACHE_KEYS.TODOS, initialTodos)
        updateCacheTimestamp()

        setTodos(initialTodos)

        if (forceRefresh) {
          toast({
            title: "새로고침 완료",
            description: "할일 목록이 업데이트되었습니다.",
          })
        }
      } catch (error) {
        console.error("Error fetching todos:", error)
        setConnectionError(true)

        // 캐시된 데이터가 있으면 사용
        const cachedTodos = getCachedData<TodoWithSubtasks[]>(CACHE_KEYS.TODOS)
        if (cachedTodos) {
          console.log("Using cached todos due to error")
          setTodos(cachedTodos)
          toast({
            title: "오프라인 모드",
            description: "캐시된 데이터를 사용합니다. 네트워크 연결을 확인해주세요.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "연결 오류",
            description: "Supabase에 연결할 수 없습니다. 네트워크 연결과 환경 변수를 확인해주세요.",
            variant: "destructive",
          })
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [toast, testConnection],
  )

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchTodos(true)
  }, [fetchTodos])

  // Initial load
  useEffect(() => {
    fetchTodos(false)
  }, [fetchTodos])

  // Function to load subtasks for a specific todo
  const loadSubtasks = useCallback(
    async (todoId: string) => {
      try {
        const todoIndex = todos.findIndex((todo) => todo.id === todoId)
        if (todoIndex === -1 || todos[todoIndex].subtasksLoaded) return

        // Update the specific todo to show it's loading subtasks
        setTodos((prevTodos) => {
          const updatedTodos = [...prevTodos]
          updatedTodos[todoIndex] = { ...updatedTodos[todoIndex], subtasksLoading: true }
          return updatedTodos
        })

        // Fetch subtasks for this todo
        const { data: subtasksData, error: subtasksError } = await supabase
          .from("subtasks")
          .select("*")
          .eq("todo_id", todoId)

        if (subtasksError) throw subtasksError

        // Update the specific todo with its subtasks
        setTodos((prevTodos) => {
          const updatedTodos = [...prevTodos]
          updatedTodos[todoIndex] = {
            ...updatedTodos[todoIndex],
            subtasks: subtasksData || [],
            subtasksLoaded: true,
            subtasksLoading: false,
          }

          // Update cache
          cacheData(CACHE_KEYS.TODOS, updatedTodos)

          return updatedTodos
        })
      } catch (error) {
        console.error("Error loading subtasks:", error)
        toast({
          title: "에러",
          description: "서브태스크를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    },
    [todos, toast],
  )

  // Handle subtask changes
  const handleSubtaskChange = useCallback((todoId: string, updatedSubtasks: SubTask[]) => {
    setTodos((prevTodos) => {
      const updatedTodos = prevTodos.map((todo) => (todo.id === todoId ? { ...todo, subtasks: updatedSubtasks } : todo))

      // Update cache
      cacheData(CACHE_KEYS.TODOS, updatedTodos)

      return updatedTodos
    })
  }, [])

  const addTodo = useCallback(async () => {
    if (newTodo.trim() === "") return

    try {
      setSubmitting(true)

      // Insert new todo
      const { data: newTodoData, error: todoError } = await supabase
        .from("todos")
        .insert({
          text: newTodo,
          date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : null,
          completed: false,
          important: false,
        })
        .select()

      if (todoError) throw todoError

      // Add the new todo to the state with empty subtasks array
      if (newTodoData && newTodoData.length > 0) {
        setTodos((prevTodos) => {
          const updatedTodos = [{ ...newTodoData[0], subtasks: [], subtasksLoaded: false }, ...prevTodos]

          // Update cache
          cacheData(CACHE_KEYS.TODOS, updatedTodos)

          return updatedTodos
        })
      }

      setNewTodo("")
      setSelectedDate(undefined)
    } catch (error) {
      console.error("Error adding todo:", error)
      toast({
        title: "에러",
        description: "할일을 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }, [newTodo, selectedDate, toast])

  const toggleTodo = useCallback(
    async (id: string, currentStatus: boolean) => {
      try {
        const now = new Date().toISOString()
        const updateData = !currentStatus
          ? { completed: true, completed_at: now }
          : { completed: false, completed_at: null }

        const { error } = await supabase.from("todos").update(updateData).eq("id", id)

        if (error) throw error

        if (!currentStatus) {
          // If marking as completed, remove from the list
          setTodos((prevTodos) => {
            const updatedTodos = prevTodos.filter((todo) => todo.id !== id)

            // Update cache
            cacheData(CACHE_KEYS.TODOS, updatedTodos)

            return updatedTodos
          })

          // Clear completed todos cache
          localStorage.removeItem(CACHE_KEYS.COMPLETED_TODOS)
        } else {
          // If marking as not completed, update the state
          setTodos((prevTodos) => {
            const updatedTodos = prevTodos.map((todo) =>
              todo.id === id ? { ...todo, completed: false, completed_at: null } : todo,
            )

            // Update cache
            cacheData(CACHE_KEYS.TODOS, updatedTodos)

            return updatedTodos
          })
        }
      } catch (error) {
        console.error("Error toggling todo:", error)
        toast({
          title: "에러",
          description: "할일 상태를 변경하는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const deleteTodo = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from("todos").delete().eq("id", id)

        if (error) throw error

        setTodos((prevTodos) => {
          const updatedTodos = prevTodos.filter((todo) => todo.id !== id)

          // Update cache
          cacheData(CACHE_KEYS.TODOS, updatedTodos)

          return updatedTodos
        })
      } catch (error) {
        console.error("Error deleting todo:", error)
        toast({
          title: "에러",
          description: "할일을 삭제하는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const toggleImportant = useCallback(
    async (id: string, currentStatus: boolean) => {
      try {
        const { error } = await supabase.from("todos").update({ important: !currentStatus }).eq("id", id)

        if (error) throw error

        setTodos((prevTodos) => {
          const updatedTodos = prevTodos.map((todo) =>
            todo.id === id ? { ...todo, important: !todo.important } : todo,
          )

          // Update cache
          cacheData(CACHE_KEYS.TODOS, updatedTodos)

          return updatedTodos
        })
      } catch (error) {
        console.error("Error toggling importance:", error)
        toast({
          title: "에러",
          description: "중요 표시를 변경하는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }

  // Handle completed tasks click
  const handleCompletedTasksClick = () => {
    // Clear completed todos cache
    localStorage.removeItem(CACHE_KEYS.COMPLETED_TODOS)
    router.push("/completed")
  }

  // Generate next 28 days for the calendar - memoized to prevent recalculation
  const calendarDays = useMemo(() => {
    const days = []
    const today = startOfToday()

    for (let i = 0; i < 28; i++) {
      const date = addDays(today, i)
      days.push(date)
    }

    return days
  }, [])

  // Format day of week in Korean
  const formatDayOfWeek = (date: Date) => {
    return format(date, "EEE", { locale: ko })
  }

  // Check if a date is Sunday (0 in JavaScript)
  const isSunday = (date: Date) => {
    return getDay(date) === 0
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title="새로고침"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <CardTitle className="text-2xl font-bold">할일 관리</CardTitle>
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent>
          {/* Connection error alert */}
          {connectionError && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supabase 연결에 문제가 있습니다. 환경 변수와 네트워크 연결을 확인해주세요.
                {todos.length > 0 && " 캐시된 데이터를 표시하고 있습니다."}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2 mb-6">
            <Input
              placeholder="새로운 할일 추가..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={submitting || connectionError}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-transparent"
                  disabled={submitting || connectionError}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
              </PopoverContent>
            </Popover>
            <Button onClick={addTodo} size="icon" disabled={submitting || connectionError}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <TaskSkeleton />
              <TaskSkeleton />
              <TaskSkeleton />
            </div>
          ) : (
            <div className="space-y-2">
              {todos.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">할일이 없습니다. 새로운 할일을 추가해보세요!</p>
              ) : (
                todos.map((todo) => (
                  <TaskItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                    onToggleImportant={toggleImportant}
                    onLoadSubtasks={loadSubtasks}
                    onSubtaskChange={handleSubtaskChange}
                  />
                ))
              )}
            </div>
          )}

          {/* Simple 4-week calendar */}
          <div className="mt-8 border-t pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium mb-2">앞으로 4주간의 일정</h3>

            {/* Week headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["월", "화", "수", "목", "금", "토", "일"].map((day, index) => (
                <div key={index} className="text-center">
                  <div className={`text-xs font-medium ${index === 6 ? "text-red-500" : ""}`}>{day}</div>
                </div>
              ))}
            </div>

            {/* 4 weeks of calendar */}
            {[0, 1, 2, 3].map((weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((date, index) => (
                  <div key={index} className="text-center">
                    <div
                      className={`text-sm rounded-full w-8 h-8 flex items-center justify-center mx-auto ${
                        getDay(date) === 0 ? "text-red-500" : ""
                      }`}
                    >
                      {format(date, "d")}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Link to completed tasks */}
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={handleCompletedTasksClick}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              완료된 할일 보기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
