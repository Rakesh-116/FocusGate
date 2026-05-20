import { useLocalSearchParams, useRouter } from 'expo-router'
import { BlockScreen } from '../components/BlockScreen'
import { dismissBlockingScreen } from '../modules/blocking'

/* Full-screen React route opened by the Android accessibility service. */
export default function BlockingRoute() {
  const router = useRouter()
  const params = useLocalSearchParams<{ app?: string; package?: string }>()
  const blockedApp = typeof params.app === 'string' && params.app.length > 0 ? params.app : params.package

  async function handleDismiss() {
    const dismissed = await dismissBlockingScreen()
    if (!dismissed) {
      router.replace('/(app)/dashboard')
    }
  }

  return <BlockScreen blockedApp={blockedApp} onBypass={() => void handleDismiss()} onClose={() => void handleDismiss()} />
}
