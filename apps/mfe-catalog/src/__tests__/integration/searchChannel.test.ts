import { describe, expect, it, vi } from 'vitest'
import {
  requestSearchQueryState,
  subscribeToSearchQuery,
} from '../../integration/searchChannel'

describe('searchChannel', () => {
  it('dispatches query request event', () => {
    const listener = vi.fn()
    window.addEventListener('catalog:search-query:request', listener as EventListener)

    requestSearchQueryState()

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('catalog:search-query:request', listener as EventListener)
  })

  it('notifies listeners for state and set events', () => {
    const onQuery = vi.fn()
    const unsubscribe = subscribeToSearchQuery(onQuery)

    window.dispatchEvent(
      new CustomEvent('catalog:search-query:state', {
        detail: { query: 'state-value' },
      }),
    )
    window.dispatchEvent(
      new CustomEvent('catalog:search-query:set', {
        detail: { query: 'set-value', source: 'shell_header', updatedAt: '2026-01-01' },
      }),
    )

    expect(onQuery).toHaveBeenNthCalledWith(1, 'state-value')
    expect(onQuery).toHaveBeenNthCalledWith(2, 'set-value')

    unsubscribe()
  })
})
