import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { TaskItem as TaskRow } from '../../components/TaskItem'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { colors } from '../../constants/colors'
import { TaskItem, useTasks } from '../../hooks/useTasks'

export default function TasksScreen() {
  const { tasks, addTask, deleteTask, toggleTask, isLoading, isSaving } = useTasks()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)

  const maxReached = tasks.length >= 7
  const completedCount = tasks.filter((task) => task.completed).length

  async function handleAddTask() {
    if (!title.trim()) return
    if (maxReached) {
      setError('Daily limit reached (7/7).')
      return
    }

    try {
      setError('')
      await addTask(title.trim())
      setTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add task.')
    }
  }

  async function handleToggle(task: TaskItem) {
    try {
      await toggleTask(task)
      if (!task.completed && tasks.length > 0 && completedCount + 1 === tasks.length) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task.')
    }
  }

  async function handleDelete(task: TaskItem) {
    try {
      await deleteTask(task.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task.')
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.title}>Today&apos;s Tasks</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString()}</Text>
          <View style={styles.addRow}>
            <Input placeholder="Add a focus item" value={title} onChangeText={setTitle} />
            <Button label="Add" onPress={() => void handleAddTask()} loading={isSaving} style={styles.addButton} />
          </View>
          {maxReached ? <Text style={styles.limitText}>Daily limit reached (7/7)</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Card>

        {isLoading ? (
          <ActivityIndicator color={colors.purple} style={{ marginTop: 40 }} />
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />)
        ) : (
          <Card>
            <Text style={styles.emptyTitle}>No tasks yet.</Text>
            <Text style={styles.emptyCopy}>Add your first focus item above.</Text>
          </Card>
        )}
      </ScrollView>

      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.celebrationBackdrop}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationTitle}>🎉 All done!</Text>
            <Text style={styles.celebrationCopy}>You cleared everything for today.</Text>
            <Pressable onPress={() => setShowCelebration(false)}>
              <Text style={styles.celebrationDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textMuted, marginTop: 6 },
  addRow: { gap: 12, marginTop: 16 },
  addButton: { marginTop: 4 },
  limitText: { color: colors.purpleLight, marginTop: 10 },
  errorText: { color: colors.red, marginTop: 10 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyCopy: { color: colors.textMuted, marginTop: 8 },
  celebrationBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  celebrationCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#10201B',
    borderWidth: 1,
    borderColor: colors.green,
    padding: 24,
    alignItems: 'center',
  },
  celebrationTitle: { color: colors.green, fontSize: 28, fontWeight: '700' },
  celebrationCopy: { color: colors.text, marginTop: 10 },
  celebrationDismiss: { color: colors.purpleLight, marginTop: 18, fontWeight: '700' },
})
