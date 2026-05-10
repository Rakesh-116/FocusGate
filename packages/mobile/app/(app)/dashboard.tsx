import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../../src/context/AuthContext'

export default function Dashboard() {
  const { user, session, signOut, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login')
    }
  }, [loading, session, router])

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>FocusGate</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.email?.split('@')[0] ?? 'user'}.</Text>
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
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
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
})
