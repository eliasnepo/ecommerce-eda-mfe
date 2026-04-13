export interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

export interface CartStateChangedDetail {
  items: CartItem[]
  totalItems: number
  subtotal: number
  currency: 'USD'
  updatedAt: string
}

export interface CartUpdateItemDetail {
  productId: string
  quantity: number
}

export interface CartRemoveItemDetail {
  productId: string
}

export interface CheckoutOrderInput {
  userId: string
  items: CartItem[]
}

export interface CheckoutOrderResponse {
  orderId: string
}

export const CART_UPDATE_ITEM_EVENT = 'cart:update-item'
export const CART_REMOVE_ITEM_EVENT = 'cart:remove-item'
export const CART_CLEAR_EVENT = 'cart:clear'
export const CART_REQUEST_STATE_EVENT = 'cart:request-state'
export const CART_STATE_CHANGED_EVENT = 'cart:state-changed'

export function createEmptyCartSnapshot(): CartStateChangedDetail {
  return {
    items: [],
    totalItems: 0,
    subtotal: 0,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
  }
}
