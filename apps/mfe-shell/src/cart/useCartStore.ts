import { useSyncExternalStore } from 'react'
import { cartReducer, createEmptyCartState, toStateChangedDetail } from './cartReducer'
import { loadCartState, saveCartState } from './cartStorage'
import type {
  CartAddItemDetail,
  CartRemoveItemDetail,
  CartState,
  CartStateChangedDetail,
  CartUpdateItemDetail,
} from './cartTypes'

type Listener = () => void

const listeners = new Set<Listener>()

let state: CartState = createEmptyCartState()
let snapshot: CartStateChangedDetail = toStateChangedDetail(state)
let initialized = false

function notify(): void {
  listeners.forEach((listener) => listener())
}

function setState(nextState: CartState): void {
  state = nextState
  snapshot = toStateChangedDetail(nextState)
  saveCartState(nextState)
  notify()
}

export function initializeCartStore(): void {
  if (initialized) {
    return
  }

  state = loadCartState()
  snapshot = toStateChangedDetail(state)
  initialized = true
}

export function getCartSnapshot(): CartStateChangedDetail {
  initializeCartStore()
  return snapshot
}

export function addItemToCart(payload: CartAddItemDetail): void {
  initializeCartStore()
  setState(cartReducer(state, { type: 'addItem', payload }))
}

export function updateCartItemQuantity(payload: CartUpdateItemDetail): void {
  initializeCartStore()
  setState(cartReducer(state, { type: 'updateItemQuantity', payload }))
}

export function removeCartItem(payload: CartRemoveItemDetail): void {
  initializeCartStore()
  setState(cartReducer(state, { type: 'removeItem', payload }))
}

export function clearCartItems(): void {
  initializeCartStore()
  setState(cartReducer(state, { type: 'clearCart' }))
}

export function subscribeCart(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getStoreSnapshot(): CartStateChangedDetail {
  return getCartSnapshot()
}

export function useCartStore(): CartStateChangedDetail {
  return useSyncExternalStore(subscribeCart, getStoreSnapshot, getStoreSnapshot)
}

initializeCartStore()
