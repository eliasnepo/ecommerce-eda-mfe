export const CART_ADD_ITEM_EVENT = 'cart:add-item'
export const CART_UPDATE_ITEM_EVENT = 'cart:update-item'
export const CART_REMOVE_ITEM_EVENT = 'cart:remove-item'
export const CART_CLEAR_EVENT = 'cart:clear'
export const CART_REQUEST_STATE_EVENT = 'cart:request-state'
export const CART_STATE_CHANGED_EVENT = 'cart:state-changed'

export interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

export interface CartState {
  items: CartItem[]
  currency: 'USD'
  updatedAt: string
}

export interface CartTotals {
  totalItems: number
  subtotal: number
}

export interface CartStateChangedDetail extends CartState, CartTotals {}

export interface CartAddItemDetail {
  productId: string
  productName: string
  price: number
  quantity: number
}

export interface CartUpdateItemDetail {
  productId: string
  quantity: number
}

export interface CartRemoveItemDetail {
  productId: string
}
