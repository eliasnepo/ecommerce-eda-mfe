import type {
  CatalogSearchSetDetail,
  CatalogSearchStateDetail,
} from './searchTypes'
import {
  CATALOG_SEARCH_QUERY_REQUEST_EVENT,
  CATALOG_SEARCH_QUERY_SET_EVENT,
  CATALOG_SEARCH_QUERY_STATE_EVENT,
} from './searchTypes'

export interface SearchEventBridgeApi {
  setQuery: (query: string) => void
  getSnapshot: () => CatalogSearchStateDetail
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isSetDetail(value: unknown): value is CatalogSearchSetDetail {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.query === 'string' &&
    typeof value.updatedAt === 'string' &&
    value.source === 'shell_header'
  )
}

export function createSearchEventBridge(
  api: SearchEventBridgeApi,
  eventTarget: Window = window,
): () => void {
  const broadcastSnapshot = () => {
    eventTarget.dispatchEvent(
      new CustomEvent(CATALOG_SEARCH_QUERY_STATE_EVENT, {
        detail: api.getSnapshot(),
        bubbles: true,
      }),
    )
  }

  const onRequestState = () => {
    broadcastSnapshot()
  }

  const onSetQuery = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    if (!isSetDetail(detail)) {
      return
    }

    api.setQuery(detail.query)
    broadcastSnapshot()
  }

  eventTarget.addEventListener(
    CATALOG_SEARCH_QUERY_REQUEST_EVENT,
    onRequestState as EventListener,
  )
  eventTarget.addEventListener(
    CATALOG_SEARCH_QUERY_SET_EVENT,
    onSetQuery as EventListener,
  )

  broadcastSnapshot()

  return () => {
    eventTarget.removeEventListener(
      CATALOG_SEARCH_QUERY_REQUEST_EVENT,
      onRequestState as EventListener,
    )
    eventTarget.removeEventListener(
      CATALOG_SEARCH_QUERY_SET_EVENT,
      onSetQuery as EventListener,
    )
  }
}
