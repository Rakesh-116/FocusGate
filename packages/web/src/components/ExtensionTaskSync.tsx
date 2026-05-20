/* Sync today's tasks and blocked web links from the web app into the extension. */
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTasks } from '../hooks/useTasks'
import { useBlockedRules } from '../hooks/useBlockedRules'
import { getLocalDateKey } from '../lib/date'

export function ExtensionTaskSync() {
  const { user, session } = useAuth()
  const userId = user?.id ?? null
  const { tasks } = useTasks(userId)
  const { blockedRules } = useBlockedRules(userId)

  function postSession() {
    window.postMessage(
      {
        type: 'FOCUSGATE_SYNC_SESSION',
        payload: session
          ? {
              userId: session.user.id,
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              expiresAt: session.expires_at ?? null,
            }
          : null,
      },
      window.location.origin,
    )
  }

  function postTaskState() {
    const payload = userId
      ? {
          userId,
          taskDate: getLocalDateKey(),
          totalTaskCount: tasks.length,
          completedTaskCount: tasks.filter((task) => task.completed).length,
          pendingTaskCount: tasks.filter((task) => !task.completed).length,
          lastSyncedAt: new Date().toISOString(),
        }
      : null

    window.postMessage(
      {
        type: 'FOCUSGATE_SYNC_TASK_STATE',
        payload,
      },
      window.location.origin,
    )
  }

  function postBlockedRules() {
    window.postMessage(
      {
        type: 'FOCUSGATE_SYNC_BLOCKED_URLS',
        payload: blockedRules.map((rule) => rule.app_or_url),
      },
      window.location.origin,
    )
  }

  function postAppConfig() {
    window.postMessage(
      {
        type: 'FOCUSGATE_SYNC_APP_CONFIG',
        payload: {
          appOrigin: window.location.origin,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? null,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? null,
        },
      },
      window.location.origin,
    )
  }

  useEffect(() => {
    postSession()
  }, [session])

  useEffect(() => {
    postTaskState()
  }, [tasks, userId])

  useEffect(() => {
    postBlockedRules()
  }, [blockedRules])

  useEffect(() => {
    postAppConfig()
  }, [])

  useEffect(() => {
    function handleSyncRequest(event: MessageEvent) {
      if (event.source !== window) return
      if (event.data?.type !== 'FOCUSGATE_EXTENSION_SYNC_REQUEST') return

      postAppConfig()
      postSession()
      postTaskState()
      postBlockedRules()
    }

    window.addEventListener('message', handleSyncRequest)
    return () => window.removeEventListener('message', handleSyncRequest)
  }, [blockedRules, session, tasks, userId])

  return null
}
