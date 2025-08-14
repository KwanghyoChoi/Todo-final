"use client"

import { useState, useEffect, useMemo } from "react"
import { ArrowLeft, CalendarIcon, X, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { ko } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase, type Todo } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { CompletedTaskSkeleton } from "@/components/completed-task-skeleton"
import { CACHE_KEYS, cacheData } from "@/lib/cache-utils"

export default function CompletedTasks() {
  const [completedTasks, setCompletedTasks] = useState<Todo[]>([])
  const [allCompletedTasks, setAllCompletedTasks] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const { toast } = useToast()

  // 데이터 새로고침 함수
  const refreshData = async () => {
    try {
      setRefreshing(true)
      setLoading(true)

      console.log("Refreshing completed todos from database")

      // Fetch completed todos - only select needed fields
      const { data, error } = await supabase
        .from("todos")
        .select("id, text, date, important, completed_at")
        .eq("completed", true)
        .order("completed_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      // Cache the data
      cacheData(CACHE_KEYS.COMPLETED_TODOS, data || [])

      setAllCompletedTasks(data || [])
      setCompletedTasks(data || [])

      toast({
        title: "새로고침 완료",
        description: "완료된 할일 목록이 업데이트되었습니다.",
      })
    } catch (error) {
      console.error("Error refreshing completed tasks:", error)
      toast({
        title: "에러",
        description: "완료된 할일을 새로고침하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    async function fetchCompletedTasks() {
      try {
        setLoading(true)

        console.log("Fetching completed todos from database")

        // Fetch completed todos - only select needed fields
        const { data, error } = await supabase
          .from("todos")
          .select("id, text, date, important, completed_at")
          .eq("completed", true)
          .order("completed_at", { ascending: false })

        if (error) {
          console.error("Supabase error:", error)
          throw error
        }

        // Cache the data
        cacheData(CACHE_KEYS.COMPLETED_TODOS, data || [])

        setAllCompletedTasks(data || [])
        setCompletedTasks(data || [])
      } catch (error) {
        console.error("Error fetching completed tasks:", error)
        toast({
          title: "에러",
          description: "완료된 할일을 불러오는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCompletedTasks()
  }, [toast])

  // 완료된 할일 삭제 함수
  const deleteCompletedTask = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id)

      if (error) throw error

      // 로컬 상태 업데이트
      const updatedTasks = allCompletedTasks.filter((task) => task.id !== id)
      setAllCompletedTasks(updatedTasks)

      // 필터링된 목록도 업데이트
      setCompletedTasks((prev) => prev.filter((task) => task.id !== id))

      // 캐시 업데이트
      cacheData(CACHE_KEYS.COMPLETED_TODOS, updatedTasks)

      toast({
        title: "삭제 완료",
        description: "완료된 할일이 삭제되었습니다.",
      })
    } catch (error) {
      console.error("Error deleting completed task:", error)
      toast({
        title: "에러",
        description: "완료된 할일을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // Apply date range filter - memoized to prevent recalculation on every render
  const filteredTasks = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      // If no date range is selected, show all tasks
      return allCompletedTasks
    }

    // Filter tasks based on the selected date range
    return allCompletedTasks.filter((task) => {
      if (!task.completed_at) return false

      const completedDate = parseISO(task.completed_at)

      if (dateRange.from && dateRange.to) {
        // Both start and end dates are selected
        return isWithinInterval(completedDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        })
      } else if (dateRange.from) {
        // Only start date is selected
        return completedDate >= startOfDay(dateRange.from)
      } else if (dateRange.to) {
        // Only end date is selected
        return completedDate <= endOfDay(dateRange.to)
      }

      return true
    })
  }, [dateRange, allCompletedTasks])

  // Update the displayed tasks when the filter changes
  useEffect(() => {
    setCompletedTasks(filteredTasks)
  }, [filteredTasks])

  // Format date from ISO string
  const formatDateFromISO = (dateString: string | null) => {
    if (!dateString) return null
    try {
      const date = parseISO(dateString)
      return format(date, "yyyy년 MM월 dd일 HH:mm", { locale: ko })
    } catch (error) {
      console.error("Error parsing date:", error)
      return null
    }
  }

  // Reset date range filter
  const resetDateFilter = () => {
    setDateRange({ from: undefined, to: undefined })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" passHref>
                <Button variant="ghost" size="icon" className="mr-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <CardTitle className="text-2xl font-bold">완료된 할일</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
                disabled={refreshing}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                title="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date range filter */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      (dateRange.from || dateRange.to) && "text-blue-600 dark:text-blue-400",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from || dateRange.to ? (
                      <span>
                        {dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "시작일"}
                        {" ~ "}
                        {dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "종료일"}
                      </span>
                    ) : (
                      <span>날짜 범위 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range || { from: undefined, to: undefined })
                      if (range?.to) {
                        setIsCalendarOpen(false)
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {(dateRange.from || dateRange.to) && (
                <Button variant="ghost" size="icon" onClick={resetDateFilter} className="h-8 w-8" title="필터 초기화">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">{completedTasks.length}개 항목</div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <CompletedTaskSkeleton />
              <CompletedTaskSkeleton />
              <CompletedTaskSkeleton />
            </div>
          ) : (
            <div className="space-y-4">
              {completedTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {dateRange.from || dateRange.to
                    ? "선택한 날짜 범위에 완료된 할일이 없습니다."
                    : "완료된 할일이 없습니다."}
                </p>
              ) : (
                completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <div className="h-5 w-5 rounded-full bg-green-500 mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-medium">{task.text}</h3>
                          <div className="text-sm text-muted-foreground mt-1">
                            {task.date && <div>예정일: {formatDateFromISO(task.date)}</div>}
                            <div>완료일: {formatDateFromISO(task.completed_at)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start ml-2">
                        {task.important && (
                          <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-900 dark:text-yellow-200 mr-2">
                            중요
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCompletedTask(task.id)}
                          className="h-8 w-8 text-gray-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
