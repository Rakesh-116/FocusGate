import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import { DEFAULT_SETTINGS, UserSettings, useSettings } from '../../hooks/useSettings'
import {
  DEFAULT_ANDROID_BLOCKLIST,
  getBlocklist,
  isAccessibilityEnabled,
  isBlockingEnabled,
  openAccessibilitySettings,
  startBlockingService,
  stopBlockingService,
  updateBlocklist,
} from '../../modules/blocking'

type BlockingState = {
  accessibilityEnabled: boolean
  blockingEnabled: boolean
  blockedPackages: string[]
}

const DEFAULT_BLOCKING_STATE: BlockingState = {
  accessibilityEnabled: false,
  blockingEnabled: false,
  blockedPackages: [],
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { settings, updateSettings, isSaving } = useSettings()
  const [draft, setDraft] = useState<UserSettings>(settings ?? DEFAULT_SETTINGS)
  const [savedNotice, setSavedNotice] = useState('')
  const [blockingState, setBlockingState] = useState<BlockingState>(DEFAULT_BLOCKING_STATE)
  const [blockingError, setBlockingError] = useState('')
  const [blockingBusy, setBlockingBusy] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  useEffect(() => {
    if (!savedNotice) return undefined
    const timeout = setTimeout(() => setSavedNotice(''), 1500)
    return () => clearTimeout(timeout)
  }, [savedNotice])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  async function hydrateBlockingState() {
    try {
      const [accessibilityEnabled, blockingEnabled, blockedPackages] = await Promise.all([
        isAccessibilityEnabled(),
        isBlockingEnabled(),
        getBlocklist(),
      ])

      setBlockingState({
        accessibilityEnabled,
        blockingEnabled,
        blockedPackages,
      })
    } catch (error) {
      setBlockingError(error instanceof Error ? error.message : 'Unable to load Android blocking state.')
    }
  }

  useFocusEffect(
    useCallback(() => {
      void hydrateBlockingState()
    }, []),
  )

  function updateDraft<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    const nextDraft = { ...draft, [key]: value }
    setDraft(nextDraft)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await updateSettings({ [key]: value })
      setSavedNotice('Saved')
    }, 500)
  }

  async function handleSignOut() {
    await signOut()
  }

  async function handleOpenAccessibilitySettings() {
    try {
      setBlockingBusy(true)
      setBlockingError('')
      await openAccessibilitySettings()
    } catch (error) {
      setBlockingError(error instanceof Error ? error.message : 'Unable to open Android accessibility settings.')
    } finally {
      setBlockingBusy(false)
    }
  }

  async function handleToggleAppBlocking() {
    try {
      setBlockingBusy(true)
      setBlockingError('')

      if (!blockingState.blockingEnabled) {
        await updateBlocklist(DEFAULT_ANDROID_BLOCKLIST)
        await startBlockingService()
        const accessibilityReady = await isAccessibilityEnabled()
        if (!accessibilityReady) {
          await openAccessibilitySettings()
        }
      } else {
        await stopBlockingService()
      }

      await hydrateBlockingState()
    } catch (error) {
      setBlockingError(error instanceof Error ? error.message : 'Unable to update Android blocking state.')
    } finally {
      setBlockingBusy(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.mutedText}>{user?.email ?? 'No email found'}</Text>
        <Button label="Sign Out" variant="danger" onPress={() => void handleSignOut()} style={{ marginTop: 14 }} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Block Screen</Text>
        <SettingToggle label="Show tasks" value={draft.show_tasks_on_block_screen} onValueChange={(value) => updateDraft('show_tasks_on_block_screen', value)} />
        <SettingToggle label="Show vision cards" value={draft.show_vision_cards_on_block_screen} onValueChange={(value) => updateDraft('show_vision_cards_on_block_screen', value)} />
        <SettingToggle label="Show daily quote" value={draft.show_quotes_on_block_screen} onValueChange={(value) => updateDraft('show_quotes_on_block_screen', value)} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Android App Blocking</Text>
        <Text style={styles.mutedText}>
          FocusGate now uses an Android Accessibility Service to detect supported short-form surfaces and bounce you into the FocusGate block screen instead of blocking the whole app.
        </Text>
        <Text style={styles.mutedText}>
          Accessibility permission: {blockingState.accessibilityEnabled ? 'Enabled' : 'Not enabled'}
        </Text>
        <Text style={styles.mutedText}>
          Blocking toggle: {blockingState.blockingEnabled ? 'Active' : 'Off'}
        </Text>
        <Text style={styles.mutedText}>
          Supported packages: {(blockingState.blockedPackages.length ? blockingState.blockedPackages : DEFAULT_ANDROID_BLOCKLIST).join(', ')}
        </Text>
        <Text style={styles.mutedText}>
          Current heuristic targets: YouTube Shorts, Instagram Reels, Snapchat Spotlight, and LinkedIn immersive video surfaces.
        </Text>
        {blockingError ? <Text style={styles.errorText}>{blockingError}</Text> : null}
        <Button
          label="Open Accessibility Settings"
          variant="secondary"
          loading={blockingBusy}
          onPress={() => void handleOpenAccessibilitySettings()}
          style={{ marginTop: 14 }}
        />
        <Button
          label={blockingState.blockingEnabled ? 'Turn Off Short-Video Blocking' : 'Turn On Short-Video Blocking'}
          loading={blockingBusy}
          onPress={() => void handleToggleAppBlocking()}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Emergency Bypass</Text>
        <Text style={styles.mutedText}>Cooldown: {draft.bypass_cooldown_seconds}s</Text>
        <View style={styles.cooldownRow}>
          {[0, 15, 30, 60, -1].map((value) => (
            <Button
              key={value}
              label={value === -1 ? 'Disabled' : value === 0 ? 'Instant' : `${value}s`}
              variant={draft.bypass_cooldown_seconds === value ? 'primary' : 'secondary'}
              onPress={() => updateDraft('bypass_cooldown_seconds', value)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <SettingToggle label="Require a reason to bypass" value={draft.bypass_requires_reason} onValueChange={(value) => updateDraft('bypass_requires_reason', value)} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Pomodoro</Text>
        <View style={styles.inputRow}>
          <Input
            placeholder="Work minutes"
            keyboardType="number-pad"
            value={String(draft.pomodoro_work_minutes ?? 25)}
            onChangeText={(value) => setDraft((current) => ({ ...current, pomodoro_work_minutes: Number(value || 25) }))}
          />
          <Input
            placeholder="Break minutes"
            keyboardType="number-pad"
            value={String(draft.pomodoro_break_minutes ?? 5)}
            onChangeText={(value) => setDraft((current) => ({ ...current, pomodoro_break_minutes: Number(value || 5) }))}
          />
        </View>
        <Button
          label={isSaving ? 'Saving...' : 'Save Pomodoro'}
          onPress={() =>
            void updateSettings({
              pomodoro_work_minutes: draft.pomodoro_work_minutes,
              pomodoro_break_minutes: draft.pomodoro_break_minutes,
            }).then(() => setSavedNotice('Saved'))
          }
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Stats</Text>
        <Text style={styles.mutedText}>Current streak: {draft.current_streak ?? 0} days</Text>
        <Text style={styles.mutedText}>Longest streak: {draft.longest_streak ?? 0} days</Text>
      </Card>

      {savedNotice ? <Text style={styles.savedText}>{savedNotice}</Text> : null}
    </ScrollView>
  )
}

function SettingToggle({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.purple, false: '#334155' }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  mutedText: { color: colors.textMuted, marginTop: 8 },
  errorText: { color: colors.red, marginTop: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel: { color: colors.text, fontSize: 15, flex: 1, marginRight: 12 },
  cooldownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  inputRow: { gap: 10 },
  savedText: { color: colors.green, textAlign: 'center', fontWeight: '700', marginTop: 8 },
})
