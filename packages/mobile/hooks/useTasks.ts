import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type TaskItem = {
  id: string
  title: string
  completed: boolean
  completed_at?: string | null
  sort_order?: number | null
  date?: string
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function useTasks() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayKey()

  const tasksQuery = useQuery<TaskItem[]>({
    queryKey: ['tasks', today, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return []
      const result = await supabase
        .from('tasks')
        .select('id,title,completed,completed_at,sort_order,date')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (result.error) {
        throw result.error
      }

      return result.data ?? []
    },
  })

  useEffect(() => {
    if (!user?.id) return undefined

    const channel = supabase
      .channel(`tasks-${user.id}-${today}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', today, user.id] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, today, user?.id])

  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!user?.id) throw new Error('Missing user session')
      const existingTasks = tasksQuery.data ?? []
      const tasksTable = supabase.from('tasks') as any
      const result = await tasksTable
        .insert([
          {
            user_id: user.id,
            title,
            completed: false,
            date: today,
            sort_order: existingTasks.length + 1,
          },
        ])
        .select('id,title,completed,completed_at,sort_order,date')
        .single()

      if (result.error) throw result.error
      return result.data as TaskItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', today, user?.id] })
    },
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async (task: TaskItem) => {
      const tasksTable = supabase.from('tasks') as any
      const result = await tasksTable
        .update({
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : null,
        })
        .eq('id', task.id)
        .select('id,title,completed,completed_at,sort_order,date')
        .single()

      if (result.error) throw result.error
      return result.data as TaskItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', today, user?.id] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await supabase.from('tasks').delete().eq('id', id)
      if (result.error) throw result.error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', today, user?.id] })
    },
  })

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,
    addTask: addTaskMutation.mutateAsync,
    toggleTask: toggleTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    isSaving: addTaskMutation.isPending || toggleTaskMutation.isPending || deleteTaskMutation.isPending,
  }
}
