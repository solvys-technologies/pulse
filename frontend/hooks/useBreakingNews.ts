import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import type { RiskFlowItem } from '../types/api'

export function useBreakingNews(onBreaking: (item: RiskFlowItem) => void) {
  const sourceRef = useRef<EventSource | null>(null)
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    // Don't connect if user is not signed in
    if (!isSignedIn) {
      console.warn('[BreakingNews] User not signed in, skipping SSE connection')
      return
    }

    let mounted = true

    const connectSSE = async () => {
      try {
        // Get auth token for SSE (EventSource can't send headers)
        const token = await getToken({ template: 'neon' }) || await getToken()
        
        if (!token) {
          console.warn('[BreakingNews] No auth token available, skipping SSE connection')
          return
        }

        if (!mounted) return

        const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
        // EventSource doesn't support custom headers, so pass token as query param
        const streamUrl = `${baseUrl}/api/riskflow/stream?token=${encodeURIComponent(token)}`
        
        const source = new EventSource(streamUrl)
        sourceRef.current = source

        source.onopen = () => {
          console.log('[BreakingNews] SSE connection opened')
        }

        source.onmessage = (event) => {
          try {
            // Skip heartbeat messages
            if (event.data.trim() === '' || event.data.startsWith(':')) {
              return
            }
            const item = JSON.parse(event.data) as RiskFlowItem
            onBreaking(item)
          } catch (error) {
            console.warn('[BreakingNews] Failed to parse SSE payload', error)
          }
        }

        source.onerror = (event) => {
          console.warn('[BreakingNews] SSE error, letting browser retry', event)
          // EventSource will automatically retry, but we can log the state
          if (source.readyState === EventSource.CLOSED) {
            console.warn('[BreakingNews] SSE connection closed, will retry automatically')
          }
        }
      } catch (error) {
        console.error('[BreakingNews] Failed to establish SSE connection', error)
      }
    }

    connectSSE()

    return () => {
      mounted = false
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
    }
  }, [onBreaking, getToken, isSignedIn])
}
