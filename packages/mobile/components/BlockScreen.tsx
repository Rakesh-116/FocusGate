import { useEffect, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from '../constants/colors'
import { DEFAULT_SETTINGS, useSettings } from '../hooks/useSettings'
import { useTasks } from '../hooks/useTasks'
import { useVisionCards } from '../hooks/useVisionCards'
import { Button } from './ui/Button'
import { supabase } from '../lib/supabase'

export interface BlockScreenProps {
  blockedApp?: string
  onBypass?: (reason: string) => void
  onClose?: () => void
}

type Quote = {
  id: string
  text: string
  author: string
}

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export function BlockScreen({ blockedApp, onBypass, onClose }: BlockScreenProps) {
  const { settings } = useSettings()
  const { tasks, toggleTask } = useTasks()
  const { visionCards } = useVisionCards()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(settings.bypass_cooldown_seconds)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    async function loadQuote() {
      try {
        const countRes = await supabase.from('quotes').select('id', { count: 'exact', head: true })
        const total = countRes.count ?? 0
        if (!total) return
        const offset = getDayOfYear(new Date()) % total
        const quoteRes = await supabase.from('quotes').select('id,text,author').range(offset, offset).single()
        if (!quoteRes.error) {
          setQuote(quoteRes.data as Quote)
        }
      } catch (error) {
        console.error('Failed to load quote', error)
      }
    }

    void loadQuote()
  }, [])

  const visibleTasks = tasks.filter((task) => !task.completed)
  const effectiveSettings = settings ?? DEFAULT_SETTINGS

  useEffect(() => {
    setSecondsLeft(effectiveSettings.bypass_cooldown_seconds)
  }, [effectiveSettings.bypass_cooldown_seconds, panelOpen])

  useEffect(() => {
    if (!panelOpen || effectiveSettings.bypass_cooldown_seconds <= 0) return undefined
    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [effectiveSettings.bypass_cooldown_seconds, panelOpen])

  useEffect(() => {
    if (visibleTasks.length === 0 && tasks.length > 0) {
      const timeout = setTimeout(() => {
        onBypass?.('')
      }, 2000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [onBypass, tasks.length, visibleTasks.length])

  async function handleBypass() {
    if (effectiveSettings.bypass_requires_reason && !reason.trim()) {
      setShowError(true)
      return
    }
    if (effectiveSettings.bypass_cooldown_seconds > 0 && secondsLeft > 0) {
      return
    }
    try {
      const userResult = await supabase.auth.getUser()
      const userId = userResult.data.user?.id
      if (userId) {
        const blockAttemptsTable = supabase.from('block_attempts') as any
        await blockAttemptsTable.insert([
          {
            user_id: userId,
            app_or_url: blockedApp ?? 'mobile-block',
            attempted_at: new Date().toISOString(),
            bypassed: true,
            bypass_reason: reason.trim() || null,
            bypass_waited_seconds: effectiveSettings.bypass_cooldown_seconds > 0 ? effectiveSettings.bypass_cooldown_seconds : 0,
          },
        ])
      }
    } catch (error) {
      console.error('Failed to log bypass attempt', error)
    }
    setPanelOpen(false)
    onBypass?.(reason.trim())
  }

  return (
    <View style={styles.container}>
      {effectiveSettings.show_quotes_on_block_screen && (
        <View style={styles.section}>
          <Text style={styles.quoteText}>"{quote?.text ?? 'Focus is the ability to say no to distractions.'}"</Text>
          <Text style={styles.quoteAuthor}>{quote?.author ?? 'FocusGate'}</Text>
        </View>
      )}

      {effectiveSettings.show_tasks_on_block_screen && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Finish these first</Text>
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <Pressable key={task.id} onPress={() => void toggleTask(task)} style={styles.taskRow}>
                <View style={styles.taskCheckbox} />
                <Text style={styles.taskText}>{task.title}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No tasks for today. Set some in FocusGate.</Text>
          )}
        </View>
      )}

      {effectiveSettings.show_vision_cards_on_block_screen && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Vision board</Text>
          <FlatList
            data={visionCards}
            horizontal
            pagingEnabled
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.visionSlide}>
                <Text style={styles.visionCaption}>{item.caption ?? 'Stay connected to your why'}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Add vision cards in FocusGate to see them here.</Text>}
          />
        </View>
      )}

      {effectiveSettings.bypass_cooldown_seconds !== -1 && (
        <View style={styles.footer}>
          <Text style={styles.blockedLabel}>{blockedApp ? `Blocked app: ${blockedApp}` : 'Blocked app'}</Text>
          <Pressable onPress={() => setPanelOpen(true)}>
            <Text style={styles.emergencyLink}>Emergency Unlock</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setPanelOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency unlock</Text>
            {effectiveSettings.bypass_cooldown_seconds > 0 ? (
              <Text style={styles.modalCopy}>Countdown: {secondsLeft}s</Text>
            ) : null}
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for bypass"
              placeholderTextColor={colors.textMuted}
              style={styles.textarea}
            />
            {showError ? <Text style={styles.errorText}>Please enter a reason before bypassing.</Text> : null}
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setPanelOpen(false)} style={{ flex: 1 }} />
              <Button label="Confirm" onPress={() => void handleBypass()} style={{ flex: 1 }} />
            </View>
            {onClose ? <Button label="Close" variant="secondary" onPress={onClose} style={{ marginTop: 12 }} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    gap: 16,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
  },
  eyebrow: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: 10,
  },
  quoteText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 34,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: colors.purpleLight,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '700',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.purpleLight,
  },
  taskText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  visionSlide: {
    width: 280,
    height: 140,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'flex-end',
    padding: 14,
    marginRight: 12,
  },
  visionCaption: {
    color: colors.text,
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: 8,
  },
  blockedLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  emergencyLink: {
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  modalCopy: {
    color: colors.textMuted,
    marginTop: 8,
  },
  textarea: {
    minHeight: 120,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    color: colors.text,
    padding: 14,
    marginTop: 14,
  },
  errorText: {
    color: colors.red,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
})
