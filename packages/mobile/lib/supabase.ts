import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as FileSystem from 'expo-file-system/legacy'
import type { Database } from '../src/lib/database.types'

const supabaseAuthStorageFile = `${FileSystem.documentDirectory ?? ''}focusgate-supabase-auth.json`
const storageCache = new Map<string, string>()
let cacheHydrationPromise: Promise<void> | null = null

async function hydrateStorageCache() {
  if (cacheHydrationPromise) {
    await cacheHydrationPromise
    return
  }

  cacheHydrationPromise = (async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(supabaseAuthStorageFile)
      if (!fileInfo.exists) return

      const fileContents = await FileSystem.readAsStringAsync(supabaseAuthStorageFile)
      if (!fileContents) return

      const parsedContents = JSON.parse(fileContents) as Record<string, string>
      for (const [key, value] of Object.entries(parsedContents)) {
        storageCache.set(key, value)
      }
    } catch (error) {
      console.error('Failed to hydrate Supabase auth storage', error)
    }
  })()

  await cacheHydrationPromise
}

async function persistStorageCache() {
  const serializedContents = JSON.stringify(Object.fromEntries(storageCache.entries()))
  await FileSystem.writeAsStringAsync(supabaseAuthStorageFile, serializedContents)
}

const fileStorageAdapter = {
  getItem: async (key: string) => {
    await hydrateStorageCache()
    return storageCache.get(key) ?? null
  },
  setItem: async (key: string, value: string) => {
    await hydrateStorageCache()
    storageCache.set(key, value)
    await persistStorageCache()
  },
  removeItem: async (key: string) => {
    await hydrateStorageCache()
    storageCache.delete(key)
    await persistStorageCache()
  },
}

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: fileStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
