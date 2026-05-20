import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Card } from '../../components/ui/Card'
import { colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { useTasks } from '../../hooks/useTasks'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'expo-router'

function formatDate() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { tasks, isLoading: tasksLoading } = useTasks()
  const [sheetOpen, setSheetOpen] = useState(false)

  const blockedSummaryQuery = useQuery<{ count: number; rules: string[] }>({
    queryKey: ['blocked-summary', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { count: 0, rules: [] }
      const blockGroupsTable = supabase.from('block_groups') as any
      const blockGroupItemsTable = supabase.from('block_group_items') as any
      const groupsResult = await blockGroupsTable.select('id').eq('user_id', user.id).eq('is_active', true)
      if (groupsResult.error) throw groupsResult.error
      const groupIds = (groupsResult.data ?? []).map((group: { id: string }) => group.id)
      if (!groupIds.length) return { count: 0, rules: [] }
      const rulesResult = await blockGroupItemsTable.select('app_or_url').in('group_id', groupIds)
      if (rulesResult.error) throw rulesResult.error
      const rules = (rulesResult.data ?? []).map((rule: { app_or_url: string }) => rule.app_or_url)
      return { count: rules.length, rules }
    },
  })

  const firstName = useMemo(() => user?.email?.split('@')[0] ?? 'FocusGate user', [user?.email])
  const completedCount = tasks.filter((task) => task.completed).length
  const totalCount = tasks.length
  const incompleteTasks = tasks.filter((task) => !task.completed)
  const progress = totalCount > 0 ? completedCount / totalCount : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.eyebrow}>TODAY | {formatDate()}</Text>
        <Text style={styles.title}>Welcome back, {firstName}</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {settings.current_streak ?? 0} day streak</Text>
        </View>
        <Text style={styles.subtitle}>Stay on track by completing your top tasks.</Text>
      </Card>

      <Card>
        <Text style={styles.eyebrow}>PROGRESS</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} tasks complete
          </Text>
          <Text style={styles.percentText}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progress * 100, totalCount > 0 ? 6 : 0)}%` }]} />
        </View>
        {totalCount > 0 && completedCount === totalCount ? <Text style={styles.successText}>🎉 Day Unlocked!</Text> : null}
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick task preview</Text>
          <Link href="/(app)/tasks" style={styles.linkText}>
            View all tasks →
          </Link>
        </View>
        {tasksLoading ? (
          <Text style={styles.mutedText}>Loading tasks...</Text>
        ) : incompleteTasks.length > 0 ? (
          incompleteTasks.slice(0, 3).map((task) => (
            <View key={task.id} style={styles.pill}>
              <Text style={styles.pillText}>{task.title}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.mutedText}>No incomplete tasks. Nice work.</Text>
        )}
      </Card>

      <Card>
        <Pressable onPress={() => setSheetOpen(true)}>
          <Text style={styles.sectionTitle}>{blockedSummaryQuery.data?.count ?? 0} sites being blocked</Text>
          <Text style={styles.mutedText}>Tap to see the current blocked list mirrored from the web app.</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Day stats</Text>
        <Text style={styles.mutedText}>Tasks completed today: {completedCount}</Text>
        <Text style={styles.mutedText}>Current streak: {settings.current_streak ?? 0} days</Text>
        <Text style={styles.mutedText}>Longest streak: {settings.longest_streak ?? 0} days</Text>
      </Card>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Blocked sites</Text>
            {(blockedSummaryQuery.data?.rules ?? []).length > 0 ? (
              blockedSummaryQuery.data?.rules.map((rule) => (
                <Text key={rule} style={styles.modalRule}>
                  {rule}
                </Text>
              ))
            ) : (
              <Text style={styles.mutedText}>No blocked rules yet.</Text>
            )}
            <Pressable onPress={() => setSheetOpen(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16 },
  eyebrow: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 10 },
  subtitle: { color: colors.textMuted, marginTop: 12, fontSize: 15 },
  streakBadge: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: '#1D1537',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakText: { color: colors.purpleLight, fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  progressText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  percentText: { color: colors.textMuted, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#0F172A', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.purple },
  successText: { color: colors.green, marginTop: 14, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  linkText: { color: colors.purpleLight, fontWeight: '700' },
  mutedText: { color: colors.textMuted, marginTop: 10, fontSize: 14 },
  pill: { backgroundColor: '#0F172A', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  pillText: { color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.card, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalRule: { color: colors.text, fontSize: 15, paddingVertical: 8 },
  closeButton: { marginTop: 16, backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeButtonText: { color: colors.text, fontWeight: '700' },
})
