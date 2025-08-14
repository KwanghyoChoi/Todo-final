"use client"

import type React from "react"

import { useState, memo } from "react"
import { Trash2, Edit2, Check, ChevronDown, ChevronRight, Star, Loader2, Plus } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { supabase, type TodoWithSubtasks, type SubTask } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface TaskItemProps {
  todo: TodoWithSubtasks
  onToggle: (id: string, currentStatus: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleImportant: (id: string, currentStatus: boolean) => Promise<void>
  onLoadSubtasks: (id: string) => Promise<void>
  onSubtaskChange: (todoId: string, updatedSubtasks: SubTask[]) => void
}

export const TaskItem = memo(function TaskItem({
  todo,
  onToggle,
  onDelete,
  onToggleImportant,
  onLoadSubtasks,
  onSubtaskChange,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [newSubtaskText, setNewSubtaskText] = useState("")
  const { toast } = useToast()

  const toggleExpand = async () => {
    const newExpandedState = !expanded
    setExpanded(newExpandedState)

    // Load subtasks if expanding and they haven't been loaded yet
    if (newExpandedState && !todo.subtasksLoaded) {
      await onLoadSubtasks(todo.id)
    }
  }

  const startEditing = () => {
    setEditingId(todo.id)
    setEditText(todo.text)
    setEditDate(todo.date ? parseISO(todo.date) : undefined)
  }

  const saveEdit = async () => {
    if (editText.trim() === "" || !editingId) return

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          text: editText,
          date: editDate ? editDate.toLocaleDateString('en-CA') : null,
        })
        .eq("id", editingId)

      if (error) throw error

      // Update the local state
      todo.text = editText
      todo.date = editDate ? editDate.toLocaleDateString('en-CA') : null

      setEditingId(null)
      setEditText("")
      setEditDate(undefined)
    } catch (error) {
      console.error("Error updating todo:", error)
      toast({
        title: "에러",
        description: "할일을 수정하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit()
    } else if (e.key === "Escape") {
      setEditingId(null)
      setEditText("")
      setEditDate(undefined)
    }
  }

  const addSubtask = async () => {
    if (!newSubtaskText || newSubtaskText.trim() === "") return

    try {
      const { data: newSubtask, error } = await supabase
        .from("subtasks")
        .insert({
          todo_id: todo.id,
          text: newSubtaskText,
          completed: false,
        })
        .select()

      if (error) throw error

      if (newSubtask && newSubtask.length > 0) {
        // Update local state
        const updatedSubtasks = [...todo.subtasks, newSubtask[0]]
        todo.subtasks = updatedSubtasks

        // 부모 컴포넌트에 변경 사항 알림
        onSubtaskChange(todo.id, updatedSubtasks)
      }

      // Clear the input
      setNewSubtaskText("")
    } catch (error) {
      console.error("Error adding subtask:", error)
      toast({
        title: "에러",
        description: "서브태스크를 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const toggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("subtasks").update({ completed: !currentStatus }).eq("id", subtaskId)

      if (error) throw error

      // Update local state
      const updatedSubtasks = todo.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
      )
      todo.subtasks = updatedSubtasks

      // 부모 컴포넌트에 변경 사항 알림
      onSubtaskChange(todo.id, updatedSubtasks)
    } catch (error) {
      console.error("Error toggling subtask:", error)
      toast({
        title: "에러",
        description: "서브태스크 상태를 변경하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const deleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId)

      if (error) throw error

      // Update local state
      const updatedSubtasks = todo.subtasks.filter((subtask) => subtask.id !== subtaskId)
      todo.subtasks = updatedSubtasks

      // 부모 컴포넌트에 변경 사항 알림
      onSubtaskChange(todo.id, updatedSubtasks)
    } catch (error) {
      console.error("Error deleting subtask:", error)
      toast({
        title: "에러",
        description: "서브태스크를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addSubtask()
    }
  }

  // Format date from ISO string
  const formatDateFromISO = (dateString: string | null) => {
    if (!dateString) return null
    try {
      const date = parseISO(dateString)
      return {
        formatted: format(date, "yyyy년 MM월 dd일"),
        dayOfWeek: format(date, "EEE", { locale: ko }),
      }
    } catch (error) {
      console.error("Error parsing date:", error)
      return null
    }
  }

  return (
    <div className="border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3 flex-1">
          <Checkbox checked={todo.completed} onCheckedChange={() => onToggle(todo.id, todo.completed)} />
          <div className="flex-1">
            {editingId === todo.id ? (
              <div className="space-y-2">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  className={`${todo.completed ? "text-muted-foreground" : ""}`}
                />
                <div className="flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Calendar className="h-3 w-3 mr-2" />
                        {editDate ? format(editDate, "yyyy-MM-dd") : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {editDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setEditDate(undefined)}
                    >
                      날짜 삭제
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                <div className="flex items-center">
                  <button
                    onClick={toggleExpand}
                    className="mr-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  <span>{todo.text}</span>
                </div>
                {todo.date && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {formatDateFromISO(todo.date)?.formatted} ({formatDateFromISO(todo.date)?.dayOfWeek})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleImportant(todo.id, todo.important)}
            className={`h-8 w-8 ${todo.important ? "text-yellow-500" : "text-gray-300"}`}
          >
            <Star className={`h-4 w-4 ${todo.important ? "fill-yellow-500" : ""}`} />
          </Button>
          {editingId === todo.id ? (
            <Button variant="ghost" size="icon" onClick={saveEdit} className="h-8 w-8">
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={startEditing}
              className="h-8 w-8 text-gray-300 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(todo.id)}
            className="h-8 w-8 text-gray-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subtasks section */}
      {expanded && (
        <div className="pl-10 pr-3 pb-3">
          {/* Subtask loading indicator */}
          {todo.subtasksLoading && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}

          {/* Subtask list */}
          {todo.subtasksLoaded && todo.subtasks.length > 0 && (
            <div className="space-y-2 mb-2">
              {todo.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between p-2 border-l-2 border-gray-200 dark:border-gray-700 pl-3"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => toggleSubtask(subtask.id, subtask.completed)}
                    />
                    <span className={`${subtask.completed ? "line-through text-muted-foreground" : ""}`}>
                      {subtask.text}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSubtask(subtask.id)}
                    className="h-6 w-6 text-gray-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add subtask input */}
          <div className="flex space-x-2 mt-2">
            <Input
              placeholder="서브 태스크 추가..."
              value={newSubtaskText}
              onChange={(e) => setNewSubtaskText(e.target.value)}
              onKeyDown={handleSubtaskKeyDown}
              className="flex-1 text-sm h-8"
            />
            <Button onClick={addSubtask} size="sm" className="h-8">
              <Plus className="h-3 w-3 mr-1" /> 추가
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
