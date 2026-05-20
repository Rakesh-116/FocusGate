import { NativeModules, Platform } from 'react-native'

/* TypeScript wrapper around the native Android blocking module. */
type NativeBlockingModule = {
  openAccessibilitySettings(): Promise<boolean>
  isAccessibilityEnabled(): Promise<boolean>
  startBlockingService(): Promise<boolean>
  stopBlockingService(): Promise<boolean>
  isBlockingEnabled(): Promise<boolean>
  updateBlocklist(packages: string[]): Promise<boolean>
  getBlocklist(): Promise<string[]>
  dismissBlockingScreen(): Promise<boolean>
}

export const DEFAULT_ANDROID_BLOCKLIST = [
  'com.google.android.youtube',
  'com.instagram.android',
  'com.snapchat.android',
  'com.linkedin.android',
]

const nativeModule = NativeModules.FocusGateBlocking as NativeBlockingModule | undefined

function ensureAndroidSupport() {
  if (Platform.OS !== 'android' || !nativeModule) {
    throw new Error('Android app blocking is only available in a native Android build.')
  }

  return nativeModule
}

export async function openAccessibilitySettings() {
  return ensureAndroidSupport().openAccessibilitySettings()
}

export async function isAccessibilityEnabled() {
  if (Platform.OS !== 'android' || !nativeModule) return false
  return nativeModule.isAccessibilityEnabled()
}

export async function startBlockingService() {
  return ensureAndroidSupport().startBlockingService()
}

export async function stopBlockingService() {
  return ensureAndroidSupport().stopBlockingService()
}

export async function isBlockingEnabled() {
  if (Platform.OS !== 'android' || !nativeModule) return false
  return nativeModule.isBlockingEnabled()
}

export async function updateBlocklist(packages: string[]) {
  return ensureAndroidSupport().updateBlocklist(packages)
}

export async function getBlocklist() {
  if (Platform.OS !== 'android' || !nativeModule) return []
  return nativeModule.getBlocklist()
}

export async function dismissBlockingScreen() {
  if (Platform.OS !== 'android' || !nativeModule) return false
  return nativeModule.dismissBlockingScreen()
}
