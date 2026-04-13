import type {
  CartAddItemDetail,
  CartRemoveItemDetail,
  CartStateChangedDetail,
  CartUpdateItemDetail,
} from './cartTypes'
import {
  CART_ADD_ITEM_EVENT,
  CART_CLEAR_EVENT,
  CART_REMOVE_ITEM_EVENT,
  CART_REQUEST_STATE_EVENT,
  CART_STATE_CHANGED_EVENT,
  CART_UPDATE_ITEM_EVENT,
} from './cartTypes'

export interface CartEventBridgeApi {
  addItem: (detail: CartAddItemDetail) => void
  updateItem: (detail: CartUpdateItemDetail) => void
  removeItem: (detail: CartRemoveItemDetail) => void
  clearCart: () => void
  getSnapshot: () => CartStateChangedDetail
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isAddItemDetail(value: unknown): value is CartAddItemDetail {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.productId === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    typeof value.quantity === 'number' &&
    Number.isInteger(value.quantity)
  )
}

function isUpdateItemDetail(value: unknown): value is CartUpdateItemDetail {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.productId === 'string' &&
    typeof value.quantity === 'number' &&
    Number.isInteger(value.quantity)
  )
}

function isRemoveItemDetail(value: unknown): value is CartRemoveItemDetail {
  if (!isObject(value)) {
    return false
  }

  return typeof value.productId === 'string'
}

export function createCartEventBridge(
  api: CartEventBridgeApi,
  eventTarget: Window = window,
): () => void {
  const broadcastSnapshot = () => {
    eventTarget.dispatchEvent(
      new CustomEvent(CART_STATE_CHANGED_EVENT, {
        detail: api.getSnapshot(),
        bubbles: true,
      }),
    )
  }

  const onAddItem = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    if (!isAddItemDetail(detail)) {
      return
    }

    api.addItem(detail)
    broadcastSnapshot()
  }

  const onUpdateItem = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    if (!isUpdateItemDetail(detail)) {
      return
    }

    api.updateItem(detail)
    broadcastSnapshot()
  }

  const onRemoveItem = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    if (!isRemoveItemDetail(detail)) {
      return
    }

    api.removeItem(detail)
    broadcastSnapshot()
  }

  const onClearCart = () => {
    api.clearCart()
    broadcastSnapshot()
  }

  const onRequestState = () => {
    broadcastSnapshot()
  }

  eventTarget.addEventListener(CART_ADD_ITEM_EVENT, onAddItem as EventListener)
  eventTarget.addEventListener(
    CART_UPDATE_ITEM_EVENT,
    onUpdateItem as EventListener,
  )
  eventTarget.addEventListener(
    CART_REMOVE_ITEM_EVENT,
    onRemoveItem as EventListener,
  )
  eventTarget.addEventListener(CART_CLEAR_EVENT, onClearCart as EventListener)
  eventTarget.addEventListener(
    CART_REQUEST_STATE_EVENT,
    onRequestState as EventListener,
  )

  broadcastSnapshot()

  return () => {
    eventTarget.removeEventListener(
      CART_ADD_ITEM_EVENT,
      onAddItem as EventListener,
    )
    eventTarget.removeEventListener(
      CART_UPDATE_ITEM_EVENT,
      onUpdateItem as EventListener,
    )
    eventTarget.removeEventListener(
      CART_REMOVE_ITEM_EVENT,
      onRemoveItem as EventListener,
    )
    eventTarget.removeEventListener(
      CART_CLEAR_EVENT,
      onClearCart as EventListener,
    )
    eventTarget.removeEventListener(
      CART_REQUEST_STATE_EVENT,
      onRequestState as EventListener,
    )
  }
}
