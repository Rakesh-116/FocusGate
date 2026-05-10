import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useAuth } from '../src/context/AuthContext'

export default function Index() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(app)/dashboard')
      } else {
        router.replace('/(auth)/login')
      }
    }
  }, [loading, session, router])

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0a0a14',
  },
})
