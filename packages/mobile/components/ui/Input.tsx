import { forwardRef } from 'react'
import { StyleSheet, TextInput, TextInputProps } from 'react-native'
import { colors } from '../../constants/colors'

export const Input = forwardRef<TextInput, TextInputProps>(function Input(props, ref) {
  return <TextInput ref={ref} placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
})

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#0F172A',
    color: colors.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
})
