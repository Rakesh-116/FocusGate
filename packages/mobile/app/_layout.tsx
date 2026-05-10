import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Slot } from 'expo-router'
import { AuthProvider } from '../src/context/AuthContext'

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
