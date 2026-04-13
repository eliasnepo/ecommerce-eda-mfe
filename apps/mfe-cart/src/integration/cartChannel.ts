import type {
  CartRemoveItemDetail,
  CartStateChangedDetail,
  CartUpdateItemDetail,
} from '../types/cart'
import {
  CART_CLEAR_EVENT,
  CART_REMOVE_ITEM_EVENT,
  CART_REQUEST_STATE_EVENT,
  CART_STATE_CHANGED_EVENT,
  CART_UPDATE_ITEM_EVENT,
} from '../types/cart'

function dispatchEvent<T>(name: string, detail?: T): void {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: true,
    }),
  )
}

export function requestCartState(): void {
  dispatchEvent(CART_REQUEST_STATE_EVENT)
}

export function updateCartItem(detail: CartUpdateItemDetail): void {
  dispatchEvent(CART_UPDATE_ITEM_EVENT, detail)
}

export function removeCartItem(detail: CartRemoveItemDetail): void {
  dispatchEvent(CART_REMOVE_ITEM_EVENT, detail)
}

export function clearCart(): void {
  dispatchEvent(CART_CLEAR_EVENT)
}

export function subscribeToCartState(
  listener: (state: CartStateChangedDetail) => void,
): () => void {
  const handler = (event: Event) => {
    const payload = (event as CustomEvent<CartStateChangedDetail>).detail
    if (!payload || !Array.isArray(payload.items)) {
      return
    }
    listener(payload)
  }

  window.addEventListener(CART_STATE_CHANGED_EVENT, handler as EventListener)

  return () => {
    window.removeEventListener(
      CART_STATE_CHANGED_EVENT,
      handler as EventListener,
    )
  }
}
