import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'
import type { TaskItem as Task } from '../hooks/useTasks'

type TaskItemProps = {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <View style={[styles.row, task.completed && styles.rowCompleted]}>
      <Pressable onPress={() => onToggle(task)} style={styles.checkboxButton}>
        <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
          {task.completed ? <Check color={colors.bg} size={14} /> : null}
        </View>
        <Text style={[styles.title, task.completed && styles.titleDone]}>{task.title}</Text>
      </Pressable>
      <Pressable onPress={() => onDelete(task)} style={styles.deleteAction}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCompleted: {
    opacity: 0.5,
  },
  checkboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  deleteAction: {
    backgroundColor: colors.red,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteText: {
    color: colors.text,
    fontWeight: '700',
  },
})
