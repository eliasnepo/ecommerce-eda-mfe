import { createEmptyCartState } from './cartReducer'
import type { CartItem, CartState } from './cartTypes'

const FALLBACK_STORAGE_KEY = 'ecom.cart.v1'

function resolveStorageKey(): string {
  if (
    typeof __CART_STORAGE_KEY__ === 'string' &&
    __CART_STORAGE_KEY__.trim().length > 0
  ) {
    return __CART_STORAGE_KEY__
  }

  return FALLBACK_STORAGE_KEY
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as CartItem

  return (
    typeof candidate.productId === 'string' &&
    typeof candidate.productName === 'string' &&
    typeof candidate.price === 'number' &&
    Number.isFinite(candidate.price) &&
    typeof candidate.quantity === 'number' &&
    Number.isInteger(candidate.quantity)
  )
}

function isCartState(value: unknown): value is CartState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as CartState
  return (
    Array.isArray(candidate.items) &&
    candidate.items.every(isCartItem) &&
    candidate.currency === 'USD' &&
    typeof candidate.updatedAt === 'string'
  )
}

export function loadCartState(): CartState {
  if (typeof window === 'undefined') {
    return createEmptyCartState()
  }

  try {
    const raw = window.sessionStorage.getItem(resolveStorageKey())

    if (!raw) {
      return createEmptyCartState()
    }

    const parsed = JSON.parse(raw)
    return isCartState(parsed) ? parsed : createEmptyCartState()
  } catch {
    return createEmptyCartState()
  }
}

export function saveCartState(state: CartState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(resolveStorageKey(), JSON.stringify(state))
  } catch {
    // ignore storage failures in PoC runtime
  }
}
