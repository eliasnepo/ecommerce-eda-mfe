import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CartItemRow from '../components/CartItemRow'
import OrderSummaryCard from '../components/OrderSummaryCard'
import {
  clearCart,
  requestCartState,
  subscribeToCartState,
} from '../integration/cartChannel'
import { CheckoutError, placeOrder, readCheckoutEnv } from '../services/checkoutClient'
import type { CartStateChangedDetail } from '../types/cart'
import { createEmptyCartSnapshot } from '../types/cart'
import CartEmptyState from './CartEmptyState'

export default function CartPage() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<CartStateChangedDetail>(
    createEmptyCartSnapshot(),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToCartState((next) => {
      setSnapshot(next)
    })

    requestCartState()

    return unsubscribe
  }, [])

  const shipping = 0
  const tax = 0
  const total = useMemo(
    () => snapshot.subtotal + shipping + tax,
    [snapshot.subtotal],
  )

  const handleCheckout = async () => {
    if (snapshot.items.length === 0 || isSubmitting) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const env = readCheckoutEnv()
      const response = await placeOrder(
        {
          userId: env.userId,
          items: snapshot.items,
        },
        env,
      )

      navigate(`confirmation/${response.orderId}`)
      clearCart()
    } catch (error) {
      if (error instanceof CheckoutError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to place order right now. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cart-page">
      <div className="cart-page-header">
        <div>
          <h1>Your Cart</h1>
          <p>{snapshot.totalItems} items</p>
        </div>
        <Link to="/catalog" className="cart-text-link">
          Continue shopping
        </Link>
      </div>

      {errorMessage ? (
        <div className="cart-error-banner" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {snapshot.items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="cart-page-grid">
          <section className="cart-items-section" aria-label="Cart items">
            <h2>Items</h2>
            <div className="cart-item-list">
              {snapshot.items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>
          </section>

          <OrderSummaryCard
            subtotal={snapshot.subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
            onCheckout={handleCheckout}
            checkoutDisabled={snapshot.items.length === 0}
            checkoutLoading={isSubmitting}
          />
        </div>
      )}
    </div>
  )
}
