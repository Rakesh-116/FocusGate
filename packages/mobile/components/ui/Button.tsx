import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native'
import { colors } from '../../constants/colors'

type ButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  style?: ViewStyle
}

export function Button({ label, onPress, disabled, loading, variant = 'primary', style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.purple,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  danger: {
    backgroundColor: colors.red,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
})
