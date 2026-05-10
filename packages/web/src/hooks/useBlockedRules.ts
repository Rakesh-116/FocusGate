/* Shared blocked-link state and mutations backed by Supabase block groups. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type BlockedRuleItem = {
  id: string
  app_or_url: string
}

const DEFAULT_BLOCK_GROUP_NAME = 'FocusGate Web Blocklist'

function normalizeRule(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

async function ensureDefaultBlockGroup(userId: string) {
  const existingGroupResult = await supabase
    .from('block_groups')
    .select('id')
    .eq('user_id', userId)
    .eq('name', DEFAULT_BLOCK_GROUP_NAME)
    .maybeSingle()

  if (existingGroupResult.error) throw existingGroupResult.error
  if (existingGroupResult.data?.id) return existingGroupResult.data.id as string

  const createdGroupResult = await supabase
    .from('block_groups')
    .insert([
      {
        user_id: userId,
        name: DEFAULT_BLOCK_GROUP_NAME,
        is_active: true,
        color: '#7C3AED',
        icon: 'shield',
      },
    ])
    .select('id')
    .single()

  if (createdGroupResult.error) throw createdGroupResult.error
  return createdGroupResult.data.id as string
}

export function useBlockedRules(userId: string | null) {
  const queryClient = useQueryClient()

  const blockedRulesQuery = useQuery<BlockedRuleItem[]>({
    queryKey: ['blocked-rules', userId],
    queryFn: async () => {
      if (!userId) return []

      const groupResult = await supabase
        .from('block_groups')
        .select('id')
        .eq('user_id', userId)
        .eq('name', DEFAULT_BLOCK_GROUP_NAME)
        .maybeSingle()

      if (groupResult.error) throw groupResult.error
      if (!groupResult.data?.id) return []

      const itemsResult = await supabase
        .from('block_group_items')
        .select('id,app_or_url')
        .eq('group_id', groupResult.data.id)
        .in('platform', ['web', 'all'])
        .order('app_or_url', { ascending: true })

      if (itemsResult.error) throw itemsResult.error
      return (itemsResult.data ?? []) as BlockedRuleItem[]
    },
    enabled: !!userId,
  })

  const addBlockedRuleMutation = useMutation<BlockedRuleItem, Error, string>({
    mutationFn: async (rule) => {
      if (!userId) throw new Error('You must be signed in to save blocked links.')
      const normalizedRule = normalizeRule(rule)
      if (!normalizedRule) throw new Error('Enter a valid URL prefix.')

      const existingRules = blockedRulesQuery.data ?? []
      if (existingRules.some((item) => item.app_or_url === normalizedRule)) {
        throw new Error('That blocked link already exists.')
      }

      const groupId = await ensureDefaultBlockGroup(userId)
      const insertResult = await supabase
        .from('block_group_items')
        .insert([
          {
            group_id: groupId,
            app_or_url: normalizedRule,
            platform: 'web',
          },
        ])
        .select('id,app_or_url')
        .single()

      if (insertResult.error) throw insertResult.error
      return insertResult.data as BlockedRuleItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-rules', userId] })
    },
  })

  const removeBlockedRuleMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      const deleteResult = await supabase.from('block_group_items').delete().eq('id', id)
      if (deleteResult.error) throw deleteResult.error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-rules', userId] })
    },
  })

  return {
    blockedRules: blockedRulesQuery.data ?? [],
    isLoading: blockedRulesQuery.isLoading,
    addBlockedRule: async (rule: string) => {
      await addBlockedRuleMutation.mutateAsync(rule)
    },
    removeBlockedRule: async (id: string) => {
      await removeBlockedRuleMutation.mutateAsync(id)
    },
    addError: addBlockedRuleMutation.error,
    removeError: removeBlockedRuleMutation.error,
  }
}
