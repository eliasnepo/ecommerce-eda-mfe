import { useEffect } from 'react'
import { createCartEventBridge } from './cart/cartEventBridge'
import {
  addItemToCart,
  clearCartItems,
  getCartSnapshot,
  removeCartItem,
  updateCartItemQuantity,
} from './cart/useCartStore'
import AppRoutes from './routing/AppRoutes'

export default function App() {
  useEffect(() => {
    const cleanup = createCartEventBridge({
      addItem: addItemToCart,
      updateItem: updateCartItemQuantity,
      removeItem: removeCartItem,
      clearCart: clearCartItems,
      getSnapshot: getCartSnapshot,
    })

    return cleanup
  }, [])

  return <AppRoutes />
}
