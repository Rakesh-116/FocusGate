import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  if (session) {
    router.replace('/(app)/dashboard')
  }

  async function handleLogin() {
    try {
      setLoading(true)
      setError('')
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      router.replace('/(app)/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    try {
      setGoogleLoading(true)
      setError('')
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: makeRedirectUri(),
        },
      })
      if (result.error) throw result.error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Google sign in.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.brand}>FOCUSGATE</Text>
          <Text style={styles.title}>Sign in and reclaim your attention.</Text>
          <Text style={styles.subtitle}>Your daily tasks, vision cards, and future mobile blocker all live here.</Text>

          <View style={styles.form}>
            <Input placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Sign In" onPress={() => void handleLogin()} loading={loading} />
            <Button label="Continue with Google" onPress={() => void handleGoogleLogin()} loading={googleLoading} variant="secondary" />
          </View>

          <Text style={styles.linkText}>
            Don&apos;t have an account?{' '}
            <Link href="/(auth)/signup" style={styles.link}>
              Sign up
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
