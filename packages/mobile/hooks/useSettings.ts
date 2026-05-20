import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type UserSettings = {
  show_tasks_on_block_screen: boolean
  show_vision_cards_on_block_screen: boolean
  show_quotes_on_block_screen: boolean
  bypass_cooldown_seconds: number
  bypass_requires_reason: boolean
  pomodoro_work_minutes: number | null
  pomodoro_break_minutes: number | null
  current_streak: number | null
  longest_streak: number | null
}

export const DEFAULT_SETTINGS: UserSettings = {
  show_tasks_on_block_screen: true,
  show_vision_cards_on_block_screen: true,
  show_quotes_on_block_screen: true,
  bypass_cooldown_seconds: 30,
  bypass_requires_reason: true,
  pomodoro_work_minutes: 25,
  pomodoro_break_minutes: 5,
  current_streak: 0,
  longest_streak: 0,
}

export function useSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const settingsQuery = useQuery<UserSettings>({
    queryKey: ['user-settings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return DEFAULT_SETTINGS
      const result = await supabase
        .from('user_settings')
        .select(
          'show_tasks_on_block_screen,show_vision_cards_on_block_screen,show_quotes_on_block_screen,bypass_cooldown_seconds,bypass_requires_reason,pomodoro_work_minutes,pomodoro_break_minutes,current_streak,longest_streak',
        )
        .eq('user_id', user.id)
        .single()

      if (result.error) throw result.error
      return { ...DEFAULT_SETTINGS, ...(result.data as Partial<UserSettings>) }
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: async (partial: Partial<UserSettings>) => {
      if (!user?.id) throw new Error('Missing user session')
      const settingsTable = supabase.from('user_settings') as any
      const result = await settingsTable
        .update(partial)
        .eq('user_id', user.id)
        .select(
          'show_tasks_on_block_screen,show_vision_cards_on_block_screen,show_quotes_on_block_screen,bypass_cooldown_seconds,bypass_requires_reason,pomodoro_work_minutes,pomodoro_break_minutes,current_streak,longest_streak',
        )
        .single()

      if (result.error) throw result.error
      return { ...DEFAULT_SETTINGS, ...(result.data as Partial<UserSettings>) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] })
    },
  })

  return {
    settings: settingsQuery.data ?? DEFAULT_SETTINGS,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
    updateSettings: updateSettingsMutation.mutateAsync,
    isSaving: updateSettingsMutation.isPending,
  }
}
