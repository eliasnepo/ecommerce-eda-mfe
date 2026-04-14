import { describe, expect, it, vi } from 'vitest'
import { createSearchEventBridge } from '../search/searchEventBridge'
import {
  CATALOG_SEARCH_QUERY_REQUEST_EVENT,
  CATALOG_SEARCH_QUERY_SET_EVENT,
  CATALOG_SEARCH_QUERY_STATE_EVENT,
} from '../search/searchTypes'

describe('searchEventBridge', () => {
  it('responds to request event with current state', () => {
    const stateChanged = vi.fn()
    window.addEventListener(
      CATALOG_SEARCH_QUERY_STATE_EVENT,
      stateChanged as EventListener,
    )

    const cleanup = createSearchEventBridge({
      setQuery: vi.fn(),
      getSnapshot: () => ({ query: 'shoe', updatedAt: '2026-04-13T00:00:00.000Z' }),
    })

    const initialDispatches = stateChanged.mock.calls.length
    window.dispatchEvent(new CustomEvent(CATALOG_SEARCH_QUERY_REQUEST_EVENT))

    expect(stateChanged.mock.calls.length).toBe(initialDispatches + 1)
    const latest = stateChanged.mock.calls[stateChanged.mock.calls.length - 1][0] as CustomEvent
    expect(latest.detail.query).toBe('shoe')

    cleanup()
    window.removeEventListener(
      CATALOG_SEARCH_QUERY_STATE_EVENT,
      stateChanged as EventListener,
    )
  })

  it('handles set event, updates state, and rebroadcasts', () => {
    const stateChanged = vi.fn()
    const setQuery = vi.fn()
    let query = ''

    window.addEventListener(
      CATALOG_SEARCH_QUERY_STATE_EVENT,
      stateChanged as EventListener,
    )

    const cleanup = createSearchEventBridge({
      setQuery: (next) => {
        query = next
        setQuery(next)
      },
      getSnapshot: () => ({ query, updatedAt: '2026-04-13T00:00:00.000Z' }),
    })

    window.dispatchEvent(
      new CustomEvent(CATALOG_SEARCH_QUERY_SET_EVENT, {
        detail: {
          query: 'wireless',
          source: 'shell_header',
          updatedAt: '2026-04-13T00:00:00.000Z',
        },
      }),
    )

    expect(setQuery).toHaveBeenCalledWith('wireless')
    const latest = stateChanged.mock.calls[stateChanged.mock.calls.length - 1][0] as CustomEvent
    expect(latest.detail.query).toBe('wireless')

    cleanup()
    window.removeEventListener(
      CATALOG_SEARCH_QUERY_STATE_EVENT,
      stateChanged as EventListener,
    )
  })
})
