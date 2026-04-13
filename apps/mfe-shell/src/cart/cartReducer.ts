import type {
  CartAddItemDetail,
  CartItem,
  CartState,
  CartStateChangedDetail,
  CartTotals,
  CartUpdateItemDetail,
} from './cartTypes'

export type CartAction =
  | { type: 'addItem'; payload: CartAddItemDetail }
  | { type: 'updateItemQuantity'; payload: CartUpdateItemDetail }
  | { type: 'removeItem'; payload: { productId: string } }
  | { type: 'clearCart' }

const CART_CURRENCY = 'USD'

export function createEmptyCartState(): CartState {
  return {
    items: [],
    currency: CART_CURRENCY,
    updatedAt: new Date().toISOString(),
  }
}

function touch(nextItems: CartItem[]): CartState {
  return {
    items: nextItems,
    currency: CART_CURRENCY,
    updatedAt: new Date().toISOString(),
  }
}

export function deriveCartTotals(items: CartItem[]): CartTotals {
  return items.reduce(
    (totals, item) => ({
      totalItems: totals.totalItems + item.quantity,
      subtotal: totals.subtotal + item.price * item.quantity,
    }),
    { totalItems: 0, subtotal: 0 },
  )
}

export function toStateChangedDetail(state: CartState): CartStateChangedDetail {
  return {
    ...state,
    ...deriveCartTotals(state.items),
  }
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'addItem': {
      const existing = state.items.find(
        (item) => item.productId === action.payload.productId,
      )

      if (existing) {
        return touch(
          state.items.map((item) =>
            item.productId === action.payload.productId
              ? {
                  ...item,
                  quantity: item.quantity + Math.max(1, action.payload.quantity),
                }
              : item,
          ),
        )
      }

      return touch([
        ...state.items,
        {
          productId: action.payload.productId,
          productName: action.payload.productName,
          price: action.payload.price,
          quantity: Math.max(1, action.payload.quantity),
        },
      ])
    }

    case 'updateItemQuantity': {
      if (action.payload.quantity <= 0) {
        return touch(
          state.items.filter(
            (item) => item.productId !== action.payload.productId,
          ),
        )
      }

      return touch(
        state.items.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item,
        ),
      )
    }

    case 'removeItem': {
      return touch(
        state.items.filter((item) => item.productId !== action.payload.productId),
      )
    }

    case 'clearCart':
      return touch([])

    default:
      return state
  }
}
