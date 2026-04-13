import { formatCurrency } from '../utils/formatCurrency'
import CheckoutButton from './CheckoutButton'

interface OrderSummaryCardProps {
  subtotal: number
  shipping: number
  tax: number
  total: number
  onCheckout: () => void
  checkoutDisabled: boolean
  checkoutLoading: boolean
}

export default function OrderSummaryCard({
  subtotal,
  shipping,
  tax,
  total,
  onCheckout,
  checkoutDisabled,
  checkoutLoading,
}: OrderSummaryCardProps) {
  return (
    <aside className="summary-card" aria-label="Order summary">
      <h2 className="summary-title">Order summary</h2>

      <div className="summary-row">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="summary-row">
        <span>Shipping</span>
        <span>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
      </div>
      <div className="summary-row">
        <span>Tax</span>
        <span>{formatCurrency(tax)}</span>
      </div>
      <div className="summary-row summary-row-total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <CheckoutButton
        isLoading={checkoutLoading}
        disabled={checkoutDisabled}
        onClick={onCheckout}
      />
    </aside>
  )
}
