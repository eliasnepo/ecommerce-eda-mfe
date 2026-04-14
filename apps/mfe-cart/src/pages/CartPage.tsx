import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CartItemRow from '../components/CartItemRow'
import OrderSummaryCard, { type PaymentMethod } from '../components/OrderSummaryCard'
import {
  clearCart,
  requestCartState,
  subscribeToCartState,
} from '../integration/cartChannel'
import { CheckoutError, placeOrder, readCheckoutEnv } from '../services/checkoutClient'
import type { CartStateChangedDetail } from '../types/cart'
import { createEmptyCartSnapshot } from '../types/cart'
import CartEmptyState from './CartEmptyState'

const DELIVERY_INFORMATION = {
  name: 'Wade Warren',
  address: '4140 Parker Rd. Allentown, New Mexico 31134',
  city: 'Austin',
  zipCode: '85486',
  mobile: '+447700960054',
  email: 'georgia.young@example.com',
}

export default function CartPage() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<CartStateChangedDetail>(
    createEmptyCartSnapshot(),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_debit')

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
    <div className="mx-auto w-full max-w-cart px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold text-text-primary">Review Item And Shipping</h1>
          <p className="m-0 mt-1 text-sm text-text-secondary">{snapshot.totalItems} items</p>
        </div>
        <Link
          to="/catalog"
          className="inline-flex min-h-10 items-center rounded-pill bg-surface-muted px-4 text-sm font-medium text-text-primary no-underline"
        >
          Continue shopping
        </Link>
      </div>

      {errorMessage ? (
        <div
          className="mb-4 rounded-card border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      {snapshot.items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <section className="space-y-4" aria-label="Cart items and shipping">
            <div className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <h2 className="m-0 text-[22px] font-bold text-text-primary">Review Item And Shipping</h2>
              <div className="mt-4 grid gap-3">
                {snapshot.items.map((item) => (
                  <CartItemRow key={item.productId} item={item} />
                ))}
              </div>
            </div>

            <div className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="m-0 text-[22px] font-bold text-text-primary">Delivery Information</h2>
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center justify-center rounded-pill bg-surface-muted px-4 text-[13px] font-medium text-text-primary"
                >
                  Edit Information
                </button>
              </div>

              <dl className="m-0 grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#374151]">Name</dt>
                  <dd className="m-0 text-right text-[#9ca3af]">{DELIVERY_INFORMATION.name}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#374151]">Address</dt>
                  <dd className="m-0 max-w-[320px] text-right text-[#9ca3af]">
                    {DELIVERY_INFORMATION.address}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#374151]">City</dt>
                  <dd className="m-0 text-right text-[#9ca3af]">{DELIVERY_INFORMATION.city}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#374151]">Zip Code</dt>
                  <dd className="m-0 text-right text-[#9ca3af]">{DELIVERY_INFORMATION.zipCode}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#374151]">Mobile</dt>
                  <dd className="m-0 text-right text-[#9ca3af]">{DELIVERY_INFORMATION.mobile}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#374151]">Email</dt>
                  <dd className="m-0 text-right text-[#9ca3af]">{DELIVERY_INFORMATION.email}</dd>
                </div>
              </dl>
            </div>
          </section>

          <OrderSummaryCard
            subtotal={snapshot.subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
            couponCode={couponCode}
            onCouponCodeChange={setCouponCode}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onCheckout={handleCheckout}
            checkoutDisabled={snapshot.items.length === 0}
            checkoutLoading={isSubmitting}
          />
        </div>
      )}
    </div>
  )
}
