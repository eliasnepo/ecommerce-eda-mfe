import { removeCartItem } from '../integration/cartChannel'
import type { CartItem } from '../types/cart'
import { formatCurrency } from '../utils/formatCurrency'
import QuantityStepper from './QuantityStepper'

interface CartItemRowProps {
  item: CartItem
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const lineTotal = item.price * item.quantity

  return (
    <article
      className="grid gap-4 rounded-[12px] border border-border bg-surface p-4 md:grid-cols-[100px_1fr_auto] md:items-center"
      aria-label={item.productName}
    >
      <div
        className="flex h-[100px] w-[100px] items-center justify-center rounded-[8px] bg-surface-muted text-sm font-semibold text-text-secondary"
        aria-hidden="true"
      >
        Product Image
      </div>

      <div className="space-y-1.5">
        <p className="m-0 text-lg font-bold text-text-primary">{item.productName}</p>
        <p className="m-0 text-sm text-[#9ca3af]">Color: Pink</p>
        <p className="m-0 text-lg font-semibold text-text-primary">{formatCurrency(item.price)}</p>
        <button
          type="button"
          className="inline-flex min-h-8 items-center justify-center rounded-pill bg-surface-muted px-3 text-xs font-medium text-text-primary"
          onClick={() => removeCartItem({ productId: item.productId })}
        >
          Remove
        </button>
      </div>

      <div className="space-y-2 md:justify-self-end md:text-right">
        <p className="m-0 text-sm font-semibold text-[#374151]">Quantity</p>
        <QuantityStepper productId={item.productId} quantity={item.quantity} />
        <p className="m-0 text-lg font-bold text-text-primary">{formatCurrency(lineTotal)}</p>
      </div>
    </article>
  )
}
