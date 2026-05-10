/* Real blocked route that renders the shared block-screen component for the extension. */
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BlockScreen from '../components/BlockScreen'

const TEN_MINUTES_MS = 10 * 60 * 1000

function postBypassMessage(rule: string, blockedUrl: string) {
  window.postMessage(
    {
      type: 'FOCUSGATE_TEMP_BYPASS',
      payload: {
        rule,
        blockedUrl,
        durationMs: TEN_MINUTES_MS,
      },
    },
    window.location.origin,
  )
}

export default function BlockedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const blockedUrl = searchParams.get('url') ?? searchParams.get('blockedUrl') ?? ''
  const rule = searchParams.get('rule') ?? blockedUrl

  const displayUrl = useMemo(() => {
    return rule || blockedUrl || 'blocked route'
  }, [blockedUrl, rule])

  function unlockBlockedUrl() {
    if (!blockedUrl) {
      navigate('/dashboard', { replace: true })
      return
    }

    postBypassMessage(rule, blockedUrl)
    window.setTimeout(() => {
      window.location.replace(blockedUrl)
    }, 120)
  }

  return (
    <BlockScreen
      blockedUrl={displayUrl}
      onBypass={() => {
        unlockBlockedUrl()
      }}
      onClose={() => navigate('/dashboard')}
      showPreviewRouteLink={false}
    />
  )
}
