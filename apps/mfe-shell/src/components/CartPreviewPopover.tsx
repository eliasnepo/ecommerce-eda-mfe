import { Link } from 'react-router-dom'
import type { CartItem } from '../cart/cartTypes'

interface CartPreviewPopoverProps {
  isOpen: boolean
  items: CartItem[]
  totalItems: number
  subtotal: number
  onNavigate: () => void
}

const usdCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatCurrency(value: number): string {
  return usdCurrencyFormatter.format(value)
}

export default function CartPreviewPopover({
  isOpen,
  items,
  totalItems,
  subtotal,
  onNavigate,
}: CartPreviewPopoverProps) {
  const latestItems = [...items].slice(-3).reverse()

  return (
    <div
      className={[
        'absolute right-0 top-full z-40 mt-3 w-[min(360px,calc(100vw-1rem))] rounded-popover border border-border bg-surface p-4 shadow-popover',
        isOpen ? 'block' : 'hidden',
      ].join(' ')}
      role="dialog"
      aria-label="Cart preview"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-text-primary">Cart</p>
        <p className="m-0 text-xs text-text-secondary">{totalItems} items</p>
      </div>

      {latestItems.length === 0 ? (
        <p className="m-0 rounded-card bg-surface-muted p-3 text-sm text-text-secondary">
          Your cart is empty.
        </p>
      ) : (
        <ul className="m-0 mb-3 grid list-none gap-2 p-0">
          {latestItems.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between rounded-card bg-surface-muted px-3 py-2"
            >
              <div>
                <p className="m-0 text-sm font-medium text-text-primary">
                  {item.productName}
                </p>
                <p className="m-0 text-xs text-text-secondary">Qty {item.quantity}</p>
              </div>
              <p className="m-0 text-sm font-semibold text-text-primary">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-3 flex items-center justify-between border-t border-border pt-3">
        <p className="m-0 text-sm text-text-secondary">Subtotal</p>
        <p className="m-0 text-base font-semibold text-text-primary">
          {formatCurrency(subtotal)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/cart"
          onClick={onNavigate}
          className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border px-3 text-sm font-semibold text-text-primary no-underline transition hover:bg-surface-muted"
        >
          View Cart
        </Link>
        <Link
          to="/cart"
          onClick={onNavigate}
          className="inline-flex min-h-10 items-center justify-center rounded-pill bg-accent-primary px-3 text-sm font-semibold text-white no-underline transition hover:brightness-95"
        >
          Checkout
        </Link>
      </div>
    </div>
  )
}
