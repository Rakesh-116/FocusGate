import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { colors } from '../../constants/colors'
import { supabase } from '../../lib/supabase'

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const result = await supabase.auth.signUp({ email, password })
      if (result.error) throw result.error
      router.replace('/(app)/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.brand}>FOCUSGATE</Text>
          <Text style={styles.title}>Create your account.</Text>
          <Text style={styles.subtitle}>Set up your focus system and carry it across web, extension, and mobile.</Text>

          <View style={styles.form}>
            <Input placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            <Input placeholder="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Create Account" onPress={() => void handleSignup()} loading={loading} />
          </View>

          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    gap: 14,
  },
  brand: {
    color: colors.purpleLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 12,
    marginTop: 10,
  },
  error: {
    color: colors.red,
    fontSize: 13,
  },
  linkText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  link: {
    color: colors.purpleLight,
    fontWeight: '700',
  },
})
