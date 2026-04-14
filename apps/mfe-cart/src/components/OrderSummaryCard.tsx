import { formatCurrency } from '../utils/formatCurrency'
import CheckoutButton from './CheckoutButton'

export type PaymentMethod =
  | 'cod'
  | 'shopcart_card'
  | 'paypal'
  | 'credit_debit'

interface OrderSummaryCardProps {
  subtotal: number
  shipping: number
  tax: number
  total: number
  couponCode: string
  onCouponCodeChange: (value: string) => void
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void
  onCheckout: () => void
  checkoutDisabled: boolean
  checkoutLoading: boolean
}

export default function OrderSummaryCard({
  subtotal,
  shipping,
  tax,
  total,
  couponCode,
  onCouponCodeChange,
  paymentMethod,
  onPaymentMethodChange,
  onCheckout,
  checkoutDisabled,
  checkoutLoading,
}: OrderSummaryCardProps) {
  const inputClassName =
    'min-h-11 w-full rounded-[8px] border border-transparent bg-surface-muted px-4 text-sm font-medium text-text-primary placeholder:text-text-secondary outline-none transition focus:border-[#1a3d2b] focus:ring-2 focus:ring-[#1a3d2b]/15'
  const paymentMethods: Array<{ key: PaymentMethod; label: string }> = [
    { key: 'cod', label: 'Cash on Delivery' },
    { key: 'shopcart_card', label: 'Shopcart Card' },
    { key: 'paypal', label: 'Paypal' },
    { key: 'credit_debit', label: 'Credit or Debit card' },
  ]

  return (
    <aside aria-label="Order summary">
      <section className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <h2 className="m-0 text-lg font-bold text-text-primary">Order Summary</h2>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={couponCode}
            onChange={(event) => onCouponCodeChange(event.target.value)}
            placeholder="Enter Coupon Code"
            aria-label="Coupon code"
            className={inputClassName}
          />
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-pill bg-[#1a3d2b] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Apply coupon
          </button>
        </div>
        <p className="m-0 mt-2 text-xs text-text-secondary">Coupon status will appear here.</p>

        <div className="mt-5 space-y-2 border-b border-border pb-4 text-sm">
          <div className="flex items-center justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-text-secondary">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
          </div>
          <div className="flex items-center justify-between text-text-secondary">
            <span>Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-base font-bold text-text-primary">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <h3 className="m-0 mt-5 text-lg font-bold text-text-primary">Payment Details</h3>

        <fieldset className="mt-3 grid gap-2 border-0 p-0">
          <legend className="sr-only">Payment method</legend>
          {paymentMethods.map((method) => (
            <label
              key={method.key}
              className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2 text-sm text-text-primary transition ${
                paymentMethod === method.key
                  ? 'border-[#dcfce7] bg-[#dcfce7]/60'
                  : 'border-border bg-surface'
              }`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.key}
                checked={paymentMethod === method.key}
                onChange={() => onPaymentMethodChange(method.key)}
                className="h-4 w-4 accent-green-600"
              />
              <span>{method.label}</span>
            </label>
          ))}
        </fieldset>

        {paymentMethod === 'credit_debit' ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary">
              <span className="rounded-[8px] bg-surface-muted px-2 py-1 text-center">amazon</span>
              <span className="rounded-[8px] border-2 border-[#22c55e] bg-surface px-2 py-1 text-center">Mastercard</span>
              <span className="rounded-[8px] bg-surface-muted px-2 py-1 text-center font-bold text-[#1a1aff]">VISA</span>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-text-primary">
              <span>Email*</span>
              <input className={inputClassName} placeholder="Type here..." />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-text-primary">
              <span>Card Holder Name*</span>
              <input className={inputClassName} placeholder="Type here..." />
            </label>
          </div>
        ) : null}

        <div className="mt-5">
          <CheckoutButton
            isLoading={checkoutLoading}
            disabled={checkoutDisabled}
            onClick={onCheckout}
          />
        </div>
      </section>
    </aside>
  )
}
