const CATALOG_SEARCH_QUERY_SET_EVENT = 'catalog:search-query:set'
const CATALOG_SEARCH_QUERY_REQUEST_EVENT = 'catalog:search-query:request'
const CATALOG_SEARCH_QUERY_STATE_EVENT = 'catalog:search-query:state'

interface SearchPayload {
  query: string
}

function isSearchPayload(value: unknown): value is SearchPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as SearchPayload).query === 'string'
  )
}

export function requestSearchQueryState(): void {
  window.dispatchEvent(
    new CustomEvent(CATALOG_SEARCH_QUERY_REQUEST_EVENT, {
      bubbles: true,
    }),
  )
}

export function subscribeToSearchQuery(
  listener: (query: string) => void,
): () => void {
  const onStateChanged = (event: Event) => {
    const payload = (event as CustomEvent<unknown>).detail
    if (!isSearchPayload(payload)) {
      return
    }

    listener(payload.query)
  }

  window.addEventListener(
    CATALOG_SEARCH_QUERY_STATE_EVENT,
    onStateChanged as EventListener,
  )
  window.addEventListener(
    CATALOG_SEARCH_QUERY_SET_EVENT,
    onStateChanged as EventListener,
  )

  return () => {
    window.removeEventListener(
      CATALOG_SEARCH_QUERY_STATE_EVENT,
      onStateChanged as EventListener,
    )
    window.removeEventListener(
      CATALOG_SEARCH_QUERY_SET_EVENT,
      onStateChanged as EventListener,
    )
  }
}
