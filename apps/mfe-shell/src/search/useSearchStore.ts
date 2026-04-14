import { useSyncExternalStore } from 'react'
import type { CatalogSearchStateDetail } from './searchTypes'

type Listener = () => void

const listeners = new Set<Listener>()

let state: CatalogSearchStateDetail = {
  query: '',
  updatedAt: new Date().toISOString(),
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function setSearchQuery(query: string): void {
  if (state.query === query) {
    return
  }

  state = {
    query,
    updatedAt: new Date().toISOString(),
  }
  notify()
}

export function getSearchSnapshot(): CatalogSearchStateDetail {
  return state
}

export function subscribeSearch(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getStoreSnapshot(): CatalogSearchStateDetail {
  return getSearchSnapshot()
}

export function useSearchStore(): CatalogSearchStateDetail {
  return useSyncExternalStore(subscribeSearch, getStoreSnapshot, getStoreSnapshot)
}
