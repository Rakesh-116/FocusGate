import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { colors } from '../constants/colors'
import { useAuth } from '../hooks/useAuth'

export default function Index() {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    )
  }

  return <Redirect href={session ? '/(app)/dashboard' : '/(auth)/login'} />
}
