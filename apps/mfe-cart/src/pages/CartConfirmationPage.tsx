import { Link, useParams } from 'react-router-dom'

export default function CartConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>()

  return (
    <section className="cart-confirmation" aria-live="polite">
      <div className="cart-success-icon" aria-hidden="true">
        ✓
      </div>
      <h1>Order placed successfully</h1>
      <p className="order-id-text">Order ID: {orderId ?? 'N/A'}</p>
      <p>We received your order and will process it shortly.</p>

      <div className="confirmation-actions">
        <Link to="/catalog" className="cart-primary-link">
          Continue shopping
        </Link>
      </div>
    </section>
  )
}
