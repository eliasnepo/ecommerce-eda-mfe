import { removeCartItem, updateCartItem } from '../integration/cartChannel'

interface QuantityStepperProps {
  productId: string
  quantity: number
}

export default function QuantityStepper({
  productId,
  quantity,
}: QuantityStepperProps) {
  const onIncrement = () => {
    updateCartItem({ productId, quantity: quantity + 1 })
  }

  const onDecrement = () => {
    if (quantity <= 1) {
      removeCartItem({ productId })
      return
    }

    updateCartItem({ productId, quantity: quantity - 1 })
  }

  return (
    <div
      className="inline-flex items-center rounded-pill border border-border bg-surface-muted px-1.5"
      aria-label="Quantity controls"
    >
      <button
        type="button"
        onClick={onDecrement}
        className="h-8 w-8 rounded-pill text-lg text-text-primary"
        aria-label="Decrease quantity"
      >
        -
      </button>
      <span className="min-w-8 text-center text-sm font-semibold text-text-primary" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className="h-8 w-8 rounded-pill text-lg text-text-primary"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
