import { useState } from 'react'
import { Link, useRouter } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { session } = useAuth()

  if (session) {
    router.replace('/(app)/dashboard')
  }

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.replace('/(app)/dashboard')
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access your focus dashboard.</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <Text style={styles.linkText}>
            Don’t have an account? <Text style={styles.link} onPress={() => router.push('/(auth)/signup')}>Sign up</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  error: {
    color: '#fca5a5',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    color: '#cbd5e1',
    textAlign: 'center',
  },
  link: {
    color: '#a78bfa',
    fontWeight: '700',
  },
})
