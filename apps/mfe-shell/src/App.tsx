import { useEffect } from 'react'
import { createCartEventBridge } from './cart/cartEventBridge'
import {
  addItemToCart,
  clearCartItems,
  getCartSnapshot,
  removeCartItem,
  updateCartItemQuantity,
} from './cart/useCartStore'
import { createSearchEventBridge } from './search/searchEventBridge'
import { getSearchSnapshot, setSearchQuery } from './search/useSearchStore'
import AppRoutes from './routing/AppRoutes'

export default function App() {
  useEffect(() => {
    const cleanupCartBridge = createCartEventBridge({
      addItem: addItemToCart,
      updateItem: updateCartItemQuantity,
      removeItem: removeCartItem,
      clearCart: clearCartItems,
      getSnapshot: getCartSnapshot,
    })

    const cleanupSearchBridge = createSearchEventBridge({
      setQuery: setSearchQuery,
      getSnapshot: getSearchSnapshot,
    })

    return () => {
      cleanupCartBridge()
      cleanupSearchBridge()
    }
  }, [])

  return <AppRoutes />
}
