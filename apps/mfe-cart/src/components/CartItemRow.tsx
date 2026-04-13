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
    <article className="cart-item-card" aria-label={item.productName}>
      <div className="cart-item-image" aria-hidden="true" />

      <div className="cart-item-main">
        <p className="cart-item-name">{item.productName}</p>
        <p className="cart-item-price">Unit price: {formatCurrency(item.price)}</p>
        <button
          type="button"
          className="cart-item-remove"
          onClick={() => removeCartItem({ productId: item.productId })}
        >
          Remove
        </button>
      </div>

      <div className="cart-item-controls">
        <QuantityStepper productId={item.productId} quantity={item.quantity} />
        <p className="cart-item-total">{formatCurrency(lineTotal)}</p>
      </div>
    </article>
  )
}
