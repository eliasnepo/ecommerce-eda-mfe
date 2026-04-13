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
    <div className="qty-stepper" aria-label="Quantity controls">
      <button
        type="button"
        onClick={onDecrement}
        className="qty-button"
        aria-label="Decrease quantity"
      >
        -
      </button>
      <span className="qty-value" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className="qty-button"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
